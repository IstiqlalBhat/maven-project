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

        // Get user's pitches (optimized query)
        const userPitchesResult = await query<UserPitch>(
            'SELECT velocity_mph, spin_rate FROM user_pitches WHERE pitcher_id = $1',
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

        // Find similar MLB pitchers using server-side RPC function
        // This avoids fetching 5000+ rows to the client
        const client = await getClient();
        let similarPitchers: any[] = [];
        let warning: string | undefined;

        try {
            // Use the efficient RPC function
            const { data, error } = await client.rpc('get_similar_mlb_pitchers', {
                p_avg_velo: userAvgVelo || 90, // Default if null
                p_avg_spin: userAvgSpin || 2200,
                p_limit: 5
            });

            if (error) {
                // If RPC fails (e.g. not found), fallback or log
                console.warn('RPC get_similar_mlb_pitchers failed:', error.message);

                // Detailed error for debugging deployment issues
                if (error.message.includes('function') && error.message.includes('does not exist')) {
                    warning = 'Similarity search optimized function is missing. Please run database migrations.';
                } else {
                    throw error;
                }
            } else {
                similarPitchers = data || [];
            }

        } catch (error) {
            console.error('Error in similarity search:', error);
            // Return empty list rather than 500 to keep UI working
            similarPitchers = [];
            warning = 'Unable to calculate similarity at this time.';
        }

        // Map RPC result to expected format if needed
        // (The RPC returns columns that match our needs: pitcher_name, avg_velo, avg_spin, similarity_pct)
        const formattedSimilar = similarPitchers.map(p => ({
            name: p.pitcher_name,
            avgVelo: p.avg_velo,
            avgSpin: p.avg_spin,
            pitchCount: p.pitch_count,
            similarity: p.similarity_pct || p.similarity, // Handle both naming conventions if they differ
            // distance: not returned by RPC, but not strictly needed for UI usually
        }));

        return NextResponse.json({
            pitcherId: id,
            userStats: {
                avgVelo: userAvgVelo,
                avgSpin: Math.round(userAvgSpin),
            },
            overall: formattedSimilar,
        });

    } catch (error) {
        console.error('Error finding similar pitchers:', error);
        return NextResponse.json({ error: 'Failed to find similar pitchers' }, { status: 500 });
    }
}
