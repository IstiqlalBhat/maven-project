-- ============================================
-- RESET DATABASE (RUN THIS FIRST IF NEEDED)
-- ============================================
-- WARNING: This will DELETE ALL DATA. Only run if you want a fresh start.
-- Copy this into a SEPARATE query and run it BEFORE the migration script.

-- Drop functions first (they depend on tables/views)
DROP FUNCTION IF EXISTS get_pitcher_summary(INTEGER);
DROP FUNCTION IF EXISTS get_pitch_counts(INTEGER);
DROP FUNCTION IF EXISTS get_pitcher_velocity_trend(INTEGER);
DROP FUNCTION IF EXISTS get_similar_mlb_pitchers(NUMERIC, NUMERIC, INTEGER);
DROP FUNCTION IF EXISTS get_mlb_pitch_percentiles(TEXT[]);
DROP FUNCTION IF EXISTS get_pitcher_arsenal_stats(INTEGER);
DROP FUNCTION IF EXISTS refresh_materialized_view(TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS refresh_materialized_view(TEXT);
DROP FUNCTION IF EXISTS truncate_table(TEXT);
DROP FUNCTION IF EXISTS raw_query(TEXT, JSONB);

-- Drop materialized view
DROP MATERIALIZED VIEW IF EXISTS mv_pitcher_stats CASCADE;

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS mlb_pitches CASCADE;
DROP TABLE IF EXISTS user_pitches CASCADE;
DROP TABLE IF EXISTS user_pitchers CASCADE;

-- ============================================
-- After running this, run supabase-migration.sql
-- then run supabase-rpc-functions.sql
-- ============================================
