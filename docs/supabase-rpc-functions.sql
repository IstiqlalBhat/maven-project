-- ============================================
-- Specialized RPC Functions for Maven Chat Analytics
-- ============================================
-- Run this in Supabase SQL Editor AFTER supabase-migration.sql
-- These functions provide efficient server-side aggregations
-- for the AI chat's pitcher context building.
-- ============================================

-- ============================================
-- 1. GET PITCHER ARSENAL STATS
-- ============================================
-- Returns aggregated stats per pitch type for a specific pitcher
-- All calculations done in PostgreSQL for efficiency

CREATE OR REPLACE FUNCTION get_pitcher_arsenal_stats(p_pitcher_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    total_pitches INTEGER;
BEGIN
    -- Get total pitch count for percentage calculations
    SELECT COUNT(*) INTO total_pitches
    FROM user_pitches
    WHERE pitcher_id = p_pitcher_id;

    -- Return empty array if no pitches
    IF total_pitches = 0 THEN
        RETURN '[]'::JSONB;
    END IF;

    -- Aggregate stats per pitch type
    SELECT COALESCE(jsonb_agg(row_to_json(stats)), '[]'::JSONB)
    INTO result
    FROM (
        SELECT 
            pitch_type,
            COUNT(*) as pitch_count,
            ROUND((COUNT(*)::NUMERIC / total_pitches * 100), 1) as usage_pct,
            ROUND(AVG(velocity_mph)::NUMERIC, 1) as avg_velo,
            ROUND(MAX(velocity_mph)::NUMERIC, 1) as max_velo,
            ROUND(MIN(velocity_mph)::NUMERIC, 1) as min_velo,
            ROUND(COALESCE(STDDEV(velocity_mph), 0)::NUMERIC, 2) as velo_stddev,
            ROUND(AVG(spin_rate)::NUMERIC, 0) as avg_spin,
            ROUND(MAX(spin_rate)::NUMERIC, 0) as max_spin,
            ROUND(COALESCE(STDDEV(spin_rate), 0)::NUMERIC, 0) as spin_stddev,
            ROUND(AVG(ABS(horizontal_break))::NUMERIC, 1) as avg_h_break,
            ROUND(AVG(vertical_break)::NUMERIC, 1) as avg_v_break,
            MIN(date) as first_date,
            MAX(date) as last_date
        FROM user_pitches
        WHERE pitcher_id = p_pitcher_id
        GROUP BY pitch_type
        ORDER BY COUNT(*) DESC
    ) stats;

    RETURN result;
END;
$$;

-- ============================================
-- 2. GET MLB PITCH PERCENTILES
-- ============================================
-- Returns avg and stddev for MLB pitches by type
-- Uses ENTIRE MLB dataset for accurate percentiles

CREATE OR REPLACE FUNCTION get_mlb_pitch_percentiles(p_pitch_types TEXT[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_to_json(stats)), '[]'::JSONB)
    INTO result
    FROM (
        SELECT 
            pitch_type,
            ROUND(AVG(release_speed)::NUMERIC, 2) as avg_velo,
            ROUND(COALESCE(STDDEV(release_speed), 3)::NUMERIC, 2) as stddev_velo,
            ROUND(AVG(release_spin_rate)::NUMERIC, 0) as avg_spin,
            ROUND(COALESCE(STDDEV(release_spin_rate), 200)::NUMERIC, 0) as stddev_spin,
            COUNT(*) as sample_size
        FROM mlb_pitches
        WHERE pitch_type = ANY(p_pitch_types)
          AND release_speed IS NOT NULL
          AND release_spin_rate IS NOT NULL
        GROUP BY pitch_type
    ) stats;

    RETURN result;
END;
$$;

-- ============================================
-- 3. GET SIMILAR MLB PITCHERS
-- ============================================
-- Finds top 3 MLB pitchers with similar velocity/spin profiles
-- Uses pre-computed materialized view for performance

CREATE OR REPLACE FUNCTION get_similar_mlb_pitchers(
    p_avg_velo NUMERIC,
    p_avg_spin NUMERIC,
    p_limit INTEGER DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_to_json(pitchers)), '[]'::JSONB)
    INTO result
    FROM (
        SELECT 
            pitcher_name,
            ROUND(avg_velo::NUMERIC, 1) as avg_velo,
            ROUND(avg_spin::NUMERIC, 0) as avg_spin,
            pitch_count,
            -- Similarity score: 100 minus weighted distance
            ROUND((100 - SQRT(
                POWER((avg_velo - p_avg_velo) / 10, 2) + 
                POWER((avg_spin - p_avg_spin) / 500, 2)
            ) * 20)::NUMERIC, 0) as similarity_pct
        FROM mv_pitcher_stats
        WHERE avg_velo IS NOT NULL AND avg_spin IS NOT NULL
        ORDER BY SQRT(
            POWER((avg_velo - p_avg_velo) / 10, 2) + 
            POWER((avg_spin - p_avg_spin) / 500, 2)
        ) ASC
        LIMIT p_limit
    ) pitchers;

    RETURN result;
END;
$$;

-- ============================================
-- 4. GET RECENT VELOCITY TREND
-- ============================================
-- Returns velocity trend (recent 10 vs overall) per pitch type

CREATE OR REPLACE FUNCTION get_pitcher_velocity_trend(p_pitcher_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    WITH recent AS (
        SELECT pitch_type, AVG(velocity_mph) as recent_velo
        FROM (
            SELECT * FROM user_pitches 
            WHERE pitcher_id = p_pitcher_id 
            ORDER BY date DESC NULLS LAST, id DESC 
            LIMIT 10
        ) r
        GROUP BY pitch_type
    ),
    overall AS (
        SELECT pitch_type, AVG(velocity_mph) as overall_velo
        FROM user_pitches WHERE pitcher_id = p_pitcher_id
        GROUP BY pitch_type
    )
    SELECT COALESCE(jsonb_agg(row_to_json(trends)), '[]'::JSONB)
    INTO result
    FROM (
        SELECT 
            o.pitch_type,
            ROUND((COALESCE(r.recent_velo, o.overall_velo) - o.overall_velo)::NUMERIC, 1) as velo_trend
        FROM overall o
        LEFT JOIN recent r ON o.pitch_type = r.pitch_type
    ) trends;

    RETURN result;
END;
$$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION get_pitcher_arsenal_stats(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_mlb_pitch_percentiles(TEXT[]) TO service_role;
GRANT EXECUTE ON FUNCTION get_similar_mlb_pitchers(NUMERIC, NUMERIC, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_pitcher_velocity_trend(INTEGER) TO service_role;

-- Also grant to authenticated users (for potential direct usage)
GRANT EXECUTE ON FUNCTION get_pitcher_arsenal_stats(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mlb_pitch_percentiles(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_similar_mlb_pitchers(NUMERIC, NUMERIC, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pitcher_velocity_trend(INTEGER) TO authenticated;

-- ============================================
-- DONE!
-- ============================================
-- After running this script, the chat API will use these
-- efficient server-side functions instead of JavaScript calculations.
