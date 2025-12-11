# Maven AI Coaching System

Maven AI is an elite-level baseball pitching coach powered by Google's Gemini AI, designed to provide personalized, data-driven coaching insights based on real pitching metrics.

---

## Overview

Maven AI analyzes your logged pitch data and compares it against MLB Statcast data to provide actionable coaching advice. The system combines old-school baseball wisdom with cutting-edge Sabermetrics.

---

## How Complex Queries Work

When you ask Maven AI a question, the system goes through a sophisticated multi-step process to gather all relevant data before generating a response.

### The Query Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                     User Sends Message                       │
│               "Analyze my fastball velocity"                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    1. Input Processing                       │
│  • Rate limiting check                                       │
│  • Prompt sanitization (prevent injection attacks)           │
│  • Message history limiting (max 20 messages)                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               2. Context Building (6 RPC Calls)             │
│  Fetches ALL relevant data before sending to AI             │
│                                                              │
│  [Pitcher Profile]  →  Basic info (name, age, level, hand)  │
│  [Arsenal Stats]    →  Per-pitch aggregations               │
│  [MLB Percentiles]  →  Statistical benchmarks               │
│  [Velocity Trends]  →  Recent vs overall comparison         │
│  [Similar Pitchers] →  Euclidean distance matching          │
│  [Calculated Metrics] → Separation, consistency grades      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 3. Prompt Assembly                          │
│                                                              │
│  System Prompt (coaching persona + guidelines)              │
│         +                                                   │
│  Pitcher Context (structured TypeScript format)             │
│         +                                                   │
│  Conversation History (sanitized)                           │
│         +                                                   │
│  User's Latest Message                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              4. AI Generation (Gemini)                      │
│                                                              │
│  Model receives complete context with all pitcher data      │
│  Generates response referencing specific metrics            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    5. Response                               │
│  Personalized coaching with YOUR actual numbers             │
└─────────────────────────────────────────────────────────────┘
```

### Step 2 Deep Dive: What Data Is Fetched

Every time you send a message, the system runs **4 specialized PostgreSQL RPC functions** to gather comprehensive data:

#### RPC 1: Arsenal Stats

Aggregates all your logged pitches by type:

| Metric | Description |
|--------|-------------|
| Pitch count | How many of each type |
| Usage percentage | Distribution across arsenal |
| Velocity (avg/max/min) | Speed metrics |
| Velocity stddev | Consistency measure |
| Spin rate (avg/max) | Rotation metrics |
| Horizontal break | Glove-side/arm-side movement |
| Vertical break | Rise/drop |
| Date range | First to last pitch logged |

#### RPC 2: MLB Percentiles

For each pitch type in your arsenal, fetches league-wide statistics:

- Mean velocity across all MLB pitchers for that pitch type
- Standard deviation to calculate z-scores
- Sample size (ensures statistical validity)

The system then calculates your percentile ranking:
```
Z-Score = (Your Avg - MLB Avg) / MLB StdDev
Percentile = 50 + (Z-Score × 15)
```

This means if you throw 95 mph and the MLB average is 94 mph with a 2.5 mph stddev, your z-score is +0.4, putting you around the **56th percentile**.

#### RPC 3: Similar Pitchers

Uses a **materialized view** of pre-computed MLB pitcher averages to find role models:

1. Calculates Euclidean distance between your profile and every MLB pitcher
2. Weights velocity and spin appropriately (different scales)
3. Returns top 3 matches with similarity percentage

#### RPC 4: Velocity Trends

Compares your most recent pitches against your overall average:

- Looks at last 10 pitches per type
- Compares to career average
- Shows if you're improving (+X mph) or declining (-X mph)

### Why This Architecture?

**Server-Side Aggregation**: All calculations happen in PostgreSQL via RPC functions, not in JavaScript. This is critical for:

1. **Performance**: Database is optimized for these calculations
2. **Accuracy**: Uses full dataset, not sampled data
3. **Scalability**: Handles millions of MLB pitch records efficiently
4. **Security**: Data never leaves the database until aggregated

**Pre-Computed Context**: Unlike chatbots that make tool calls mid-conversation, Maven builds the ENTIRE context BEFORE sending to the AI. This means:

- No waiting for multiple round-trips
- AI has all data in the first request
- Faster, more coherent responses

---

## AI Capabilities

### 1. Arsenal Analysis
Compare metrics across all pitch types with detailed breakdowns:
- Usage percentages
- Average, max, and min velocities
- Spin rates and consistency
- Horizontal and vertical movement

### 2. Velocity Separation Analysis
Analyze speed differentials between pitches for deception and tunneling:
- Calculates separation from primary fastball
- Grades separation quality (Good ≥8 mph, Moderate ≥5 mph)
- Identifies pitches needing more speed differential

### 3. Consistency Metrics
Evaluate repeatability through standard deviation analysis:
- **Elite**: < 1.0 mph stddev
- **Good**: < 1.5 mph stddev  
- **Average**: < 2.0 mph stddev
- **Needs Work**: ≥ 2.0 mph stddev

### 4. MLB Benchmarking
Percentile rankings against professional pitchers:
- Uses z-score calculations against MLB Statcast data
- Provides context (50th percentile = MLB average)
- Per-pitch-type percentiles for velocity and spin

### 5. Trend Analysis
Track improvement or regression over time:
- Compares last 10 pitches vs overall average
- Visual indicators: 📈 Improving | ➡️ Stable | 📉 Declining
- Identifies velocity gains or losses

### 6. Pitch Design
Suggest grip adjustments and axis changes:
- Movement profile optimization
- Spin efficiency improvements
- Shape modifications for better results

### 7. Sequencing Strategy
Advise on pitch sequencing and tunneling:
- Optimal pitch pairing recommendations
- Speed differential utilization
- Batter setup strategies

---

## Data Format Sent to AI

The context is formatted as **TypeScript code** for clarity and structure:

```typescript
// Maven formats your data like this before sending to Gemini

