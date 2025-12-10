import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { query } from '@/lib/postgres';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { sanitizePromptInput } from '@/lib/validation';

// Initialize with explicit API key from environment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

interface ChatRequest {
    messages: ChatMessage[];
    pitcherId?: number;
}

// Maximum number of messages to include in context
const MAX_MESSAGES = 20;
// Maximum length of each message
const MAX_MESSAGE_LENGTH = 2000;

// Enhanced system prompt for baseball coaching with advanced analytics
const SYSTEM_PROMPT = `You are Maven AI, an elite-level baseball pitching coach and biomechanics analyst. You combine old-school baseball wisdom with cutting-edge Sabermetrics and data analytics to provide actionable, personalized development plans.

YOUR PERSONA:
- Authoritative yet encouraging, like a seasoned MLB pitching coach
- Obsessed with specific metrics: Velocity, Spin Rate, Spin Efficiency, H-Break, V-Break, Release Point, Extension
- Explain complex biomechanical concepts in simple, understandable terms

YOUR CAPABILITIES:
1. **Arsenal Analysis**: Compare metrics across all pitch types with usage percentages
2. **Velocity Separation**: Analyze speed differentials for deception and tunneling
3. **Consistency Metrics**: Evaluate standard deviation in velocity/spin (Elite < 1.0 mph, Good < 1.5 mph)
4. **MLB Benchmarking**: Use percentile rankings to contextualize performance (50th = MLB average)
5. **Trend Analysis**: Track improvement or regression over recent pitches
6. **Pitch Design**: Suggest grip adjustments or axis changes to improve movement profiles
7. **Sequencing Strategy**: Advise on pitch sequencing based on velocity differentials

RESPONSE GUIDELINES:
- ALWAYS reference specific numbers from the PITCHER DATA provided below
- Cite MLB percentile rankings when comparing to professional standards
- For velocity questions: mention avg, max, AND percentile ranking
- For development: reference similar MLB pitchers as role models
- For sequencing: use velocity differentials and tunneling concepts
- End coaching responses with 2-3 actionable "Next Steps"
- If data is sparse, ask the user to log more pitches of the needed type

LEVEL-SPECIFIC COACHING:
- High School: Focus on fundamentals, arm care, and velocity development
- College: Focus on pitch refinement, consistency, and competitive edge
- Pro/Indie: Focus on optimization, advanced analytics, and marginal gains

KEY METRICS TO REFERENCE (when data permits):
- Fastballs: Velocity, IVB (Ride), Extension, Consistency (stddev)
- Breaking Balls: Spin Rate, Sweep/Depth, Sharpness (late movement)
- Off-speed: Velocity differential from FB (target 8+ mph), Fade/Run

If you lack specific data for a query, gently ask the user to provide it or give general advice based on best practices.`;

// Pitch type mapping from user-friendly names to MLB codes
const PITCH_TYPE_MAP: Record<string, string> = {
    'Fastball': 'FF',
    '4-Seam Fastball': 'FF',
    'Four-Seam': 'FF',
    'Sinker': 'SI',
    '2-Seam Fastball': 'SI',
    'Slider': 'SL',
    'Curveball': 'CU',
    'Curve': 'CU',
    'Changeup': 'CH',
    'Change': 'CH',
    'Cutter': 'FC',
    'Splitter': 'FS',
    'Split-Finger': 'FS',
    'Sweeper': 'ST',
    'Slurve': 'SV',
};

export async function POST(request: NextRequest) {
    // Rate limiting
    const rateLimitResponse = apiRateLimiter(request);
    if (rateLimitResponse) {
        return rateLimitResponse;
    }

    try {
        const { messages, pitcherId }: ChatRequest = await request.json();

        if (!messages || messages.length === 0) {
            return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
        }

        // Limit number of messages to prevent context abuse
        const limitedMessages = messages.slice(-MAX_MESSAGES);

        // Sanitize all user messages to prevent prompt injection
        const sanitizedMessages = limitedMessages.map(m => ({
            ...m,
            parts: m.parts.map(p => ({
                text: m.role === 'user'
                    ? sanitizePromptInput(p.text).substring(0, MAX_MESSAGE_LENGTH)
                    : p.text.substring(0, MAX_MESSAGE_LENGTH * 2) // Allow longer AI responses in context
            }))
        }));

        // Get comprehensive pitcher context if provided
        let pitcherContext = '';
        if (pitcherId) {
            pitcherContext = await buildPitcherContext(pitcherId);
        }

        // Build the full prompt with conversation history (using sanitized messages)
        const conversationHistory = sanitizedMessages.map(m =>
            `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.parts[0].text}`
        ).join('\n\n');

        const fullPrompt = `${SYSTEM_PROMPT}${pitcherContext}

Conversation:
${conversationHistory}

Please respond to the user's latest message.`;

        // Use the exact pattern from Google's documentation
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: fullPrompt,
        });

        const text = response.text || 'I apologize, but I was unable to generate a response.';

        return NextResponse.json({
            message: {
                role: 'model',
                parts: [{ text }]
            }
        });

    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json(
            { error: 'Failed to generate response. Please check your API key.' },
            { status: 500 }
        );
    }
}

