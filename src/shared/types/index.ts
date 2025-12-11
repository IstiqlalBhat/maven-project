/**
 * Shared TypeScript type definitions for the Maven project
 * These types are used across both frontend and backend
 */

/**
 * Represents a user's pitcher profile
 */
export interface UserPitcher {
    id: number;
    firebase_uid: string;
    name: string;
    age: number | null;
    throws: 'L' | 'R' | null;
    level: string | null;
    primary_pitch: string | null;
    created_at: Date;
}

/**
 * Represents a single pitch thrown by a user's pitcher
 */
export interface UserPitch {
    id: number;
    pitcher_id: number;
    pitch_type: string;
    velocity_mph: number | null;
    spin_rate: number | null;
    horizontal_break: number | null;
    vertical_break: number | null;
    date: string | null;
    notes: string | null;
    created_at: Date;
}

/**
 * Represents an MLB pitch from Statcast data
 */
export interface MLBPitch {
    id: number;
    pitcher_name: string;
    pitch_type: string;
    release_speed: number;
    release_spin_rate: number;
    pfx_x: number;
    pfx_z: number;
    game_date: string;
    p_throws: 'L' | 'R';
    created_at: Date;
}

/**
 * Data structure for creating/updating a pitch
 */
export interface PitchData {
    pitcher_id: number;
    pitch_type: string;
    velocity_mph: number | null;
    spin_rate: number | null;
    horizontal_break: number | null;
    vertical_break: number | null;
    date: string | null;
    notes: string | null;
}

/**
 * Minimal pitch data used for duplicate detection
 */
export interface PitchFingerprint {
    pitch_type: string;
    velocity_mph: number | null;
    spin_rate: number | null;
    horizontal_break: number | null;
    vertical_break: number | null;
    date: string | null;
}

/**
 * Result of checking for duplicate pitches
 */
export interface DuplicateCheckResult {
    hasDuplicates: boolean;
    duplicateCount: number;
    duplicateIndices: number[];
    uniquePitches: PitchFingerprint[];
    existingPitches: PitchFingerprint[];
}

/**
 * Result of validating pitch data
 */
export interface PitchValidationResult {
    valid: boolean;
    error?: string;
    data?: {
        pitch_type: string;
        velocity_mph: number | null;
        spin_rate: number | null;
        horizontal_break: number | null;
        vertical_break: number | null;
        date: string | null;
        notes: string | null;
    };
}
