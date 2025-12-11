# Data Ingestion System

The data ingestion system fetches real MLB pitch data from Baseball Savant's Statcast API and loads it into your Supabase database.

---

## ⚠️ Deployment Constraints

> [!WARNING]
> **Vercel Free Tier Limitation**: Serverless functions have a 10-second timeout on the free plan (60s on Pro). Large date ranges will time out.

### Recommended Approach

| Environment | Recommendation |
|-------------|----------------|
| **Small imports** (1-2 weeks) | Vercel works fine |
| **Large imports** (1+ month) | Use local development |
| **Full season** (6 months) | **Must use local** |

For large imports, run locally:
```bash
npm run dev
# Navigate to http://localhost:3000/admin
```

---

## How It Works

### 1. Data Source

Data comes from [Baseball Savant](https://baseballsavant.mlb.com/statcast_search), MLB's official Statcast database.

**URL Pattern:**
```
https://baseballsavant.mlb.com/statcast_search/csv?[parameters]
```

**Parameters used:**
- `game_date_gt` / `game_date_lt` - Date range
- `hfSea` - Season year
- `hfPT` - Pitch types (FF, SL, CU, CH, etc.)
- `player_type=pitcher` - Filter to pitchers only
- `type=details` - Full pitch-level data

### 2. Chunking Strategy

Baseball Savant has a **25,000 row limit** per request. To handle this:

```
Date Range: 2024-04-01 to 2024-09-30 (6 months)
                    ↓
         Split into 3-day chunks
                    ↓
Chunk 1: April 1-3   → ~15,000 pitches
Chunk 2: April 4-6   → ~15,000 pitches
Chunk 3: April 7-9   → ~15,000 pitches
...
Chunk N: Sept 28-30  → ~15,000 pitches
```

**Why 3 days?**
- Typically 10-15 games per day during the season
- ~150 pitches per game = ~1,500-2,000 pitches/day
- 3 days ≈ 4,500-6,000 pitches (well under 25k limit)

### 3. Processing Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                    Date Range Input                      │
│                  (2024-04-01 to 2024-09-30)             │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Split into Chunks                      │
│                    (3-day intervals)                     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              For Each Chunk:                             │
│  1. Build Statcast URL with date params                  │
│  2. Fetch CSV from Baseball Savant                       │
│  3. Parse CSV → Extract pitch data                       │
│  4. Validate rows (require pitcher_name, pitch_type)    │
│  5. Batch insert to Supabase (500 rows at a time)       │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Retry Failed Chunks                   │
│               (up to 3 attempts each)                    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Refresh Materialized View                   │
│                  (mv_pitcher_stats)                      │
└─────────────────────────────────────────────────────────┘
```

### 4. Data Extracted

Each pitch record contains:

| Field | Description | Example |
|-------|-------------|---------|
| `pitcher_name` | Player name | "Gerrit Cole" |
| `pitch_type` | Pitch code | "FF" (4-Seam) |
| `release_speed` | Velocity (mph) | 98.4 |
| `release_spin_rate` | Spin (rpm) | 2456 |
| `pfx_x` | Horizontal movement (in) | -6.2 |
| `pfx_z` | Vertical movement (in) | 14.8 |
| `game_date` | Date of pitch | "2024-04-15" |
| `p_throws` | Throwing hand | "R" |

---

## Ingestion Modes

### Append Mode (Default)

Adds new data **without** deleting existing records. Safe for incremental updates.

```javascript
// API call
{ startDate: "2024-08-01", endDate: "2024-08-15", append: true }
```

**Use when:**
- Adding a new date range
- Filling gaps in data
- Incremental updates

### Replace All Mode

**Truncates entire table** before inserting. Use with caution.

```javascript
// API call
{ startDate: "2024-04-01", endDate: "2024-09-30", force: true }
```

**Use when:**
- Fresh database reset
- Data corruption cleanup
- Testing with clean slate

---

## Retry Logic

Failed chunks are automatically retried with exponential backoff:

| Attempt | Wait Time | Action |
|---------|-----------|--------|
| 1 | 0s | Initial attempt |
| 2 | 1s | First retry |
| 3 | 2s | Second retry |
| 4 | 3s | Final retry |

If a chunk fails all 3 retries, an error summary is logged:

```
============================================================
❌ CHUNK FAILURE SUMMARY - The following chunks failed:
============================================================
  📅 Date Range: 2024-08-19 to 2024-08-22
     Attempts: 3/3
     Last Error: Failed to fetch data: 503 Service Unavailable

============================================================
Total failed chunks: 1
You can retry these date ranges manually later.
============================================================
```

---

## Rate Limiting

To avoid being blocked by Baseball Savant:

- **200ms delay** between chunks
- **Exponential backoff** on retries (1s → 2s → 3s)
- **User-Agent header** identifies as "PitchTracker/1.0"

---

## Using the Admin Panel

1. **Navigate to** `/admin`
2. **Login** with your `ADMIN_PASSWORD`
3. **Select date range** using the date pickers
4. **Preview** (optional) - Estimates row count
5. **Choose mode**:
   - Leave unchecked = Append Mode
   - Check "Replace All Data" = Truncate first
6. **Click "Start Ingestion"**

### Quick Presets

| Button | Date Range |
|--------|------------|
| April 2024 | 2024-04-01 to 2024-05-01 |
| Full Season | 2024-04-01 to 2024-10-01 |
| Last 30 Days | Dynamic (rolling window) |

---

## Troubleshooting

### Timeouts on Vercel

**Problem:** 504 Gateway Timeout

**Solution:** Run locally or use smaller date ranges (1-2 weeks at a time)

### 25,000 Row Warning

**Problem:** Console shows "Chunk hit 25,000 record limit"

**Solution:** This means data may be truncated. Consider using smaller chunks or filtering by pitch type.

### Rate Limited (503/429 errors)

**Problem:** Baseball Savant blocking requests

**Solution:** Wait 5-10 minutes and retry. The retry logic handles transient failures.

### Missing Data

**Problem:** Some dates have no data

**Solution:** Check if those dates had MLB games. Off-days and All-Star break have no data.

---

## Technical Details

### Source Files

| File | Purpose |
|------|---------|
| `src/lib/fetch-mlb-data.ts` | Core ingestion logic |
| `src/app/api/seed/route.ts` | API endpoint |
| `src/components/Admin/DataIngestion.tsx` | UI component |

### Database Table

```sql
CREATE TABLE mlb_pitches (
    id SERIAL PRIMARY KEY,
    pitcher_name TEXT NOT NULL,
    pitch_type TEXT NOT NULL,
    release_speed NUMERIC,
    release_spin_rate INTEGER,
    pfx_x NUMERIC,
    pfx_z NUMERIC,
    game_date DATE,
    p_throws TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Pitch Type Codes

| Code | Name |
|------|------|
| FF | 4-Seam Fastball |
| SI | Sinker |
| SL | Slider |
| CU | Curveball |
| CH | Changeup |
| FC | Cutter |
| FS | Splitter |
| KC | Knuckle Curve |
| ST | Sweeper |
| SV | Slurve |
