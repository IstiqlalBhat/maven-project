-- ============================================
-- Supabase Schema Migration for Maven Project
-- ============================================
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
-- ============================================
-- This script is IDEMPOTENT - safe to run multiple times.
-- If you want a FRESH START, run reset-database.sql first.
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USER PITCHERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_pitchers (
  id SERIAL PRIMARY KEY,
  firebase_uid VARCHAR(128) NOT NULL,
  name VARCHAR(100) NOT NULL,
  age INTEGER,
  throws VARCHAR(1) CHECK(throws IN ('L', 'R')),
  level VARCHAR(50),
  primary_pitch VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_pitchers_firebase_uid ON user_pitchers(firebase_uid);

ALTER TABLE user_pitchers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_pitchers (using auth.uid()::text for Firebase UID comparison)
DROP POLICY IF EXISTS "Users view own pitchers" ON user_pitchers;
CREATE POLICY "Users view own pitchers" ON user_pitchers
  FOR SELECT USING (firebase_uid = auth.uid()::text);

DROP POLICY IF EXISTS "Users insert own pitchers" ON user_pitchers;
CREATE POLICY "Users insert own pitchers" ON user_pitchers
  FOR INSERT WITH CHECK (firebase_uid = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own pitchers" ON user_pitchers;
CREATE POLICY "Users update own pitchers" ON user_pitchers
  FOR UPDATE USING (firebase_uid = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own pitchers" ON user_pitchers;
CREATE POLICY "Users delete own pitchers" ON user_pitchers
  FOR DELETE USING (firebase_uid = auth.uid()::text);

-- ============================================
-- USER PITCHES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_pitches (
  id SERIAL PRIMARY KEY,
  pitcher_id INTEGER REFERENCES user_pitchers(id) ON DELETE CASCADE,
  pitch_type VARCHAR(50) NOT NULL,
  velocity_mph REAL,
  spin_rate INTEGER,
  horizontal_break REAL,
  vertical_break REAL,
  date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_pitches_pitcher_date ON user_pitches(pitcher_id, date);

ALTER TABLE user_pitches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_pitches (check ownership via pitcher's firebase_uid)
DROP POLICY IF EXISTS "Users view own pitches" ON user_pitches;
CREATE POLICY "Users view own pitches" ON user_pitches
  FOR SELECT USING (
    pitcher_id IN (SELECT id FROM user_pitchers WHERE firebase_uid = auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users insert own pitches" ON user_pitches;
CREATE POLICY "Users insert own pitches" ON user_pitches
  FOR INSERT WITH CHECK (
    pitcher_id IN (SELECT id FROM user_pitchers WHERE firebase_uid = auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users update own pitches" ON user_pitches;
CREATE POLICY "Users update own pitches" ON user_pitches
  FOR UPDATE USING (
    pitcher_id IN (SELECT id FROM user_pitchers WHERE firebase_uid = auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users delete own pitches" ON user_pitches;
CREATE POLICY "Users delete own pitches" ON user_pitches
  FOR DELETE USING (
    pitcher_id IN (SELECT id FROM user_pitchers WHERE firebase_uid = auth.uid()::text)
  );

-- ============================================
-- MLB PITCHES TABLE (Reference Data)
-- ============================================
CREATE TABLE IF NOT EXISTS mlb_pitches (
  id SERIAL PRIMARY KEY,
  pitcher_name VARCHAR(100) NOT NULL,
  pitch_type VARCHAR(10) NOT NULL,
  release_speed REAL,
  release_spin_rate INTEGER,
  pfx_x REAL,
  pfx_z REAL,
  game_date DATE,
  p_throws VARCHAR(1),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mlb_pitches_type_stats ON mlb_pitches(pitch_type, release_speed, release_spin_rate);
CREATE INDEX IF NOT EXISTS idx_mlb_pitches_pitcher_date ON mlb_pitches(pitcher_name, game_date);
CREATE INDEX IF NOT EXISTS idx_mlb_pitches_date ON mlb_pitches(game_date);

ALTER TABLE mlb_pitches ENABLE ROW LEVEL SECURITY;

-- Public read access for MLB data (no auth required for SELECT)
DROP POLICY IF EXISTS "Anyone can view MLB data" ON mlb_pitches;
CREATE POLICY "Anyone can view MLB data" ON mlb_pitches
  FOR SELECT USING (true);

-- Service role can insert/update/delete (for seeding)
DROP POLICY IF EXISTS "Service role can manage MLB data" ON mlb_pitches;
CREATE POLICY "Service role can manage MLB data" ON mlb_pitches
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- MATERIALIZED VIEW FOR PITCHER STATS
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_pitcher_stats AS
SELECT 
  pitcher_name,
  AVG(release_speed) as avg_velo,
  AVG(release_spin_rate) as avg_spin,
  COUNT(*) as pitch_count
FROM mlb_pitches
WHERE release_speed IS NOT NULL AND release_spin_rate IS NOT NULL
GROUP BY pitcher_name
HAVING COUNT(*) >= 10;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_pitcher_stats_name ON mv_pitcher_stats(pitcher_name);
CREATE INDEX IF NOT EXISTS idx_mv_pitcher_stats_velo ON mv_pitcher_stats(avg_velo);
CREATE INDEX IF NOT EXISTS idx_mv_pitcher_stats_spin ON mv_pitcher_stats(avg_spin);

-- ============================================
-- RPC FUNCTIONS FOR DATABASE OPERATIONS
-- ============================================

-- Function to refresh materialized views (callable from JS client)
CREATE OR REPLACE FUNCTION refresh_materialized_view(view_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF view_name = 'mv_pitcher_stats' THEN
    REFRESH MATERIALIZED VIEW mv_pitcher_stats;
  ELSE
    RAISE EXCEPTION 'Unknown materialized view: %', view_name;
  END IF;
END;
$$;

-- Function to truncate tables (callable from JS client)
CREATE OR REPLACE FUNCTION truncate_table(table_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF table_name = 'mlb_pitches' THEN
    TRUNCATE TABLE mlb_pitches RESTART IDENTITY;
  ELSE
    RAISE EXCEPTION 'Unknown or protected table: %', table_name;
  END IF;
END;
$$;

-- Function to execute raw SQL queries (for complex aggregations)
-- WARNING: This is powerful - only callable by service_role
CREATE OR REPLACE FUNCTION raw_query(query_text TEXT, query_params JSONB DEFAULT '[]'::JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Execute the query and return results as JSON
    EXECUTE format('SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (%s) t', query_text)
    INTO result;
    RETURN result;
END;
$$;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION refresh_materialized_view(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION truncate_table(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION raw_query(TEXT, JSONB) TO service_role;

-- ============================================
-- DONE!
-- ============================================
-- After running this script:
-- 1. Ensure your .env has SUPABASE_SERVICE_ROLE_KEY set correctly
-- 2. Run docs/supabase-rpc-functions.sql for AI chat analytics functions
-- 3. Restart your dev server (npm run dev)
-- 4. Use the Admin page to seed MLB data
-- 5. The materialized view will be refreshed automatically after seeding

