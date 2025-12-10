# My Arsenal vs The Show

A full-stack pitch tracking dashboard that compares your pitches against real MLB Statcast data with AI-powered development recommendations.

## Features

- 📊 **Track Your Arsenal** - Record velocity, spin rate, and movement for every pitch
- 🎯 **MLB Benchmarks** - See your percentile rankings vs real Statcast data from Baseball Savant
- 🤖 **Maven AI Coach** - Chat with an elite pitching coach powered by Google Gemini that knows your exact metrics
- 👥 **Similar Pros** - Find MLB pitchers with similar profiles to yours

[View full AI capabilities documentation](AIfeatures.md)

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
- Firebase Project
- Google AI Studio API Key

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

Create a `.env.local` file with the following variables:

```env
# Database (PostgreSQL)
PGHOST=localhost
PGPORT=5432
PGDATABASE=pitch_tracker
PGUSER=postgres
PGPASSWORD=your_postgres_password
# Or use a connection string
# DATABASE_URL=postgresql://user:pass@host:5432/db

# Admin Access
# Password for the /admin dashboard used for data ingestion
ADMIN_PASSWORD=your_secure_admin_password

# AI Capabilities (Google Gemini)
# Get key from https://aistudio.google.com/
GEMINI_API_KEY=your_gemini_api_key

# Authentication (Firebase)
# Get these from Project Settings -> General -> Your Apps in Firebase Console
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Data Ingestion Pipeline

To power the analytics and AI comparisons, you need to seed the database with MLB Statcast data.

### 1. Admin Access
Navigate to `/admin` and log in using the `ADMIN_PASSWORD` defined in your environment variables.

### 2. Ingesting Data
The Admin Dashboard provides a **Data Ingestion** panel:
1. Select a date range (e.g., "Last 30 Days" or specific dates).
2. Click **Preview** to estimate the volume of data.
3. Click **Start Ingestion** to fetch data from Baseball Savant.
   - The system will fetch data in chunks to prevent rate limiting.
   - This populates `mlb_pitches` and refreshes the `mv_pitcher_stats` materialized view.
   - *Note: Ingesting a full season (≈700k pitches) may take 10-15 minutes.*

### 3. Verify Data
Once ingestion is complete, use the **Data Details** panel in the Admin Dashboard to verify row counts and data integrity.

## Authentication & AI Setup

### Firebase Auth
This project uses Firebase Authentication for user management.
1. Create a project in [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication** and set up the **Email/Password** provider.
3. Copy the configuration keys to your `.env.local` file.

### Gemini AI
The system uses Google's Gemini Pro model for the AI coaching personality.
1. Get an API key from [Google AI Studio](https://aistudio.google.com/).
2. Add it as `GEMINI_API_KEY` in `.env.local`.
3. The AI uses rich context (pitching metrics, trends, comparisons) to generate response. See `AIfeatures.md` for details.

### Alternative: Ingestion via API
For automated or headless ingestion, you can use the API directly:

```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/seed" -Method POST -ContentType "application/json" -Body '{"startDate": "2024-09-01", "endDate": "2024-09-30", "season": 2024}'

# cURL
curl -X POST http://localhost:3000/api/seed -H "Content-Type: application/json" -d '{"startDate": "2024-09-01", "endDate": "2024-09-30", "season": 2024}'
```

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
