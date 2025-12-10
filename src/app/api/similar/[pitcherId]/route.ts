import { NextResponse } from 'next/server';
import { query } from '@/lib/postgres';
import { PITCH_TYPES } from '@/lib/fetch-mlb-data';

interface RouteParams {
    params: Promise<{ pitcherId: string }>;
}

// GET /api/similar/[pitcherId] - Find MLB pitchers with similar arsenal
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { pitcherId } = await params;
        const id = parseInt(pitcherId);

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

        // Find similar MLB pitchers using aggregate stats
        const similarResult = await query(
            `WITH pitcher_stats AS (
        SELECT 
          pitcher_name,
          AVG(release_speed) as avg_velo,
          AVG(release_spin_rate) as avg_spin,
          COUNT(*) as pitch_count
        FROM mlb_pitches
        WHERE release_speed IS NOT NULL AND release_spin_rate IS NOT NULL
        GROUP BY pitcher_name
        HAVING COUNT(*) >= 10
      )
      SELECT 
        pitcher_name as name,
        avg_velo,
        avg_spin,
        pitch_count,
        -- Euclidean distance calculation (normalized)
        SQRT(
          POWER((avg_velo - $1) / 10.0, 2) + 
          POWER((avg_spin - $2) / 500.0, 2)
        ) as distance
      FROM pitcher_stats
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
