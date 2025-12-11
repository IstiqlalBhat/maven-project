-- ============================================
-- RESET DATABASE (RUN THIS FIRST IF NEEDED)
-- ============================================
-- WARNING: This will DELETE ALL DATA. Only run if you want a fresh start.
-- Copy this into a SEPARATE query and run it BEFORE the migration script.

DROP MATERIALIZED VIEW IF EXISTS mv_pitcher_stats CASCADE;
DROP TABLE IF EXISTS mlb_pitches CASCADE;
DROP TABLE IF EXISTS user_pitches CASCADE;
DROP TABLE IF EXISTS user_pitchers CASCADE;
DROP FUNCTION IF EXISTS raw_query(text, jsonb);

-- After running this, run the supabase-migration.sql script.
