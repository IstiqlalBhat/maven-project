# My Arsenal vs The Show ⚾

A full-stack baseball pitch tracking platform that compares your pitches against real MLB Statcast data, powered by AI coaching.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)
![Firebase](https://img.shields.io/badge/Firebase-Auth-orange)

---

## Features

### 📊 Pitch Tracking Dashboard
- Log velocity, spin rate, and movement for every pitch
- Visual arsenal breakdown with charts and 3D visualization
- Track trends over time with historical data

### 🎯 MLB Benchmarking
- Percentile rankings against real MLB Statcast data
- Z-score calculations for velocity and spin rate
- Per-pitch-type comparisons (FF, CU, SL, CH, etc.)

### 🤖 Maven AI Coach
- Chat with an elite pitching coach powered by Google Gemini
- Analyzes YOUR data: arsenal breakdown, consistency, trends
- Level-specific advice (High School, College, Pro)
- Sequencing strategy and pitch design recommendations

### 👥 Similar Pros
- Find MLB pitchers with similar velocity/spin profiles
- Euclidean distance matching against materialized pitcher stats
- Role models for development

### 📤 Batch Upload
- CSV upload for bulk pitch data
- Column mapping UI for flexible imports
- Validation and error handling
- **Sample data included** - see `dummy data(CSV)/` folder

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Database** | Supabase (PostgreSQL + RLS) |
| **Auth** | Firebase Authentication |
| **AI** | Google Gemini Pro |
| **Charts** | Chart.js, Recharts |
| **3D** | Three.js, React Three Fiber |
| **Styling** | Tailwind CSS (Glassmorphism) |

---

## Project Structure

```
maven-project/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # Backend API routes
│   │   │   ├── auth/       # Authentication
│   │   │   ├── chat/       # AI chat (Gemini)
│   │   │   ├── compare/    # MLB benchmarking
│   │   │   ├── pitchers/   # Pitcher CRUD
│   │   │   ├── pitches/    # Pitch tracking
│   │   │   ├── seed/       # Data ingestion
│   │   │   └── similar/    # Similar pitcher matching
│   │   ├── dashboard/      # User dashboard
│   │   ├── admin/          # Admin panel
│   │   └── ...             # Other pages
│   │
│   ├── components/          # React components
│   │   ├── AIChat.tsx      # AI coaching chat
│   │   ├── ArsenalOverview.tsx
│   │   ├── PitchForm.tsx   # Pitch entry form
│   │   ├── StatsCharts.tsx # Visualizations
│   │   └── ...
│   │
│   ├── core/                # Backend core
│   │   ├── database/       # Supabase client
│   │   └── api/            # Auth, rate limiting, validation
│   │
│   └── shared/              # Shared code
│       ├── types/          # TypeScript interfaces
│       ├── constants/      # App constants
│       └── utils/          # Utility functions
│
├── sql/                     # Database SQL scripts
│   ├── supabase-migration.sql
│   ├── supabase-rpc-functions.sql
│   └── reset-database.sql
│
├── markdown/                # Documentation
│   ├── AIfeatures.md       # AI coaching system
│   ├── ARCHITECTURE.md     # Project structure
│   ├── CSV.md              # CSV upload format
│   ├── DEPLOYMENT.md       # Deployment guide
│   └── ...                 # Other docs
│
├── dummy data(CSV)/         # Sample data for testing
│   └── pitch_dummy.csv     # 49 sample pitches
│
└── [config files]
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- [Supabase](https://supabase.com) account (free tier works)
- [Firebase](https://firebase.google.com) project
- [Google AI Studio](https://aistudio.google.com) API key

### Installation

1. **Clone & Install**
   ```bash
   git clone <repo-url>
   cd maven-project
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

3. **Set Up Database**
   
   Run these in your Supabase SQL Editor:
   - `sql/supabase-migration.sql` - Tables & RLS policies
   - `sql/supabase-rpc-functions.sql` - Analytics functions

4. **Start Development**
   ```bash
   npm run dev
   ```

5. **Open** [http://localhost:3000](http://localhost:3000)

---

## Environment Configuration

### How It Works

| File | Purpose | Git Status |
|------|---------|------------|
| `.env.example` | Template (no secrets) | ✅ Committed |
| `.env.local` | Local development | ❌ Ignored |
| `.env` | Production | ❌ Ignored |

Next.js automatically loads `.env.local` during development, overriding `.env`.

### Required Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# AI & Admin
GEMINI_API_KEY=your_gemini_api_key
ADMIN_PASSWORD=your_admin_password
```

---

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `user_pitchers` | Pitcher profiles (linked to Firebase UID) |
| `user_pitches` | Individual pitch data |
| `mlb_pitches` | MLB Statcast reference data |
| `mv_pitcher_stats` | Materialized view for analytics |

### Row Level Security

All user data is protected by RLS policies that enforce ownership via Firebase UID.

---

## API Endpoints

### Pitchers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pitchers` | List user's pitchers |
| POST | `/api/pitchers` | Create pitcher profile |
| GET | `/api/pitchers/[id]` | Get specific pitcher |
| PUT | `/api/pitchers/[id]` | Update pitcher |
| DELETE | `/api/pitchers/[id]` | Delete pitcher |

### Pitches
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pitches?pitcher_id=X` | List pitches |
| POST | `/api/pitches` | Add single pitch |
| POST | `/api/pitches/batch` | Bulk upload |
| DELETE | `/api/pitches/batch` | Bulk delete |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/compare/[pitcherId]` | MLB percentile comparison |
| GET | `/api/similar/[pitcherId]` | Find similar MLB pitchers |
| POST | `/api/chat` | AI coaching chat |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/seed` | Ingest MLB Statcast data |

---

## Data Ingestion

### Seeding MLB Data

1. Navigate to `/admin`
2. Login with `ADMIN_PASSWORD`
3. Select date range
4. Click **Start Ingestion**

Data is fetched from Baseball Savant in chunks to avoid rate limiting.

---

## Batch Upload (CSV)

Upload your pitch data in bulk using CSV files.

### Using Sample Data

A sample CSV file is included for testing:

```
dummy data(CSV)/pitch_dummy.csv
```

This file contains **49 sample pitches** across 7 pitch types (Fastball, Sinker, Slider, Curveball, Changeup, Cutter, Splitter).

### How to Upload

1. Navigate to your **Dashboard**
2. Click **Batch Upload** or go to pitch entry
3. Select your CSV file
4. Map columns if needed (auto-detected for standard format)
5. Click **Upload**

### CSV Format

| Column | Required | Example |
|--------|----------|---------|
| `pitch_type` | ✅ Yes | Fastball, Slider, Curveball |
| `velocity_mph` | ✅ Yes | 95.4 |
| `spin_rate` | Optional | 2325 |
| `horizontal_break` | Optional | 8.2 |
| `vertical_break` | Optional | 15.1 |
| `date` | Optional | 2024-03-12 |
| `notes` | Optional | Good ride |

See [CSV.md](markdown/CSV.md) for full format documentation.

---

## AI Coaching System

Maven AI provides personalized coaching based on your actual pitch data.

### Capabilities
- Arsenal analysis with usage percentages
- Velocity separation analysis
- Consistency grading (Elite/Good/Average/Needs Work)
- MLB percentile benchmarking
- Trend analysis (last 10 vs overall)
- Similar pitcher identification
- Sequencing strategy

### Example Prompts
| Prompt | Response Type |
|--------|---------------|
| "Analyze my arsenal" | Full breakdown of all pitches |
| "How is my consistency?" | Stddev analysis with grades |
| "Who do I throw like?" | Similar MLB pitchers |
| "What should I work on?" | Prioritized improvements |

See [AIfeatures.md](markdown/AIfeatures.md) for full documentation.

---

## Security

### Authentication
- Firebase Authentication with JWT tokens
- Token verification on all authenticated endpoints

### Rate Limiting
| Endpoint Type | Limit |
|---------------|-------|
| Auth | 5 req/min |
| API | 100 req/min |
| Batch | 50 req/min |
| Heavy (seed) | 3 req/5min |

### Data Protection
- RLS policies enforce data ownership
- Input validation and sanitization
- Parameterized queries prevent SQL injection

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables in dashboard
4. Deploy

### Environment Variables for Production
Set these in Vercel Dashboard → Settings → Environment Variables:
- All Supabase keys
- All Firebase keys
- `GEMINI_API_KEY`
- `ADMIN_PASSWORD`

---

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # Run ESLint
```

---

## Documentation

| File | Description |
|------|-------------|
| [ARCHITECTURE.md](markdown/ARCHITECTURE.md) | Project structure & patterns |
| [AIfeatures.md](markdown/AIfeatures.md) | AI coaching system details |
| [DEPLOYMENT.md](markdown/DEPLOYMENT.md) | Deployment guide |
| [CSV.md](markdown/CSV.md) | CSV upload format |
| [BASEBALL.md](markdown/BASEBALL.md) | Baseball terminology reference |
| [DOCUMENTATION.md](markdown/DOCUMENTATION.md) | Full technical docs |

---

## License

MIT
