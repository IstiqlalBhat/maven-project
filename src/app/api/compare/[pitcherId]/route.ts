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
            const type = pitch.pitch_type as string;
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
            const userVelos = pitches.filter(p => p.velocity_mph).map(p => parseFloat(p.velocity_mph as string));
            const userSpins = pitches.filter(p => p.spin_rate).map(p => parseInt(p.spin_rate as string));
            const userHBreaks = pitches.filter(p => p.horizontal_break != null).map(p => Math.abs(parseFloat(p.horizontal_break as string)));
            const userVBreaks = pitches.filter(p => p.vertical_break != null).map(p => parseFloat(p.vertical_break as string));

            const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

            const userStats = {
                avgVelo: Math.round(avg(userVelos) * 10) / 10,
                avgSpin: Math.round(avg(userSpins)),
                avgHBreak: Math.round(avg(userHBreaks) * 10) / 10,
                avgVBreak: Math.round(avg(userVBreaks) * 10) / 10,
                pitchCount: pitches.length,
            };

            // Parse MLB stats
            const mlbAvgVelo = parseFloat(mlbStats.avg_velo as string) || 93;
            const mlbMaxVelo = parseFloat(mlbStats.max_velo as string) || 102;
            const mlbMinVelo = parseFloat(mlbStats.min_velo as string) || 85;
            const mlbAvgSpin = parseFloat(mlbStats.avg_spin as string) || 2300;
            const mlbMaxSpin = parseFloat(mlbStats.max_spin as string) || 2800;
            const mlbMinSpin = parseFloat(mlbStats.min_spin as string) || 1800;
            const mlbAvgHBreak = parseFloat(mlbStats.avg_h_break as string) || 8;
            const mlbAvgVBreak = parseFloat(mlbStats.avg_v_break as string) || 14;
            const stddevVelo = parseFloat(mlbStats.stddev_velo as string) || 3;
            const stddevSpin = parseFloat(mlbStats.stddev_spin as string) || 200;

            // Convert z-score to percentile using standard normal CDF approximation
            // Uses the Abramowitz and Stegun approximation for the error function
            const zScoreToPercentile = (z: number): number => {
                // Clamp extreme z-scores to avoid overflow
                const clampedZ = Math.max(-4, Math.min(4, z));

                // Approximation of the standard normal CDF using error function
                // CDF(z) = 0.5 * (1 + erf(z / sqrt(2)))
                const a1 = 0.254829592;
                const a2 = -0.284496736;
                const a3 = 1.421413741;
                const a4 = -1.453152027;
                const a5 = 1.061405429;
                const p = 0.3275911;

                const sign = clampedZ < 0 ? -1 : 1;
                const absZ = Math.abs(clampedZ) / Math.SQRT2;

                const t = 1 / (1 + p * absZ);
                const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ);

                const cdf = 0.5 * (1 + sign * erf);
                return Math.min(99, Math.max(1, Math.round(cdf * 100)));
            };

            // For velocity: higher is better
            const veloZScore = stddevVelo > 0 ? (userStats.avgVelo - mlbAvgVelo) / stddevVelo : 0;
            const veloPercentile = zScoreToPercentile(veloZScore);

            // For spin rate: higher is typically better for fastballs
            const spinZScore = stddevSpin > 0 ? (userStats.avgSpin - mlbAvgSpin) / stddevSpin : 0;
            const spinPercentile = zScoreToPercentile(spinZScore);

            // For movement: calculate z-scores using stddev estimation from range
            // Estimate stddev as ~(max - min) / 4 for normal distribution (covers ~95%)
            const hBreakStddev = mlbAvgHBreak > 0 ? mlbAvgHBreak * 0.4 : 3; // ~40% of mean as stddev estimate
            const vBreakStddev = mlbAvgVBreak > 0 ? mlbAvgVBreak * 0.4 : 5;

            const hBreakZScore = hBreakStddev > 0 ? (userStats.avgHBreak - mlbAvgHBreak) / hBreakStddev : 0;
            const vBreakZScore = vBreakStddev > 0 ? (userStats.avgVBreak - mlbAvgVBreak) / vBreakStddev : 0;

            const hBreakPercentile = zScoreToPercentile(hBreakZScore);
            const vBreakPercentile = zScoreToPercentile(vBreakZScore);

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
                    sampleSize: parseInt(mlbStats.sample_size as string) || 0,
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
