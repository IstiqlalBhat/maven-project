# Maven Project Architecture

## Project Structure

The Maven project follows a clean architecture pattern with clear separation between frontend, backend, shared utilities, and core functionality.

```
maven-project/
├── src/
│   ├── app/                    # Next.js App Router (Pages & API Routes)
│   │   ├── api/               # Backend API routes
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── pitchers/      # Pitcher CRUD operations
│   │   │   ├── pitches/       # Pitch tracking endpoints
│   │   │   ├── compare/       # Analytics & comparison endpoints
│   │   │   ├── similar/       # Similar pitcher matching
│   │   │   ├── chat/          # AI chat endpoint (Gemini)
│   │   │   └── seed/          # Data ingestion endpoints
│   │   ├── admin/             # Admin dashboard page
│   │   ├── dashboard/         # User dashboard pages
│   │   ├── login/             # Authentication pages
│   │   └── ...                # Other pages
│   │
│   ├── shared/                 # Shared code across frontend & backend
│   │   ├── types/             # TypeScript type definitions
│   │   ├── constants/         # App-wide constants
│   │   └── utils/             # Shared utility functions
│   │
│   ├── core/                   # Core backend functionality
│   │   ├── database/          # PostgreSQL connection & queries
│   │   └── api/               # API utilities
│   │       ├── auth.ts        # Authentication middleware
│   │       ├── rate-limiting.ts  # Rate limiting
│   │       └── validation.ts  # Input validation
│   │
│   ├── components/             # React UI components
│   │   ├── Admin/             # Admin-specific components
│   │   ├── Auth/              # Authentication components
│   │   └── ...                # Feature components
│   │
│   ├── context/                # React Context providers
│   │   └── AuthContext.tsx    # Firebase auth context
│   │
│   └── lib/                    # Legacy library folder
│       └── [backwards-compat aliases]
│
├── docs/                       # Documentation & sample data
├── public/                     # Static assets
└── [config files]

```

## Architecture Layers

### 1. Frontend Layer

**Location**: `src/app/`, `src/components/`, `src/context/`

**Responsibilities**:
- React components and UI
- Client-side routing (Next.js App Router)
- User authentication state management
- Data fetching and state management

**Key Technologies**:
- Next.js 14 with App Router
- React 19
- Firebase Auth (client SDK)
- Chart.js for visualizations
- Three.js for 3D pitch visualization

### 2. Backend Layer

**Location**: `src/app/api/`, `src/core/`

**Responsibilities**:
- RESTful API endpoints
- Database operations
- Business logic
- Authentication & authorization
- Rate limiting
- Data validation

**Key Technologies**:
- Next.js API Routes
- PostgreSQL with pg library
- Firebase Auth verification
- MLB Statcast data ingestion

### 3. Shared Layer

**Location**: `src/shared/`

**Modules**:
- **types/** - TypeScript interfaces used across frontend & backend
- **constants/** - App-wide constants (pitch types, colors, rate limits)
- **utils/** - Pure utility functions (formatting, calculations)

### 4. Database Layer

**Location**: `src/core/database/`

**Key Files**:
- `index.ts` - PostgreSQL connection pool, query helpers, transactions

**Database Schema**:
```sql
user_pitchers      # Pitcher profiles with Firebase UID
user_pitches       # Individual pitch data
mlb_pitches        # MLB Statcast data
mv_pitcher_stats   # Materialized view for analytics
```

## Data Flow

### User Pitch Entry Flow
```
User Form → API Route → Validation → Database → Response
   ↓            ↓           ↓           ↓          ↓
PitchForm  /api/pitches  validatePitch()  PostgreSQL  UI Update
```

### Authentication Flow
```
1. Client: User enters credentials
2. Firebase Auth: Validates & returns ID token
3. Client: Stores token, includes in API requests
4. API: Middleware extracts & validates token
5. API: Permits/denies request based on auth
```

### MLB Data Ingestion Flow
```
Admin UI → /api/seed → fetch-mlb-data.ts → Baseball Savant
    ↓                        ↓                       ↓
Trigger          Fetch in chunks (25k rows)    CSV Data
    ↓                        ↓                       ↓
Database ← COPY FROM STDIN ← Parse & stream
```

## Import Paths

The project uses TypeScript path aliases for clean imports:

```typescript
// Shared utilities
import { getPitchColor, getPitchIcon } from '@/shared/utils';
import { PITCH_TYPES, PITCH_TYPE_COLORS } from '@/shared/constants';
import type { PitchData, UserPitcher } from '@/shared/types';

// Core backend
import { query, withTransaction } from '@/core/database';
import { requireUserAuth } from '@/core/api/auth';
import { apiRateLimiter } from '@/core/api/rate-limiting';
import { validatePitchData } from '@/core/api/validation';

// Components
import PitchForm from '@/components/PitchForm';
import { useAuth } from '@/context/AuthContext';
```

## Security

### Authentication
- **User Auth**: Firebase Authentication with JWT tokens
  - ⚠️ **WARNING**: Current implementation does NOT verify signature
  - Production requires Firebase Admin SDK for proper verification
- **Admin Auth**: Session-based tokens (in-memory for dev, use Redis for prod)

### Rate Limiting
- In-memory rate limiting (use Redis for distributed systems)
- Different limits per endpoint type:
  - Auth: 5 req/min
  - API: 100 req/min
  - Batch: 50 req/min
  - Heavy: 3 req/5min

### Input Validation
- All user inputs sanitized before database storage
- Pitch data validated against constraints
- SQL injection prevented via parameterized queries

## Performance Optimizations

### Database
- Composite indexes on frequently queried columns
- Materialized view for pitcher statistics
- Connection pooling (max 20 connections)
- COPY FROM STDIN for bulk inserts

### Frontend
- Server-side rendering with Next.js
- Client-side caching of pitcher data
- Optimized 3D rendering with reduced poly count
- Lazy loading of heavy components

## External Dependencies

### Data Sources
- **MLB Statcast**: Baseball Savant CSV export
- Rate limited to avoid blocking

### APIs
- **Firebase**: User authentication
- **Google Gemini**: AI chatbot functionality

## Development

### Environment Variables
See `.env.example` for required configuration:
- `DATABASE_URL` or PostgreSQL connection params
- `ADMIN_PASSWORD` for admin access
- `GEMINI_API_KEY` for AI features
- Firebase configuration keys

### Scripts
```bash
npm run dev    # Development server
npm run build  # Production build
npm run start  # Production server
```

## Migration Notes

**Backwards Compatibility**: The `src/lib/` folder now contains re-export aliases that point to the new locations in `src/core/` and `src/shared/`. This ensures existing imports continue to work during migration.

To migrate an import:
```typescript
// Old (still works)
import { query } from '@/lib/postgres';

// New (preferred)
import { query } from '@/core/database';
```
