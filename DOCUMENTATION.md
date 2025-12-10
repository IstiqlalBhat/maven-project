# Project Documentation

## 1. Project Overview

**Pitch Tracker Dashboard** is a full-stack web application designed for baseball pitchers to track their performance metrics and benchmark them against real MLB Statcast data. The application provides a personalized dashboard where users can log their pitches (velocity, spin rate, movement) and receive "AI-powered" development plans based on statistical comparisons with professional players.

## 2. Architecture & Technology Stack

The project is built using a modern React-based stack:

-   **Frontend & Backend**: [Next.js 16](https://nextjs.org/) (App Router)
    -   Server-side rendering and API routes handled within the same framework.
    -   React 19 for UI components.
-   **Database**: [PostgreSQL](https://www.postgresql.org/)
    -   Relational data storage for pitcher profiles, pitch logs, and bulk MLB statistical data.
    -   Connected via `pg` (node-postgres) driver.
-   **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
    -   Utility-first CSS framework with a custom glassmorphism design system.
-   **Data Visualization**: [Chart.js](https://www.chartjs.org/) & [React Chart.js 2](https://react-chartjs-2.js.org/)
    -   Radar charts for percentile comparisons.
    -   Scatter/Line charts for performance tracking.
-   **External Data Source**: [Baseball Savant](https://baseballsavant.mlb.com/)
    -   The application seeds its database with real MLB Statcast data for benchmarking.

## 3. Core Features & "How It Works"

### 3.1. Data Seeding (ETL Process)
The application includes a robust seeding mechanism (`/api/seed`) to populate the `mlb_pitches` table.
-   **Source**: Fetches CSV data directly from Baseball Savant's Statcast Search.
-   **Logic**:
    1.  Constructs a search URL with parameters for date range, season, and pitch types.
    2.  Downloads and parses the CSV data.
    3.  Inserts valid pitch records into PostgreSQL in batches to handle large datasets efficiently.
-   **Usage**: Users can trigger this via a POST request to `/api/seed` or typically run it during initial setup.

### 3.2. Pitch Comparison Algorithm
The dashboard compares user metrics against the seeded MLB data (`/api/compare/[pitcherId]`).
-   **Aggregation**: User pitches are grouped by pitch type (e.g., Fastball, Slider).
-   **Statistical Analysis**:
    -   Calculates the user's average velocity, spin rate, and movement for each pitch type.
    -   Fetchers aggregate MLB stats for the corresponding pitch type (Avg, Median, StdDev).
-   **Percentile Calculation**:
    -   Uses a **Z-Score approximation** to determine where the user falls compared to the MLB population.
    -   *Formula*: `Z = (UserAvg - MLBAvg) / MLB_StdDev`
    -   This Z-score is mapped to a percentile (1-99), allowing users to see if their 85mph slider is "Elite", "Average", or "Below Average" compared to pros.

### 3.3. AI Development Recommendations
The "AI" Planner (`/api/ai-plan/[pitcherId]`) generates a custom training plan using a rule-based expert system.
-   **Logic**: It analyzes the gaps between user metrics and MLB standards.
    -   **Velocity Gap**: If user velocity is > 5mph below MLB average, it assigns a "High" priority "Velocity Development" plan (Long toss, lower half strength).
    -   **Spin Rate Gap**: If spin rate is significantly lower (>300 rpm difference), it suggests grip refinements.
    -   **Arsenal Depth**: Checks if the pitcher has fewer than 3 pitch types and suggests adding a complementary off-speed pitch.
-   **Output**: Returns a structured plan with specific "Action Items", "Timeline", and "Realistic Path" (e.g., "D1 Prospect" vs "Building Phase").

### 3.4. Pitch Tracking (CRUD)
-   **Pitchers**: Users can create multiple pitcher profiles.
-   **Pitches**: Users log individual pitches. Each pitch record includes:
    -   Type (Fastball, Curveball, etc.)
    -   Velocity (MPH)
    -   Spin Rate (RPM)
    -   Horizontal/Vertical Break (Inches)
    -   Vertical movement in inches
    -   Date the pitch was thrown
    -   Optional notes

## 4. Database Schema

The database consists of three primary tables:

### `user_pitchers`
Stores profiles for the users tracking their data.
| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary Key |
| `name` | VARCHAR | Pitcher's name |
| `age` | INTEGER | Age of the pitcher |
| `throws` | VARCHAR | Handedness ('R' or 'L') |
| `level` | VARCHAR | Competition level (High School, College, etc.) |
| `primary_pitch` | VARCHAR | Main pitch type |

### `user_pitches`
Stores the individual pitches logged by users.
| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary Key |
| `pitcher_id` | INTEGER | FK to `user_pitchers` |
| `pitch_type` | VARCHAR | Type of pitch (e.g., '4-Seam Fastball') |
| `velocity_mph` | REAL | Velocity in MPH |
| `spin_rate` | INTEGER | Spin rate in RPM |
| `horizontal_break`| REAL | Horizontal movement in inches |
| `vertical_break` | REAL | Vertical movement in inches |
| `date` | DATE | Date the pitch was thrown |
| `notes` | TEXT | Optional notes |

### `mlb_pitches`
Stores the reference data fetched from Baseball Savant.
| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary Key |
| `pitcher_name` | VARCHAR | MLB Pitcher's name |
| `pitch_type` | VARCHAR | Plot code (e.g., 'FF', 'SL') |
| `release_speed` | REAL | Velocity from Statcast |
| `release_spin_rate`| INTEGER | Spin rate |
| `pfx_x` | REAL | Horizontal movement |
| `pfx_z` | REAL | Vertical movement |
| `game_date` | DATE | Date of the game |

## 5. API Reference

### Pitcher Management
-   `GET /api/pitchers`: List all profiles.
-   `POST /api/pitchers`: Create a new profile.
-   `GET /api/pitchers/[id]`: Get details for a specific pitcher.
-   `PUT /api/pitchers/[id]`: Update profile.
-   `DELETE /api/pitchers/[id]`: Delete profile and associated pitches.

### Pitch Management
-   `GET /api/pitches?pitcher_id=X`: Get all pitches for a specific pitcher.
-   `POST /api/pitches`: Record a new pitch.
-   `DELETE /api/pitches/[id]`: Delete a pitch entry.

### Analytics & Data
-   `GET /api/compare/[pitcherId]`: **[Core Feature]** Returns percentile rankings comparing user vs. MLB.
-   `GET /api/ai-plan/[pitcherId]`: **[Core Feature]** Returns generated development advice.
-   `POST /api/seed`: triggers the download of MLB data (requires `startDate`, `endDate`, `season` in body).
-   `GET /api/seed`: Checks status of MLB data in the database.

## 6. Setup & Running

1.  **Configure Database**: Ensure PostgreSQL is running and credentials are in `.env.local` (see `.env.example`).
2.  **Install Dependencies**: `npm install`
3.  **Run Development Server**: `npm run dev`
4.  **Seed Data**:
    -   Use the PowerShell command provided in the README or a tool like Postman to POST to `http://localhost:3000/api/seed`.
    -   *Example Body*: `{"startDate": "2024-04-01", "endDate": "2024-04-10", "season": 2024}`.
