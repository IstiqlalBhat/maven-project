import { NextResponse } from 'next/server';
import { query } from '@/lib/postgres';
import { PITCH_TYPES } from '@/lib/fetch-mlb-data';
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

// GET /api/compare/[pitcherId] - Compare user pitches to MLB data
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

        // Group user pitches by type
        const userPitchByType: Record<string, typeof userPitches> = {};
        for (const pitch of userPitches) {
            const type = pitch.pitch_type;
            if (!userPitchByType[type]) {
                userPitchByType[type] = [];
            }
            userPitchByType[type].push(pitch);
        }

        // Map user pitch types to MLB codes
        const pitchTypeMap: Record<string, string> = {
            'Fastball': 'FF',
            '4-Seam Fastball': 'FF',
            'Sinker': 'SI',
            'Slider': 'SL',
            'Curveball': 'CU',
            'Changeup': 'CH',
            'Cutter': 'FC',
            'Splitter': 'FS',
        };

        const comparisons = [];

        for (const [pitchType, pitches] of Object.entries(userPitchByType)) {
            const mlbCode = pitchTypeMap[pitchType] || 'FF';

            // Get MLB stats for this pitch type including percentile distributions
            const mlbStatsResult = await query(
                `SELECT 
                    AVG(release_speed) as avg_velo,
                    MAX(release_speed) as max_velo,
                    MIN(release_speed) as min_velo,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY release_speed) as median_velo,
                    AVG(release_spin_rate) as avg_spin,
                    MAX(release_spin_rate) as max_spin,
                    MIN(release_spin_rate) as min_spin,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY release_spin_rate) as median_spin,
                    AVG(ABS(pfx_x) * 12) as avg_h_break,
                    AVG(pfx_z * 12) as avg_v_break,
                    STDDEV(release_speed) as stddev_velo,
                    STDDEV(release_spin_rate) as stddev_spin,
                    COUNT(*) as sample_size
                 FROM mlb_pitches 
                 WHERE pitch_type = $1 AND release_speed IS NOT NULL`,
                [mlbCode]
            );
            const mlbStats = mlbStatsResult.rows[0];

            // Calculate user averages
            const userVelos = pitches.filter(p => p.velocity_mph).map(p => parseFloat(p.velocity_mph));
            const userSpins = pitches.filter(p => p.spin_rate).map(p => parseInt(p.spin_rate));
            const userHBreaks = pitches.filter(p => p.horizontal_break != null).map(p => Math.abs(parseFloat(p.horizontal_break)));
            const userVBreaks = pitches.filter(p => p.vertical_break != null).map(p => parseFloat(p.vertical_break));

            const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

            const userStats = {
                avgVelo: Math.round(avg(userVelos) * 10) / 10,
                avgSpin: Math.round(avg(userSpins)),
                avgHBreak: Math.round(avg(userHBreaks) * 10) / 10,
                avgVBreak: Math.round(avg(userVBreaks) * 10) / 10,
                pitchCount: pitches.length,
            };

            // Parse MLB stats
            const mlbAvgVelo = parseFloat(mlbStats.avg_velo) || 93;
            const mlbMaxVelo = parseFloat(mlbStats.max_velo) || 102;
            const mlbMinVelo = parseFloat(mlbStats.min_velo) || 85;
            const mlbAvgSpin = parseFloat(mlbStats.avg_spin) || 2300;
            const mlbMaxSpin = parseFloat(mlbStats.max_spin) || 2800;
            const mlbMinSpin = parseFloat(mlbStats.min_spin) || 1800;
            const mlbAvgHBreak = parseFloat(mlbStats.avg_h_break) || 8;
            const mlbAvgVBreak = parseFloat(mlbStats.avg_v_break) || 14;
            const stddevVelo = parseFloat(mlbStats.stddev_velo) || 3;
            const stddevSpin = parseFloat(mlbStats.stddev_spin) || 200;

            // Calculate percentiles using z-score approximation
            // For velocity: higher is better
            const veloZScore = (userStats.avgVelo - mlbAvgVelo) / stddevVelo;
            const veloPercentile = Math.min(99, Math.max(1, Math.round(50 + veloZScore * 15)));

            // For spin rate: higher is typically better for fastballs
            const spinZScore = (userStats.avgSpin - mlbAvgSpin) / stddevSpin;
            const spinPercentile = Math.min(99, Math.max(1, Math.round(50 + spinZScore * 15)));

            // For movement: use simple scaling based on MLB range
            const hBreakPercentile = mlbAvgHBreak > 0
                ? Math.min(99, Math.max(1, Math.round((userStats.avgHBreak / mlbAvgHBreak) * 50)))
                : 50;
            const vBreakPercentile = mlbAvgVBreak > 0
                ? Math.min(99, Math.max(1, Math.round((userStats.avgVBreak / mlbAvgVBreak) * 50)))
                : 50;

            comparisons.push({
                pitchType,
                pitchTypeName: PITCH_TYPES[mlbCode] || pitchType,
                userStats,
                mlbStats: {
                    avgVelo: Math.round(mlbAvgVelo * 10) / 10,
                    maxVelo: Math.round(mlbMaxVelo * 10) / 10,
                    minVelo: Math.round(mlbMinVelo * 10) / 10,
                    avgSpin: Math.round(mlbAvgSpin),
                    maxSpin: Math.round(mlbMaxSpin),
                    avgHBreak: Math.round(mlbAvgHBreak * 10) / 10,
                    avgVBreak: Math.round(mlbAvgVBreak * 10) / 10,
                    sampleSize: parseInt(mlbStats.sample_size) || 0,
                },
                percentiles: {
                    velocity: veloPercentile,
                    spinRate: spinPercentile,
                    horizontalBreak: hBreakPercentile,
                    verticalBreak: vBreakPercentile,
                },
            });
        }

        return NextResponse.json({
            pitcherId: id,
            comparisons,
        });
    } catch (error) {
        console.error('Error comparing pitches:', error);
        return NextResponse.json({ error: 'Failed to compare pitches' }, { status: 500 });
    }
}
