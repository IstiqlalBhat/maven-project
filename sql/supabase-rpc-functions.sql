-- ============================================
-- Specialized RPC Functions for Maven Chat Analytics
-- ============================================
-- Run this in Supabase SQL Editor AFTER supabase-migration.sql
-- These functions provide efficient server-side aggregations
-- for the AI chat's pitcher context building.
-- ============================================
-- OPTIMIZATIONS APPLIED:
-- 1. Single-pass queries instead of multiple roundtrips
-- 2. Avoid duplicate calculations (SQRT, etc.)
-- 3. Use window functions for efficient recent-vs-overall comparisons
-- 4. STABLE/IMMUTABLE hints for query caching
-- 5. Optimized for the indexes defined in migration.sql
-- ============================================

-- ============================================
-- 1. GET PITCHER ARSENAL STATS (OPTIMIZED)
-- ============================================
-- Returns aggregated stats per pitch type for a specific pitcher
-- OPTIMIZATION: Single-pass query using window function for total count

CREATE OR REPLACE FUNCTION get_pitcher_arsenal_stats(p_pitcher_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
STABLE  -- Function result is stable within a transaction (enables caching)
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Single-pass aggregation with window function for total count
    SELECT COALESCE(jsonb_agg(stats ORDER BY pitch_count DESC), '[]'::JSONB)
    INTO result
    FROM (
        SELECT 
            pitch_type,
            COUNT(*) as pitch_count,
            -- Calculate usage % using window function (single scan)
            ROUND((COUNT(*)::NUMERIC / SUM(COUNT(*)) OVER () * 100), 1) as usage_pct,
            -- Velocity stats
            ROUND(AVG(velocity_mph)::NUMERIC, 1) as avg_velo,
            ROUND(MAX(velocity_mph)::NUMERIC, 1) as max_velo,
            ROUND(MIN(velocity_mph)::NUMERIC, 1) as min_velo,
            ROUND(COALESCE(STDDEV_SAMP(velocity_mph), 0)::NUMERIC, 2) as velo_stddev,
            -- Spin stats
            ROUND(AVG(spin_rate)::NUMERIC, 0) as avg_spin,
            ROUND(MAX(spin_rate)::NUMERIC, 0) as max_spin,
            ROUND(COALESCE(STDDEV_SAMP(spin_rate), 0)::NUMERIC, 0) as spin_stddev,
            -- Movement stats
            ROUND(AVG(ABS(horizontal_break))::NUMERIC, 1) as avg_h_break,
            ROUND(AVG(vertical_break)::NUMERIC, 1) as avg_v_break,
            -- Date range
            MIN(date) as first_date,
            MAX(date) as last_date
        FROM user_pitches
        WHERE pitcher_id = p_pitcher_id
        GROUP BY pitch_type
    ) stats;

    RETURN COALESCE(result, '[]'::JSONB);
END;
$$;

-- ============================================
-- 2. GET MLB PITCH PERCENTILES (OPTIMIZED)
-- ============================================
-- Returns avg and stddev for MLB pitches by type
-- OPTIMIZATION: Uses partial index (excludes NULLs at index level)

CREATE OR REPLACE FUNCTION get_mlb_pitch_percentiles(p_pitch_types TEXT[])
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Query optimized for idx_mlb_pitches_percentile partial index
    SELECT COALESCE(jsonb_agg(stats), '[]'::JSONB)
    INTO result
    FROM (
        SELECT 
            pitch_type,
            ROUND(AVG(release_speed)::NUMERIC, 2) as avg_velo,
            ROUND(COALESCE(STDDEV_SAMP(release_speed), 3)::NUMERIC, 2) as stddev_velo,
            ROUND(AVG(release_spin_rate)::NUMERIC, 0) as avg_spin,
            ROUND(COALESCE(STDDEV_SAMP(release_spin_rate), 200)::NUMERIC, 0) as stddev_spin,
            COUNT(*) as sample_size
        FROM mlb_pitches
        WHERE pitch_type = ANY(p_pitch_types)
          AND release_speed IS NOT NULL  -- Matches partial index condition
          AND release_spin_rate IS NOT NULL
        GROUP BY pitch_type
    ) stats;

    RETURN COALESCE(result, '[]'::JSONB);
END;
$$;

-- ============================================
-- 3. GET SIMILAR MLB PITCHERS (OPTIMIZED)
-- ============================================
-- Finds top N MLB pitchers with similar velocity/spin profiles
-- OPTIMIZATION: Calculate distance once, use pre-normalized values from materialized view

CREATE OR REPLACE FUNCTION get_similar_mlb_pitchers(
    p_avg_velo NUMERIC,
    p_avg_spin NUMERIC,
    p_limit INTEGER DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    norm_input_velo NUMERIC := p_avg_velo / 10.0;
    norm_input_spin NUMERIC := p_avg_spin / 500.0;
BEGIN
    -- Use pre-normalized values from materialized view
    -- Calculate distance ONCE and reuse via subquery
    SELECT COALESCE(jsonb_agg(pitchers), '[]'::JSONB)
    INTO result
    FROM (
        SELECT 
            pitcher_name,
            ROUND(avg_velo::NUMERIC, 1) as avg_velo,
            ROUND(avg_spin::NUMERIC, 0) as avg_spin,
            pitch_count,
            -- Similarity score from pre-calculated distance
            ROUND((100 - distance * 20)::NUMERIC, 0) as similarity_pct
        FROM (
            SELECT 
                pitcher_name,
                avg_velo,
                avg_spin,
                pitch_count,
                -- Calculate distance ONCE using pre-normalized values
                SQRT(
                    POWER(norm_velo - norm_input_velo, 2) + 
                    POWER(norm_spin - norm_input_spin, 2)
                ) as distance
            FROM mv_pitcher_stats
            WHERE avg_velo IS NOT NULL AND avg_spin IS NOT NULL
        ) with_distance
        ORDER BY distance ASC
        LIMIT p_limit
    ) pitchers;

    RETURN COALESCE(result, '[]'::JSONB);
END;
$$;

-- ============================================
-- 4. GET RECENT VELOCITY TREND (OPTIMIZED)
-- ============================================
-- Returns velocity trend (recent 10 vs overall) per pitch type
-- OPTIMIZATION: Use window functions instead of self-join, single table scan

CREATE OR REPLACE FUNCTION get_pitcher_velocity_trend(p_pitcher_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Single-pass using window functions
    SELECT COALESCE(jsonb_agg(trends), '[]'::JSONB)
    INTO result
    FROM (
        WITH ranked_pitches AS (
            SELECT 
                pitch_type,
                velocity_mph,
                -- Rank pitches by recency within each pitch type
                ROW_NUMBER() OVER (
                    PARTITION BY pitch_type 
                    ORDER BY date DESC NULLS LAST, id DESC
                ) as rn
            FROM user_pitches
            WHERE pitcher_id = p_pitcher_id
              AND velocity_mph IS NOT NULL
        )
        SELECT 
            pitch_type,
            ROUND((
                AVG(CASE WHEN rn <= 10 THEN velocity_mph END) - 
                AVG(velocity_mph)
            )::NUMERIC, 1) as velo_trend
        FROM ranked_pitches
        GROUP BY pitch_type
        HAVING COUNT(CASE WHEN rn <= 10 THEN 1 END) > 0
    ) trends;

    RETURN COALESCE(result, '[]'::JSONB);
END;
$$;

-- ============================================
-- 5. GET PITCHER SUMMARY (NEW - COMBINED QUERY)
-- ============================================
-- Returns complete pitcher context in ONE database call
-- OPTIMIZATION: Combines multiple queries into single call for chat context

CREATE OR REPLACE FUNCTION get_pitcher_summary(p_pitcher_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    arsenal_stats JSONB;
    velocity_trend JSONB;
    pitcher_info JSONB;
    overall_avg_velo NUMERIC;
    overall_avg_spin NUMERIC;
    similar_pitchers JSONB;
BEGIN
    -- 1. Get pitcher basic info
    SELECT to_jsonb(p) INTO pitcher_info
    FROM (
        SELECT name, age, throws, level, primary_pitch
        FROM user_pitchers WHERE id = p_pitcher_id
    ) p;

    -- Return early if pitcher not found
    IF pitcher_info IS NULL THEN
        RETURN jsonb_build_object('error', 'Pitcher not found');
    END IF;

    -- 2. Get arsenal stats (reuse existing function)
    SELECT get_pitcher_arsenal_stats(p_pitcher_id) INTO arsenal_stats;

    -- 3. Get velocity trends
    SELECT get_pitcher_velocity_trend(p_pitcher_id) INTO velocity_trend;

    -- 4. Calculate overall averages for similarity lookup
    SELECT 
        AVG(velocity_mph),
        AVG(spin_rate)
    INTO overall_avg_velo, overall_avg_spin
    FROM user_pitches
    WHERE pitcher_id = p_pitcher_id
      AND velocity_mph IS NOT NULL
      AND spin_rate IS NOT NULL;

    -- 5. Find similar MLB pitchers (if we have data)
    IF overall_avg_velo IS NOT NULL AND overall_avg_spin IS NOT NULL THEN
        SELECT get_similar_mlb_pitchers(overall_avg_velo, overall_avg_spin, 3)
        INTO similar_pitchers;
    ELSE
        similar_pitchers := '[]'::JSONB;
    END IF;

    -- Return combined result
    RETURN jsonb_build_object(
        'pitcher', pitcher_info,
        'arsenal', arsenal_stats,
        'velocity_trend', velocity_trend,
        'similar_pitchers', similar_pitchers,
        'overall_avg_velo', ROUND(overall_avg_velo::NUMERIC, 1),
        'overall_avg_spin', ROUND(overall_avg_spin::NUMERIC, 0)
    );
END;
$$;

-- ============================================
-- 6. GET PITCH COUNTS BY TYPE (LIGHTWEIGHT)
-- ============================================
-- Fast count-only query for UI badges/quick stats

CREATE OR REPLACE FUNCTION get_pitch_counts(p_pitcher_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_object_agg(pitch_type, cnt), '{}'::JSONB)
        FROM (
            SELECT pitch_type, COUNT(*) as cnt
            FROM user_pitches
            WHERE pitcher_id = p_pitcher_id
            GROUP BY pitch_type
        ) counts
    );
END;
$$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
-- Service role (for API routes)
GRANT EXECUTE ON FUNCTION get_pitcher_arsenal_stats(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_mlb_pitch_percentiles(TEXT[]) TO service_role;
GRANT EXECUTE ON FUNCTION get_similar_mlb_pitchers(NUMERIC, NUMERIC, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_pitcher_velocity_trend(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_pitcher_summary(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_pitch_counts(INTEGER) TO service_role;

-- Authenticated users (for potential direct usage)
GRANT EXECUTE ON FUNCTION get_pitcher_arsenal_stats(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mlb_pitch_percentiles(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_similar_mlb_pitchers(NUMERIC, NUMERIC, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pitcher_velocity_trend(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pitcher_summary(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pitch_counts(INTEGER) TO authenticated;

-- ============================================
-- DONE!
-- ============================================
-- Performance improvements summary:
-- 1. get_pitcher_arsenal_stats: Single-pass with window function (was 2 queries)
-- 2. get_mlb_pitch_percentiles: Optimized for partial index
-- 3. get_similar_mlb_pitchers: Pre-normalized values, single distance calc
-- 4. get_pitcher_velocity_trend: Window functions instead of self-join
-- 5. NEW: get_pitcher_summary combines 4 queries into 1 RPC call
-- 6. NEW: get_pitch_counts for lightweight count operations
-- 7. STABLE hints enable PostgreSQL query caching within transactions
