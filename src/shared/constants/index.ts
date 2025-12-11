/**
 * Application-wide constants
 */

/**
 * Available pitch types
 */
export const PITCH_TYPES = [
    { value: 'Fastball', label: '4-Seam Fastball' },
    { value: 'Sinker', label: 'Sinker' },
    { value: 'Cutter', label: 'Cutter' },
    { value: 'Slider', label: 'Slider' },
    { value: 'Curveball', label: 'Curveball' },
    { value: 'Changeup', label: 'Changeup' },
    { value: 'Splitter', label: 'Splitter' },
    { value: 'Knuckleball', label: 'Knuckleball' },
] as const;

/**
 * Color schemes for different pitch types
 */
export const PITCH_TYPE_COLORS: Record<string, string> = {
    'fastball': 'from-red-400 to-red-500',
    'ff': 'from-red-400 to-red-500',
    'slider': 'from-blue-400 to-blue-500',
    'sl': 'from-blue-400 to-blue-500',
    'curve': 'from-green-400 to-green-500',
    'curveball': 'from-green-400 to-green-500',
    'cu': 'from-green-400 to-green-500',
    'change': 'from-purple-400 to-purple-500',
    'changeup': 'from-purple-400 to-purple-500',
    'ch': 'from-purple-400 to-purple-500',
    'sinker': 'from-orange-400 to-orange-500',
    'si': 'from-orange-400 to-orange-500',
    'default': 'from-amber-400 to-amber-500',
} as const;

/**
 * Icon emojis for different pitch types
 */
export const PITCH_TYPE_ICONS: Record<string, string> = {
    'fastball': '🔥',
    'ff': '🔥',
    'slider': '💨',
    'sl': '💨',
    'curve': '🌀',
    'curveball': '🌀',
    'cu': '🌀',
    'change': '🎯',
    'changeup': '🎯',
    'ch': '🎯',
    'sinker': '⬇️',
    'si': '⬇️',
    'default': '⚾',
} as const;

/**
 * Avatar color schemes (for consistent user avatars)
 */
export const AVATAR_COLORS = [
    'from-red-400 to-red-600',
    'from-blue-400 to-blue-600',
    'from-green-400 to-green-600',
    'from-purple-400 to-purple-600',
    'from-amber-400 to-amber-600',
] as const;

/**
 * Rate limit configurations
 */
export const RATE_LIMITS = {
    /** Authentication endpoints - 5 attempts per minute */
    AUTH: {
        windowMs: 60 * 1000,
        maxRequests: 5,
        keyPrefix: 'auth'
    },
    /** Standard API endpoints - 100 requests per minute */
    API: {
        windowMs: 60 * 1000,
        maxRequests: 100,
        keyPrefix: 'api'
    },
    /** Batch operations - 50 requests per minute */
    BATCH: {
        windowMs: 60 * 1000,
        maxRequests: 50,
        keyPrefix: 'batch'
    },
    /** Heavy operations (DB seeding) - 3 requests per 5 minutes */
    HEAVY: {
        windowMs: 5 * 60 * 1000,
        maxRequests: 3,
        keyPrefix: 'heavy'
    },
    /** Default rate limit - 60 requests per minute */
    DEFAULT: {
        windowMs: 60 * 1000,
        maxRequests: 60,
        keyPrefix: 'default'
    }
} as const;
