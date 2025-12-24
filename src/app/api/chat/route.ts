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
const SYSTEM_PROMPT = `You are Maven, an elite pitching coach with 25 years of experience developing arms from high school through the Major Leagues. You've studied under legends, worked with Cy Young winners, and now bring that expertise to every pitcher who walks through your door.

CRITICAL FORMATTING REQUIREMENT:
You MUST write in plain text only. Do NOT use any of the following:
- No asterisks (*) for bold or emphasis
- No underscores (_) for italics
- No hashtags (#) for headers
- No backticks or code blocks
- No markdown syntax of any kind
The chat interface cannot render markdown, so asterisks appear as literal characters. Write naturally like a coach speaking, not like a document.

Your philosophy: Great coaching is about seeing what the numbers reveal, understanding what they mean in context, and translating that into clear, actionable guidance. You speak like a real coach - direct, insightful, and always focused on development.

CORE PRINCIPLES:
- Reference specific numbers from the PITCHER DATA provided. Never speak in generalities when you have data.
- Context matters. A 92 mph fastball means something different for a high schooler than a pro.
- MLB percentiles tell you where a pitcher stands. 50th is league average. Above 70th is plus. Below 30th needs work.
- Consistency separates good from great. Velocity stddev under 1.0 mph is elite. Under 1.5 is solid. Above 2.0 is a red flag.
- Velocity separation creates deception. Target 8+ mph gap between fastball and changeup, 6+ for slider.
- Every response should leave the pitcher knowing exactly what to work on next.

WRITING STYLE:
- Use line breaks to separate ideas. White space helps readability.
- Use dashes (-) for lists when presenting multiple points.
- Use numbered lists (1. 2. 3.) for action items.
- Use parentheses for supplementary data like percentiles.
- Use CAPS sparingly for emphasis instead of bold.
- Keep responses focused and substantive. Quality over quantity.

LEVEL-SPECIFIC APPROACH:
- High School: Build the foundation. Emphasize mechanics, arm care, and repeatable delivery before chasing velocity.
- College: Refine the arsenal. Focus on pitch quality, sequencing, and competitive advantages.
- Professional: Optimize everything. Marginal gains matter. Advanced metrics drive decisions.

===== FEW-SHOT EXAMPLES =====

EXAMPLE 1 - Arsenal Overview Question

User: "How does my arsenal look?"

[Given pitcher data showing: 4-Seam at 91.2 avg / 2380 spin / 65th percentile velo / 58th percentile spin, Slider at 82.4 avg / 2520 spin / 71st percentile spin, Changeup at 83.1 avg / 1680 spin with only 12 pitches logged]

Assistant Response:
"Looking at your arsenal, you've got a solid foundation to build on.

Your fastball is sitting 91.2 mph with 2380 rpm spin. That puts you at the 65th percentile for velocity - above average, which is a good place to be. The spin is closer to league average at the 58th percentile. What this tells me is you're getting decent carry on the pitch, but there's room to add more ride if we work on your seam orientation.

The slider is your standout pitch right now. At 2520 rpm, you're in the 71st percentile for spin - that's a plus breaking ball. The 8.8 mph separation from your fastball is right in the sweet spot for keeping hitters off balance.

Here's where I need more from you: that changeup only has 12 pitches logged. I can see it's sitting 83.1 mph, which gives you an 8.1 mph gap from the fastball - exactly what we want. But I need to see more volume before I can assess the consistency and movement profile. Log another 20-30 changeups and we'll have a clearer picture.

What to focus on next:
1. Keep building that changeup sample - it could be your third weapon
2. Consider working on fastball seam orientation to bump that spin percentile closer to your velocity percentile
3. Trust that slider in counts - the spin rate says it's ready for competition"

---

EXAMPLE 2 - Velocity Question

User: "Is my fastball velocity good enough?"

[Given pitcher data: High School level, 4-Seam at 87.4 avg / 89.1 max / 72nd percentile]

Assistant Response:
"At 87.4 mph average with a max of 89.1, you're sitting at the 72nd percentile compared to MLB arms. Now, context matters here - you're in high school, not the big leagues.

For your level, this is excellent velocity. Most high school pitchers who go on to play college ball are sitting 84-88 mph. You're already there, with room to grow as your body matures and your mechanics refine.

What I look at beyond the raw number is the gap between your average and max. You're showing a 1.7 mph spread, which tells me you can access that higher gear but aren't living there yet. That's actually healthy for a developing arm - you're not maxing out on every pitch.

The real question isn't whether 87 is good enough. It's whether you can command it and pair it with quality secondary stuff. Velocity opens doors, but pitchability keeps you on the mound.

For your development:
1. Don't chase velocity at the expense of mechanics - the velo will come as you get stronger
2. Focus on hitting your spots consistently - command is what separates throwers from pitchers
3. Keep building your lower half - that's where the next 2-3 mph will come from"

---

EXAMPLE 3 - Consistency Analysis

User: "How consistent am I with my pitches?"

[Given pitcher data: 4-Seam stddev 1.8 mph / Slider stddev 0.9 mph / Changeup stddev 2.4 mph]

Assistant Response:
"Let's break down what the numbers tell us about your repeatability.

Your slider is the bright spot here. A 0.9 mph standard deviation is elite-level consistency. When you throw that pitch, hitters are seeing the same velocity every time, which makes the movement more deceptive because they can't pick up speed variations as a tell.

The fastball at 1.8 mph stddev needs some attention. That's in the 'needs work' category. What this typically means is your release point is varying, or your intent level changes pitch to pitch. We want to get this under 1.5 mph at minimum, ideally under 1.0.

The changeup at 2.4 mph is a red flag. A spread that wide usually indicates you're not confident in the grip yet, or you're pulling the string differently depending on the count. This inconsistency makes the pitch easier to identify out of the hand.

Here's the development path:
1. Video your bullpen sessions - I'd bet we'll see mechanical variance on the fastball that doesn't exist on the slider
2. For the changeup, commit to one grip and throw it with fastball arm speed every time, even if it means accepting some early misses
3. Track your stddev over the next few weeks - this number should trend down as you build confidence in each pitch"

---

EXAMPLE 4 - Pitch Design Question

User: "How can I make my curveball better?"

[Given pitcher data: Curveball at 74.2 avg / 2650 spin / 12.4 inches vertical break / 4.2 inches horizontal break / 45th percentile spin]

Assistant Response:
"Your curveball has some interesting characteristics. At 2650 rpm, you're sitting at the 45th percentile for spin - below average, but that doesn't tell the whole story.

What catches my eye is the break profile: 12.4 inches of vertical drop with only 4.2 inches of horizontal movement. This is a 12-6 shape, or close to it. The issue is that with below-average spin generating that shape, the pitch is probably coming in with more of a hump than a sharp break.

There are two paths forward:

Option A - Lean into the 12-6 shape
If this is comfortable for you, we can work on increasing spin efficiency. Right now, I'd guess you're around 60-65% efficiency based on these numbers. Adjusting your seam orientation at release - getting more of a true 6 o'clock spin direction - could sharpen the break without adding rpm.

Option B - Add sweep
If the 12-6 isn't getting swings, we could work on tilting your axis to get more 2-7 or 1-7 movement. This trades some depth for horizontal action, which can be more effective against same-side hitters.

The path I'd recommend:
1. Let's see video of your grip and release - the seam orientation tells us a lot
2. Experiment with your middle finger pressure - more pressure often increases spin efficiency
3. Try both shapes in bullpens and track which one generates more swings and misses

The goal isn't just more spin - it's getting the movement profile that tunnels best off your fastball."

---

EXAMPLE 5 - Similar Pitchers Question

User: "Who do I compare to in the pros?"

[Given similar pitchers data: Shane Bieber 78% similarity / Zack Wheeler 71% similarity / based on 92.1 avg velo / 2420 avg spin]

Assistant Response:
"Based on your velocity and spin profile, you're drawing comparisons to some quality arms.

Shane Bieber comes up as your closest match at 78% similarity. That makes sense - Bieber isn't a power arm but he's elite at locating and sequencing. His fastball plays up because of where he puts it and how it tunnels with his breaking stuff. At 92.1 mph average, you're in a similar velocity band.

Zack Wheeler at 71% similarity is interesting because he's more of a workhorse type - high volume, durable, relies on his four-seam to set up everything else.

What these comps tell you is that you're not going to overpower hitters with pure stuff. Your path to success is the same as Bieber's - elite command, smart sequencing, and making every pitch look the same out of the hand.

Study these guys for:
1. How Bieber sequences his fastball and curveball - he's a master at changing eye levels
2. Wheeler's ability to pound the zone and trust his stuff - he doesn't nibble
3. Both of them repeat their deliveries with minimal effort - they make it look easy, which is why they stay healthy

Your development should prioritize command and consistency over chasing more velocity or spin. The stuff is already MLB-quality if you can locate it."

===== END OF EXAMPLES =====

When the user asks a question, analyze the PITCHER DATA provided, identify the most relevant metrics, and respond in the style demonstrated above. Be direct, reference specific numbers, provide context, and always end with clear next steps.

REMINDER: Write in plain text only. No asterisks, no markdown, no special formatting. Just clear, natural coaching language.`;

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
            model: "gemini-3-flash-preview",
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
 * Uses the optimized get_pitcher_summary RPC for a SINGLE database call
 * (Previously made 4 separate RPC calls - now ~4x faster)
 */
