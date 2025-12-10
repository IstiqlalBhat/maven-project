# My Arsenal vs The Show

A full-stack pitch tracking dashboard that compares your pitches against real MLB Statcast data with AI-powered development recommendations.

## Features

- 📊 **Track Your Arsenal** - Record velocity, spin rate, and movement for every pitch
- 🎯 **MLB Benchmarks** - See your percentile rankings vs real Statcast data from Baseball Savant
- 🧠 **AI Development** - Get personalized recommendations to improve based on your metrics
- 👥 **Similar Pros** - Find MLB pitchers with similar profiles to yours

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Styling**: Tailwind CSS with glassmorphism design
- **Charts**: Chart.js
- **Data Source**: MLB Statcast via Baseball Savant

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or hosted)

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd maven-project
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local with your PostgreSQL credentials
# IMPORTANT: Never commit .env.local to version control!
```

Required environment variables (see `.env.example`):
- `PGHOST` - Database host (default: localhost)
- `PGPORT` - Database port (default: 5432)
- `PGDATABASE` - Database name (default: pitch_tracker)
- `PGUSER` - Database username
- `PGPASSWORD` - Database password (**required**)

> ⚠️ **Security Note**: Never hardcode database credentials in source code. Always use environment variables.

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

### Seeding MLB Data

To load real MLB Statcast data from Baseball Savant:

```bash
# Via API (recommended)
curl -X POST http://localhost:3000/api/seed -H "Content-Type: application/json" -d '{"startDate": "2024-09-01", "endDate": "2024-09-30", "season": 2024}'

# Or in PowerShell:
Invoke-RestMethod -Uri "http://localhost:3000/api/seed" -Method POST -ContentType "application/json" -Body '{"startDate": "2024-09-01", "endDate": "2024-09-30"}'
```

This will fetch pitch data from Baseball Savant and insert it into your PostgreSQL database.

## API Endpoints

### Pitchers
- `GET /api/pitchers` - List all pitcher profiles
- `POST /api/pitchers` - Create a new pitcher profile
- `GET /api/pitchers/[id]` - Get a specific pitcher
- `PUT /api/pitchers/[id]` - Update a pitcher
- `DELETE /api/pitchers/[id]` - Delete a pitcher

### Pitches
- `GET /api/pitches?pitcher_id=X` - List pitches for a pitcher
- `POST /api/pitches` - Add a new pitch
- `GET /api/pitches/[id]` - Get a specific pitch
- `PUT /api/pitches/[id]` - Update a pitch
- `DELETE /api/pitches/[id]` - Delete a pitch

### Analysis
- `GET /api/compare/[pitcherId]` - Compare user pitches to MLB data with percentile rankings
- `GET /api/similar/[pitcherId]` - Find MLB pitchers with similar metrics
- `GET /api/ai-plan/[pitcherId]` - Get AI-generated development recommendations

### Data
- `GET /api/seed` - Check MLB data status
- `POST /api/seed` - Seed database with real MLB Statcast data

## Database Schema

### user_pitchers
- id, name, age, throws (L/R), level, primary_pitch, created_at

### user_pitches
- id, pitcher_id, pitch_type, velocity_mph, spin_rate, horizontal_break, vertical_break, date, notes, created_at

### mlb_pitches
- id, pitcher_name, pitch_type, release_speed, release_spin_rate, pfx_x, pfx_z, game_date, p_throws, created_at

## Data Source

This application uses official MLB Statcast data obtained from [Baseball Savant](https://baseballsavant.mlb.com/statcast_search). The data includes:
- Pitch velocity (release_speed)
- Spin rate (release_spin_rate)
- Horizontal movement (pfx_x)
- Vertical movement (pfx_z)
- Pitcher name and throw hand

## License

MIT
