/**
 * Environment configuration utilities
 * Provides type-safe access to environment variables
 */

export const ENV = {
    // Environment detection
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isLocal: !process.env.VERCEL,

    // Supabase configuration
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

    // Feature flags based on environment
    enableDebugLogs: process.env.NODE_ENV === 'development',
} as const;

/**
 * Get current environment name for logging
 */
export function getEnvironmentName(): string {
    if (ENV.isLocal && ENV.isDevelopment) return 'local-dev';
    if (ENV.isDevelopment) return 'development';
    if (ENV.isProduction) return 'production';
    return 'unknown';
}

/**
 * Log environment info on startup (dev only)
 */
export function logEnvironmentInfo(): void {
    if (ENV.enableDebugLogs) {
        console.log(`🔧 Environment: ${getEnvironmentName()}`);
        console.log(`📡 Supabase: ${ENV.supabaseUrl?.substring(0, 30)}...`);
    }
}
