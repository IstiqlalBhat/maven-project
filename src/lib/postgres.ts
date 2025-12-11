/**
 * @deprecated Import from '@/core/database' instead
 * This file provides backwards compatibility during migration
 */

export * from '../core/database';

// Re-export types for backwards compatibility
export type {
    UserPitcher,
    UserPitch,
    MLBPitch,
    PitchFingerprint,
    DuplicateCheckResult
} from '../shared/types';
