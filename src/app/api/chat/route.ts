import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { query, getClient } from '@/lib/postgres';
import { aiRateLimiter } from '@/lib/rate-limiter';
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
    // Rate limiting - stricter for AI to prevent abuse (10/min)
    const rateLimitResponse = aiRateLimiter(request);
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
 * Uses specialized PostgreSQL RPC functions for efficient server-side aggregation
 */
async function buildPitcherContext(pitcherId: number): Promise<string> {
    try {
        const client = await getClient();

        // 1. Get pitcher profile
        const { data: pitcherData, error: pitcherError } = await client
            .from('user_pitchers')
            .select('*')
            .eq('id', pitcherId)
            .single();

        if (pitcherError || !pitcherData) {
            console.error('Error fetching pitcher:', pitcherError);
            return '';
        }

        const pitcher = pitcherData;

        // 2. Get arsenal stats via RPC (all aggregation done in PostgreSQL)
        const { data: arsenalData, error: arsenalError } = await client
            .rpc('get_pitcher_arsenal_stats', { p_pitcher_id: pitcherId });

        if (arsenalError) {
            console.error('Error fetching arsenal stats:', arsenalError);
            // Fallback: return basic pitcher info
            return `
\`\`\`typescript
// PITCHER DATA FOR: ${pitcher.name}
// =====================================
const pitcherProfile = {
  name: "${pitcher.name}",
  age: ${pitcher.age || 'null'},
  throws: "${pitcher.throws === 'R' ? 'Right' : pitcher.throws === 'L' ? 'Left' : 'Unknown'}",
  level: "${pitcher.level || 'Not specified'}",
  status: "Error loading pitch data. Please try again."
};
\`\`\``;
        }

        const arsenal = arsenalData || [];

        if (arsenal.length === 0) {
            return `
\`\`\`typescript
// PITCHER DATA FOR: ${pitcher.name}
// =====================================
const pitcherProfile = {
  name: "${pitcher.name}",
  age: ${pitcher.age || 'null'},
  throws: "${pitcher.throws === 'R' ? 'Right' : pitcher.throws === 'L' ? 'Left' : 'Unknown'}",
  level: "${pitcher.level || 'Not specified'}",
  pitchesLogged: 0,
  status: "No pitches logged yet. Ask the user to add some pitches to get personalized coaching."
};
\`\`\``;
        }

        // 3. Find primary fastball for velocity separation
        const primaryFB = arsenal.find((p: { pitch_type: string }) =>
            ['Fastball', '4-Seam Fastball', 'Four-Seam', 'Sinker', '2-Seam Fastball'].includes(p.pitch_type)
        );
        const primaryVelo = primaryFB ? parseFloat(primaryFB.avg_velo) : 0;

        // 4. Get MLB percentiles via RPC (single call for all pitch types)
        const mlbCodes = arsenal.map((p: { pitch_type: string }) =>
            PITCH_TYPE_MAP[p.pitch_type] || 'FF'
        );
        const uniqueMlbCodes = [...new Set(mlbCodes)];

        const { data: mlbData } = await client
            .rpc('get_mlb_pitch_percentiles', { p_pitch_types: uniqueMlbCodes });

        // Build percentile lookup
        const percentiles: Record<string, { velo: number; spin: number }> = {};
        if (mlbData && Array.isArray(mlbData)) {
            for (const pitch of arsenal) {
                const mlbCode = PITCH_TYPE_MAP[pitch.pitch_type] || 'FF';
                const mlbStats = mlbData.find((m: { pitch_type: string }) => m.pitch_type === mlbCode);

                if (mlbStats) {
                    const veloZ = (parseFloat(pitch.avg_velo) - mlbStats.avg_velo) / (mlbStats.stddev_velo || 3);
                    const spinZ = (parseFloat(pitch.avg_spin) - mlbStats.avg_spin) / (mlbStats.stddev_spin || 200);

                    percentiles[pitch.pitch_type] = {
                        velo: Math.min(99, Math.max(1, Math.round(50 + veloZ * 15))),
                        spin: Math.min(99, Math.max(1, Math.round(50 + spinZ * 15)))
                    };
                }
            }
        }

        // 5. Calculate overall stats for similar pitcher matching
        const totalPitches = arsenal.reduce((sum: number, p: { pitch_count: number }) => sum + p.pitch_count, 0);
        const overallVelo = arsenal.reduce((sum: number, p: { avg_velo: string; pitch_count: number }) =>
            sum + parseFloat(p.avg_velo) * p.pitch_count, 0) / totalPitches;
        const overallSpin = arsenal.reduce((sum: number, p: { avg_spin: number; pitch_count: number }) =>
            sum + p.avg_spin * p.pitch_count, 0) / totalPitches;

        // 6. Get similar MLB pitchers via RPC
        let similarPitchers: { pitcher_name: string; avg_velo: number; avg_spin: number; similarity_pct: number }[] = [];
        try {
            const { data: similarData } = await client
                .rpc('get_similar_mlb_pitchers', {
                    p_avg_velo: overallVelo,
                    p_avg_spin: overallSpin,
                    p_limit: 3
                });
            similarPitchers = similarData || [];
        } catch (e) {
            console.warn('Could not fetch similar pitchers:', e);
        }

        // 7. Get velocity trends via RPC
        const trends: Record<string, number> = {};
        try {
            const { data: trendData } = await client
                .rpc('get_pitcher_velocity_trend', { p_pitcher_id: pitcherId });

            if (trendData && Array.isArray(trendData)) {
                for (const t of trendData) {
                    trends[t.pitch_type] = t.velo_trend || 0;
                }
            }
        } catch (e) {
            console.warn('Could not fetch velocity trends:', e);
        }

        // 8. Build the TypeScript-formatted context
        const dateRange = arsenal[0]?.first_date && arsenal[0]?.last_date
            ? `${arsenal[0].first_date} to ${arsenal[0].last_date}`
            : 'Unknown';

        let context = `
\`\`\`typescript
// PITCHER DATA FOR: ${pitcher.name}
// =====================================

interface PitcherProfile {
  name: string;
  age: number | null;
  throws: "Right" | "Left" | "Unknown";
  level: string;
  totalPitches: number;
  dateRange: string;
}

const pitcher: PitcherProfile = {
  name: "${pitcher.name}",
  age: ${pitcher.age || 'null'},
  throws: "${pitcher.throws === 'R' ? 'Right' : pitcher.throws === 'L' ? 'Left' : 'Unknown'}",
  level: "${pitcher.level || 'Not specified'}",
  totalPitches: ${totalPitches},
  dateRange: "${dateRange}"
};

interface PitchStats {
  pitchType: string;
  usage: string;
  count: number;
  velocity: { avg: number; max: number; stddev: number; mlbPercentile: number | null };
  spin: { avg: number; max: number; mlbPercentile: number | null };
  movement: { horizontal: number; vertical: number };
  separation: string;
  trend: string;
  consistency: "Elite" | "Good" | "Average" | "Needs work";
}

const arsenal: PitchStats[] = [`;

        for (const pitch of arsenal) {
            const pct = percentiles[pitch.pitch_type];
            const trend = trends[pitch.pitch_type] || 0;
            const trendStr = trend > 0.5 ? `+${trend} mph (improving)` : trend < -0.5 ? `${trend} mph (declining)` : 'stable';
            const consistencyGrade = parseFloat(pitch.velo_stddev) < 1.0 ? 'Elite' :
                parseFloat(pitch.velo_stddev) < 1.5 ? 'Good' :
                    parseFloat(pitch.velo_stddev) < 2.0 ? 'Average' : 'Needs work';
            const veloDiff = primaryVelo && pitch.pitch_type !== primaryFB?.pitch_type
                ? `-${(primaryVelo - parseFloat(pitch.avg_velo)).toFixed(1)} mph from FB`
                : 'Primary pitch';

            context += `
  {
    pitchType: "${pitch.pitch_type}",
    usage: "${pitch.usage_pct}%",
    count: ${pitch.pitch_count},
    velocity: { avg: ${pitch.avg_velo}, max: ${pitch.max_velo}, stddev: ${pitch.velo_stddev}, mlbPercentile: ${pct?.velo || 'null'} },
    spin: { avg: ${pitch.avg_spin}, max: ${pitch.max_spin}, mlbPercentile: ${pct?.spin || 'null'} },
    movement: { horizontal: ${pitch.avg_h_break || 0}, vertical: ${pitch.avg_v_break || 0} },
    separation: "${veloDiff}",
    trend: "${trendStr}",
    consistency: "${consistencyGrade}"
  },`;
        }

        context += `
];`;

        // Add similar pitchers
        if (similarPitchers.length > 0) {
            context += `

interface SimilarPitcher {
  name: string;
  similarity: number;
  avgVelo: number;
  avgSpin: number;
}

const similarMLBPitchers: SimilarPitcher[] = [`;
            for (const p of similarPitchers) {
                context += `
  { name: "${p.pitcher_name}", similarity: ${p.similarity_pct}, avgVelo: ${p.avg_velo}, avgSpin: ${p.avg_spin} },`;
            }
            context += `
];`;
        }

        // Add summary
        context += `

// KEY INSIGHTS
const insights = {
  overallVelocity: ${overallVelo.toFixed(1)}, // mph average
  overallSpin: ${Math.round(overallSpin)}, // rpm average
  arsenalDepth: ${arsenal.length}, // pitch types
  sampleSize: ${totalPitches} // total pitches logged
};
\`\`\``;

        return context;

    } catch (error) {
        console.error('Error building pitcher context:', error);
        return '';
    }
}
