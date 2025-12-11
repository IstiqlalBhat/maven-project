import { NextResponse } from 'next/server';
import { query, getClient } from '@/lib/postgres';
import { requireUserAuth } from '@/lib/auth-middleware';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { parseIdParam } from '@/lib/validation';
import { UserPitch } from '@/shared/types';

interface RouteParams {
    params: Promise<{ pitcherId: string }>;
}

/**
 * Verify that the authenticated user owns the specified pitcher
 */
async function verifyPitcherOwnership(pitcherId: number, uid: string): Promise<boolean> {
    const result = await query(
        'SELECT id FROM user_pitchers WHERE id = $1 AND (firebase_uid = $2 OR firebase_uid IS NULL)',
        [pitcherId, uid]
    );
    return result.rows.length > 0;
}

// GET /api/similar/[pitcherId] - Find MLB pitchers with similar arsenal
export async function GET(request: Request, { params }: RouteParams) {
    // Rate limiting
    const rateLimitResponse = apiRateLimiter(request);
    if (rateLimitResponse) {
        return rateLimitResponse;
    }

    // Require user authentication
    const authResult = await requireUserAuth();
    if (authResult instanceof NextResponse) {
        return authResult;
    }
    const { uid } = authResult;

    try {
        const { pitcherId } = await params;

        // Validate ID
        const id = parseIdParam(pitcherId);
        if (id instanceof NextResponse) {
            return id;
        }

        // Verify ownership
        const isOwner = await verifyPitcherOwnership(id, uid);
        if (!isOwner) {
            return NextResponse.json({ error: 'Pitcher not found' }, { status: 404 });
        }

        // Get user's pitches
        const userPitchesResult = await query<UserPitch>(
            'SELECT * FROM user_pitches WHERE pitcher_id = $1',
            [id]
        );
        const userPitches = userPitchesResult.rows;

        if (userPitches.length === 0) {
            return NextResponse.json({ error: 'No pitches found for this pitcher' }, { status: 404 });
        }

        // Calculate user's average stats
        const userVelos = userPitches
            .filter(p => p.velocity_mph)
            .map(p => parseFloat(String(p.velocity_mph)));

        const userSpins = userPitches
            .filter(p => p.spin_rate)
            .map(p => parseInt(String(p.spin_rate)));

        const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        const userAvgVelo = avg(userVelos);
        const userAvgSpin = avg(userSpins);

        if (!userAvgVelo && !userAvgSpin) {
            return NextResponse.json({
                error: 'Need velocity or spin rate data to find similar pitchers'
            }, { status: 400 });
        }

        // Find similar MLB pitchers using pre-calculated stats from materialized view
        // This is much faster than aggregating 100k+ rows on every request
        // We'll fetch all pitcher stats (small dataset ~2000 rows) and sort in memory
        // to avoid complex SQL parsing issues with Supabase JS client
        let similarRows: any[] = [];
        const client = await getClient();

        try {
            const { data: rows, error: selectError } = await client
                .from('mv_pitcher_stats')
                .select('pitcher_name, avg_velo, avg_spin, pitch_count')
                .limit(5000); // Fetch all pitchers

            if (selectError) throw selectError;
            similarRows = rows || [];

        } catch (error: any) {
            // Gracefully handle missing materialized view
            if (error.message && error.message.includes('does not exist')) {
                console.warn('Materialized view mv_pitcher_stats missing.');
                return NextResponse.json({
                    pitcherId: id,
                    userStats: { avgVelo: userAvgVelo, avgSpin: Math.round(userAvgSpin) },
                    overall: [],
                    warning: 'Comparison data not available yet.'
                });
            }
            throw error;
        }

        // Calculate distance and sort in JS
        // Euclidean distance normalization factors
        const v = userAvgVelo || 90;
        const s = userAvgSpin || 2200;
        const VELO_Norm = 10.0;
        const SPIN_Norm = 500.0;

        const processed = similarRows.map(row => {
            const rowVelo = parseFloat(row.avg_velo);
            const rowSpin = parseFloat(row.avg_spin);

            const dist = Math.sqrt(
                Math.pow((rowVelo - v) / VELO_Norm, 2) +
                Math.pow((rowSpin - s) / SPIN_Norm, 2)
            );

            return {
                name: row.pitcher_name,
                avgVelo: rowVelo,
                avgSpin: Math.round(rowSpin),
                pitchCount: parseInt(row.pitch_count),
                similarity: Math.max(0, Math.round(100 - (dist * 20))),
                distance: dist
            };
        });

        // Sort by distance (ASC) and take top 5
        const similarPitchers = processed
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 5)
            .map(({ distance, ...rest }) => rest);

        return NextResponse.json({
            pitcherId: id,
            userStats: {
                avgVelo: userAvgVelo,
                avgSpin: Math.round(userAvgSpin),
            },
            overall: similarPitchers,
        });

    } catch (error) {
        console.error('Error finding similar pitchers:', error);
        return NextResponse.json({ error: 'Failed to find similar pitchers' }, { status: 500 });
    }
}