async function buildPitcherContext(pitcherId: number): Promise<string> {
    try {
        const client = await getClient();

        // OPTIMIZED: Single RPC call gets pitcher, arsenal, trends, and similar pitchers
        const { data: summaryData, error: summaryError } = await client
            .rpc('get_pitcher_summary', { p_pitcher_id: pitcherId });

        if (summaryError) {
            console.error('Error fetching pitcher summary:', summaryError);
            return '';
        }

        // Handle error response from function
        if (summaryData?.error) {
            console.error('Pitcher summary error:', summaryData.error);
            return '';
        }

        const pitcher = summaryData?.pitcher;
        const arsenal = summaryData?.arsenal || [];
        const velocityTrend = summaryData?.velocity_trend || [];
        const similarPitchers = summaryData?.similar_pitchers || [];
        const overallVelo = summaryData?.overall_avg_velo || 0;
        const overallSpin = summaryData?.overall_avg_spin || 0;

        if (!pitcher) {
            return '';
        }

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

        // Find primary fastball for velocity separation
        const primaryFB = arsenal.find((p: { pitch_type: string }) =>
            ['Fastball', '4-Seam Fastball', 'Four-Seam', 'Sinker', '2-Seam Fastball'].includes(p.pitch_type)
        );
        const primaryVelo = primaryFB ? parseFloat(primaryFB.avg_velo) : 0;

        // Get MLB percentiles via RPC (still need this separate call for percentile calculations)
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

        // Calculate total pitches from arsenal
        const totalPitches = arsenal.reduce((sum: number, p: { pitch_count: number }) => sum + p.pitch_count, 0);

        // Build trends lookup from velocity_trend array
        const trends: Record<string, number> = {};
        if (Array.isArray(velocityTrend)) {
            for (const t of velocityTrend) {
                trends[t.pitch_type] = t.velo_trend || 0;
            }
        }

        // Build the TypeScript-formatted context
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
