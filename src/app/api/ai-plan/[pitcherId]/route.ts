import { NextResponse } from 'next/server';
import { query } from '@/lib/postgres';

interface RouteParams {
    params: Promise<{ pitcherId: string }>;
}

// GET /api/ai-plan/[pitcherId] - Generate AI development plan
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { pitcherId } = await params;
        const id = parseInt(pitcherId);

        // Get pitcher info
        const pitcherResult = await query(
            'SELECT * FROM user_pitchers WHERE id = $1',
            [id]
        );

        if (pitcherResult.rows.length === 0) {
            return NextResponse.json({ error: 'Pitcher not found' }, { status: 404 });
        }
        const pitcher = pitcherResult.rows[0];

        // Get user's pitches
        const pitchesResult = await query(
            'SELECT * FROM user_pitches WHERE pitcher_id = $1',
            [id]
        );
        const pitches = pitchesResult.rows;

        if (pitches.length === 0) {
            return NextResponse.json({ error: 'No pitches found' }, { status: 404 });
        }

        // Calculate stats
        const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        const velos = pitches.filter(p => p.velocity_mph).map(p => parseFloat(p.velocity_mph));
        const spins = pitches.filter(p => p.spin_rate).map(p => parseInt(p.spin_rate));

        const avgVelo = avg(velos);
        const avgSpin = avg(spins);
        const maxVelo = velos.length > 0 ? Math.max(...velos) : 0;
        const pitchTypes = [...new Set(pitches.map(p => p.pitch_type))];

        // Get MLB averages
        const mlbStatsResult = await query(
            `SELECT 
        AVG(release_speed) as avg_velo,
        AVG(release_spin_rate) as avg_spin,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY release_speed) as median_velo,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY release_speed) as p75_velo
       FROM mlb_pitches 
       WHERE release_speed IS NOT NULL`
        );
        const mlbStats = mlbStatsResult.rows[0] || { avg_velo: 93, avg_spin: 2300 };

        // Generate development priorities based on comparisons
        const developmentPriorities = [];

        // Velocity analysis
        const mlbAvgVelo = parseFloat(mlbStats.avg_velo) || 93;
        const veloGap = mlbAvgVelo - avgVelo;
        if (veloGap > 5) {
            developmentPriorities.push({
                area: 'Velocity Development',
                priority: 'High' as const,
                current: `${avgVelo.toFixed(1)} mph`,
                target: `${Math.min(avgVelo + 3, mlbAvgVelo - 2).toFixed(1)} mph`,
                actionItems: [
                    'Long toss program (5-6 days/week)',
                    'Weighted ball training with proper form',
                    'Lower half strength training (squats, deadlifts)',
                    'Hip-to-shoulder separation drills',
                ],
                timeline: '6-12 months',
            });
        } else if (veloGap > 2) {
            developmentPriorities.push({
                area: 'Velocity Refinement',
                priority: 'Medium' as const,
                current: `${avgVelo.toFixed(1)} mph`,
                target: `${(avgVelo + 2).toFixed(1)} mph`,
                actionItems: [
                    'Maintain arm care routine',
                    'Focus on efficient mechanics',
                    'Targeted weighted ball work',
                ],
                timeline: '3-6 months',
            });
        }

        // Spin rate analysis
        const mlbAvgSpin = parseFloat(mlbStats.avg_spin) || 2300;
        const spinGap = mlbAvgSpin - avgSpin;
        if (spinGap > 300 && avgSpin > 0) {
            developmentPriorities.push({
                area: 'Spin Rate Improvement',
                priority: 'Medium' as const,
                current: `${Math.round(avgSpin)} rpm`,
                target: `${Math.round(avgSpin + 200)} rpm`,
                actionItems: [
                    'Refine grip and finger pressure',
                    'Work on wrist alignment at release',
                    'Experiment with seam orientation',
                ],
                timeline: '2-4 months',
            });
        }

        // Arsenal building
        if (pitchTypes.length < 3) {
            developmentPriorities.push({
                area: 'Arsenal Expansion',
                priority: 'Medium' as const,
                current: `${pitchTypes.length} pitch types`,
                target: '3+ quality pitches',
                actionItems: [
                    'Add complementary off-speed pitch',
                    'Develop feel for secondary pitches in bullpens',
                    'Work on pitch tunneling',
                ],
                timeline: '3-6 months',
            });
        }

        // Determine strengths
        const strengths: string[] = [];
        if (avgVelo >= mlbAvgVelo - 3) {
            strengths.push(`Above-average velocity (${avgVelo.toFixed(1)} mph)`);
        }
        if (avgSpin >= mlbAvgSpin) {
            strengths.push(`Good spin rate (${Math.round(avgSpin)} rpm)`);
        }
        if (pitchTypes.length >= 3) {
            strengths.push(`Diverse arsenal (${pitchTypes.length} pitch types)`);
        }
        if (maxVelo >= 95) {
            strengths.push(`Plus velocity ceiling (${maxVelo.toFixed(1)} mph max)`);
        }
        if (strengths.length === 0) {
            strengths.push('Solid foundation to build upon');
            strengths.push('Consistent pitch data tracking');
        }

        // Generate realistic path
        let realisticPath = '';
        const level = pitcher.level || 'Amateur';
        if (avgVelo >= 90 && level === 'High School') {
            realisticPath = 'Strong college prospect with continued development. Focus on consistency and adding velocity for D1 programs.';
        } else if (avgVelo >= 88) {
            realisticPath = 'Good foundation for competitive baseball. With focused training, college baseball is achievable.';
        } else {
            realisticPath = 'Building phase - focus on mechanics and gradual velocity gains. Consider working with a pitching coach.';
        }

        // Next steps
        const nextSteps = [
            'Continue tracking all pitches to monitor progress',
            'Work with a trained pitching coach on mechanics',
            'Follow a structured arm care and strength program',
        ];

        if (developmentPriorities.length > 0) {
            nextSteps.push(`Prioritize ${developmentPriorities[0].area.toLowerCase()}`);
        }

        return NextResponse.json({
            playerName: pitcher.name,
            level: pitcher.level || 'Not specified',
            strengths,
            developmentPriorities,
            realisticPath,
            nextSteps,
            similarPitchers: [],
        });
    } catch (error) {
        console.error('Error generating AI plan:', error);
        return NextResponse.json({ error: 'Failed to generate development plan' }, { status: 500 });
    }
}
