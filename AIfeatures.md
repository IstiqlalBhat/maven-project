# Maven AI Coaching System

Maven AI is an elite-level baseball pitching coach powered by Google's Gemini AI, designed to provide personalized, data-driven coaching insights based on real pitching metrics.

---

## Overview

Maven AI analyzes your logged pitch data and compares it against MLB Statcast data to provide actionable coaching advice. The system combines old-school baseball wisdom with cutting-edge Sabermetrics.

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

## Data Provided to AI

For each conversation, Maven AI receives comprehensive pitcher data:

```
PITCHER DATA FOR: [Name]
=====================================
Profile: [Age] years old | [Handedness] | [Level]
Data: [X] pitches logged ([Date Range])

ARSENAL BREAKDOWN:
• [Pitch Type] ([Usage]% usage, [Count] pitches):
  - Velocity: [Avg] mph avg | [Max] mph max | ±[Stddev] stddev ([Grade])
  - Spin: [Avg] rpm avg | [Max] max
  - Movement: [H]" horizontal | [V]" vertical
  - MLB Percentiles: Velo [X]th | Spin [X]th
  - Separation from FB: [X] mph
  - Recent trend: [Icon] [+/-X] mph vs overall

VELOCITY SEPARATION ANALYSIS:
• [Pitch]: -[X] mph [Quality Grade]

SIMILAR MLB PITCHERS:
1. [Name] ([X]% match) - [Velo] mph, [Spin] rpm

KEY INSIGHTS:
• Overall velocity: [X] mph average
• Overall spin: [X] rpm average
• Arsenal depth: [X] pitch types
• Sample size: [X] total pitches
```

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

## Technical Implementation

### API Endpoint
```
POST /api/chat
```

### Request Body
```json
{
  "messages": [
    { "role": "user", "parts": [{ "text": "Compare my velocity" }] }
  ],
  "pitcherId": 123
}
```

### Key Features
- **Rate Limiting**: Prevents API abuse
- **Input Sanitization**: Protects against prompt injection
- **Context Limiting**: Max 20 messages, 2000 chars each
- **Session Storage**: Chat history persists during browser session

### SQL Analytics
The system runs 6 optimized queries per request:
1. Per-pitch-type breakdown with aggregations
2. MLB percentile calculations using z-scores
3. Velocity differential analysis
4. Consistency grading via stddev
5. Recent trend comparison (last 10 vs overall)
6. Similar pitcher matching via Euclidean distance

---

## Dependencies

- **Google Gemini AI** (`@google/genai`) - Language model
- **PostgreSQL** - Pitcher data and MLB Statcast storage
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