const pitcher: PitcherProfile = {
  name: "John Doe",
  age: 22,
  throws: "Right",
  level: "College",
  totalPitches: 247,
  dateRange: "2024-03-01 to 2024-11-15"
};

const arsenal: PitchStats[] = [
  {
    pitchType: "Fastball",
    usage: "62.3%",
    count: 154,
    velocity: { avg: 91.2, max: 94.1, stddev: 1.3, mlbPercentile: 42 },
    spin: { avg: 2245, max: 2412, mlbPercentile: 55 },
    movement: { horizontal: 6.2, vertical: 14.8 },
    separation: "Primary pitch",
    trend: "+0.8 mph (improving)",
    consistency: "Good"
  },
  // ... other pitch types
];

const similarMLBPitchers: SimilarPitcher[] = [
  { name: "Kyle Hendricks", similarity: 87, avgVelo: 86.4, avgSpin: 2156 },
  // ...
];
```

This structured format helps the AI:
- Reference specific numbers accurately
- Compare across pitch types
- Provide contextually relevant advice

---

## Level-Specific Coaching

Maven AI tailors advice based on playing level:

| Level | Focus Areas |
|-------|-------------|
| **High School** | Fundamentals, arm care, velocity development |
| **College** | Pitch refinement, consistency, competitive edge |
| **Pro/Indie** | Optimization, advanced analytics, marginal gains |

---

## Example Prompts

Try asking Maven AI:

| Prompt | What You'll Get |
|--------|----------------|
| "Compare my velocity" | Avg, max, and MLB percentile ranking |
| "Analyze my arsenal" | Full breakdown of all pitch types |
| "What should I work on?" | Identified weaknesses with action items |
| "How is my consistency?" | Stddev analysis with grades |
| "Who do I throw like?" | Similar MLB pitchers as role models |
| "Suggest drills" | Specific exercises for your needs |
| "Help me with sequencing" | Pitch pairing and tunneling advice |

---

## Security & Rate Limiting

### Input Protection
- **Prompt Sanitization**: User input is cleaned to prevent injection attacks
- **Message Length Limits**: Max 2000 characters per message
- **History Limits**: Only last 20 messages included in context

### Rate Limiting
| Endpoint | Limit |
|----------|-------|
| Chat API | 100 requests/min |

---

## Technical Dependencies

- **Google Gemini AI** (`@google/genai`) - Language model (gemini-2.0-flash)
- **Supabase** - PostgreSQL database with RPC functions
- **Materialized Views** - Pre-computed pitcher statistics for fast similarity search

---

## Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key
```

---

## Future Enhancements

Potential improvements for the AI coaching system:

- [ ] Video analysis integration
- [ ] Biomechanics feedback from high-speed footage
- [ ] Game situation simulations
- [ ] Multi-pitcher comparison
- [ ] Seasonal trend tracking
- [ ] Custom drill library with video demos
- [ ] Integration with wearable devices (Driveline, Rapsodo)
