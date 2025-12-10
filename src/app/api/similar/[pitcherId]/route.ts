import { NextResponse } from 'next/server';
import { query } from '@/lib/postgres';
import { requireUserAuth } from '@/lib/auth-middleware';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { parseIdParam } from '@/lib/validation';

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
        const userPitchesResult = await query(
            'SELECT * FROM user_pitches WHERE pitcher_id = $1',
            [id]
        );
        const userPitches = userPitchesResult.rows;

        if (userPitches.length === 0) {
            return NextResponse.json({ error: 'No pitches found for this pitcher' }, { status: 404 });
        }

        // Calculate user's average stats
        const userVelos = userPitches.filter(p => p.velocity_mph).map(p => parseFloat(p.velocity_mph));
        const userSpins = userPitches.filter(p => p.spin_rate).map(p => parseInt(p.spin_rate));

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
        const similarResult = await query(
            `SELECT 
                pitcher_name as name,
                avg_velo,
                avg_spin,
                pitch_count,
                -- Euclidean distance calculation (normalized)
                SQRT(
                    POWER((avg_velo - $1) / 10.0, 2) + 
                    POWER((avg_spin - $2) / 500.0, 2)
                ) as distance
            FROM mv_pitcher_stats
            ORDER BY distance ASC
            LIMIT 5`,
            [userAvgVelo || 90, userAvgSpin || 2200]
        );

        // Convert distance to similarity percentage
        const similarPitchers = similarResult.rows.map(row => ({
            name: row.name,
            avgVelo: parseFloat(row.avg_velo),
            avgSpin: Math.round(parseFloat(row.avg_spin)),
            pitchCount: parseInt(row.pitch_count),
            // Convert distance to similarity (inverse relationship)
            similarity: Math.max(0, Math.round(100 - (parseFloat(row.distance) * 20))),
        }));

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