/**
 * Build comprehensive pitcher context from database with advanced analytics
 */
async function buildPitcherContext(pitcherId: number): Promise<string> {
    try {
        // 1. Get pitcher profile
        const pitcherResult = await query(
            'SELECT * FROM user_pitchers WHERE id = $1',
            [pitcherId]
        );

        if (pitcherResult.rows.length === 0) {
            return '';
        }

        const pitcher = pitcherResult.rows[0];

        // 2. Get per-pitch-type breakdown with advanced stats
        const arsenalResult = await query(`
            SELECT 
                pitch_type,
                COUNT(*) as pitch_count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as usage_pct,
                ROUND(AVG(velocity_mph)::numeric, 1) as avg_velo,
                ROUND(MAX(velocity_mph)::numeric, 1) as max_velo,
                ROUND(MIN(velocity_mph)::numeric, 1) as min_velo,
                ROUND(COALESCE(STDDEV(velocity_mph), 0)::numeric, 2) as velo_stddev,
                ROUND(AVG(spin_rate)::numeric, 0) as avg_spin,
                ROUND(MAX(spin_rate)::numeric, 0) as max_spin,
                ROUND(COALESCE(STDDEV(spin_rate), 0)::numeric, 0) as spin_stddev,
                ROUND(AVG(ABS(horizontal_break))::numeric, 1) as avg_h_break,
                ROUND(AVG(vertical_break)::numeric, 1) as avg_v_break,
                MIN(date) as first_date,
                MAX(date) as last_date
            FROM user_pitches
            WHERE pitcher_id = $1
            GROUP BY pitch_type
            ORDER BY pitch_count DESC
        `, [pitcherId]);

        const arsenal = arsenalResult.rows;

        if (arsenal.length === 0) {
            return `

PITCHER DATA FOR: ${pitcher.name}
=====================================
Profile: ${pitcher.age || 'Unknown'} years old | ${pitcher.throws === 'R' ? 'Right-handed' : pitcher.throws === 'L' ? 'Left-handed' : 'Unknown handedness'} | ${pitcher.level || 'Level not specified'}
Data: No pitches logged yet. Ask the user to add some pitches to get personalized coaching.`;
        }

        // 3. Calculate velocity differentials from primary fastball
        const primaryFB = arsenal.find(p =>
            ['Fastball', '4-Seam Fastball', 'Four-Seam', 'Sinker', '2-Seam Fastball'].includes(p.pitch_type)
        );
        const primaryVelo = primaryFB ? parseFloat(primaryFB.avg_velo) : 0;

        // 4. Get MLB percentiles for each pitch type
        const percentiles: Record<string, { velo: number; spin: number }> = {};
        for (const pitch of arsenal) {
            const mlbCode = PITCH_TYPE_MAP[pitch.pitch_type] || 'FF';
            const mlbStats = await query(`
                SELECT 
                    AVG(release_speed) as mlb_avg_velo,
                    STDDEV(release_speed) as mlb_stddev_velo,
                    AVG(release_spin_rate) as mlb_avg_spin,
                    STDDEV(release_spin_rate) as mlb_stddev_spin
                FROM mlb_pitches
                WHERE pitch_type = $1 AND release_speed IS NOT NULL
            `, [mlbCode]);

            const stats = mlbStats.rows[0];
            if (stats && stats.mlb_avg_velo) {
                const veloZ = (parseFloat(pitch.avg_velo) - parseFloat(stats.mlb_avg_velo)) / (parseFloat(stats.mlb_stddev_velo) || 3);
                const spinZ = (parseFloat(pitch.avg_spin) - parseFloat(stats.mlb_avg_spin)) / (parseFloat(stats.mlb_stddev_spin) || 200);
                percentiles[pitch.pitch_type] = {
                    velo: Math.min(99, Math.max(1, Math.round(50 + veloZ * 15))),
                    spin: Math.min(99, Math.max(1, Math.round(50 + spinZ * 15)))
                };
            }
        }

        // 5. Get similar MLB pitchers
        const overallVelo = arsenal.reduce((sum, p) => sum + parseFloat(p.avg_velo || 0) * parseInt(p.pitch_count), 0) /
            arsenal.reduce((sum, p) => sum + parseInt(p.pitch_count), 0);
        const overallSpin = arsenal.reduce((sum, p) => sum + parseFloat(p.avg_spin || 0) * parseInt(p.pitch_count), 0) /
            arsenal.reduce((sum, p) => sum + parseInt(p.pitch_count), 0);

        const similarResult = await query(`
            SELECT 
                pitcher_name,
                ROUND(avg_velo::numeric, 1) as avg_velo,
                ROUND(avg_spin::numeric, 0) as avg_spin,
                ROUND((100 - SQRT(POWER((avg_velo - $1)/10, 2) + POWER((avg_spin - $2)/500, 2)) * 20)::numeric, 0) as similarity_pct
            FROM mv_pitcher_stats
            ORDER BY similarity_pct DESC
            LIMIT 3
        `, [overallVelo || 90, overallSpin || 2200]);

        const similarPitchers = similarResult.rows;

        // 6. Get recent trend (last 10 vs overall)
        const trendResult = await query(`
            WITH recent AS (
                SELECT pitch_type, AVG(velocity_mph) as recent_velo
                FROM (
                    SELECT * FROM user_pitches 
                    WHERE pitcher_id = $1 
                    ORDER BY date DESC NULLS LAST, id DESC 
                    LIMIT 10
                ) r
                GROUP BY pitch_type
            ),
            overall AS (
                SELECT pitch_type, AVG(velocity_mph) as overall_velo
                FROM user_pitches WHERE pitcher_id = $1
                GROUP BY pitch_type
            )
            SELECT 
                o.pitch_type,
                ROUND((COALESCE(r.recent_velo, o.overall_velo) - o.overall_velo)::numeric, 1) as velo_trend
            FROM overall o
            LEFT JOIN recent r ON o.pitch_type = r.pitch_type
        `, [pitcherId]);

        const trends: Record<string, number> = {};
        trendResult.rows.forEach(r => {
            trends[r.pitch_type] = parseFloat(r.velo_trend) || 0;
        });

        // 7. Build the structured context
        const totalPitches = arsenal.reduce((sum, p) => sum + parseInt(p.pitch_count), 0);
        const dateRange = arsenal[0]?.first_date && arsenal[0]?.last_date
            ? `${new Date(arsenal[0].first_date).toLocaleDateString()} to ${new Date(arsenal[0].last_date).toLocaleDateString()}`
            : 'Unknown';

        let context = `

PITCHER DATA FOR: ${pitcher.name}
=====================================
Profile: ${pitcher.age || 'Unknown'} years old | ${pitcher.throws === 'R' ? 'Right-handed' : pitcher.throws === 'L' ? 'Left-handed' : 'Unknown'} | ${pitcher.level || 'Not specified'}
Data: ${totalPitches} pitches logged (${dateRange})

ARSENAL BREAKDOWN:`;

        for (const pitch of arsenal) {
            const veloDiff = primaryVelo ? (primaryVelo - parseFloat(pitch.avg_velo)).toFixed(1) : 'N/A';
            const pct = percentiles[pitch.pitch_type];
            const trend = trends[pitch.pitch_type] || 0;
            const trendIcon = trend > 0.5 ? '📈' : trend < -0.5 ? '📉' : '➡️';
            const consistencyGrade = parseFloat(pitch.velo_stddev) < 1.0 ? 'Elite' :
                parseFloat(pitch.velo_stddev) < 1.5 ? 'Good' :
                    parseFloat(pitch.velo_stddev) < 2.0 ? 'Average' : 'Needs work';

            context += `
• ${pitch.pitch_type} (${pitch.usage_pct}% usage, ${pitch.pitch_count} pitches):
  - Velocity: ${pitch.avg_velo} mph avg | ${pitch.max_velo} mph max | ±${pitch.velo_stddev} stddev (${consistencyGrade})
  - Spin: ${pitch.avg_spin} rpm avg | ${pitch.max_spin} max
  - Movement: ${pitch.avg_h_break || 0}" horizontal | ${pitch.avg_v_break || 0}" vertical
  - MLB Percentiles: Velo ${pct?.velo || 'N/A'}th | Spin ${pct?.spin || 'N/A'}th
  - Separation from FB: ${veloDiff !== 'N/A' && veloDiff !== '0.0' ? veloDiff + ' mph' : 'Primary pitch'}
  - Recent trend: ${trendIcon} ${trend >= 0 ? '+' : ''}${trend} mph vs overall`;
        }

        // Add velocity separation analysis
        if (primaryVelo && arsenal.length > 1) {
            context += `

VELOCITY SEPARATION ANALYSIS (from ${primaryFB.pitch_type} @ ${primaryVelo} mph):`;
            for (const pitch of arsenal) {
                if (pitch.pitch_type !== primaryFB.pitch_type) {
                    const diff = primaryVelo - parseFloat(pitch.avg_velo);
                    const quality = diff >= 8 ? '✓ Good separation' :
                        diff >= 5 ? '⚠ Moderate separation' : '❌ Needs more separation';
                    context += `
• ${pitch.pitch_type}: -${diff.toFixed(1)} mph ${quality}`;
                }
            }
        }

        // Add similar pitchers
        if (similarPitchers.length > 0) {
            context += `

SIMILAR MLB PITCHERS (for reference/development):`;
            similarPitchers.forEach((p, i) => {
                context += `
${i + 1}. ${p.pitcher_name} (${p.similarity_pct}% match) - ${p.avg_velo} mph, ${p.avg_spin} rpm`;
            });
        }

        // Add key insights
        context += `

KEY INSIGHTS FOR COACHING:
• Overall velocity: ${overallVelo.toFixed(1)} mph average across all pitches
• Overall spin: ${Math.round(overallSpin)} rpm average
• Arsenal depth: ${arsenal.length} pitch type${arsenal.length > 1 ? 's' : ''}
• Sample size: ${totalPitches} total pitches logged`;

        return context;

    } catch (error) {
        console.error('Error building pitcher context:', error);
        return '';
    }
}
