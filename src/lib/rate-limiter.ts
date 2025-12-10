import { NextResponse } from 'next/server';

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// In-memory store for rate limiting
// In production, consider using Redis for distributed rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
    windowMs?: number;      // Time window in milliseconds
    maxRequests?: number;   // Max requests per window
    keyPrefix?: string;     // Prefix for the rate limit key
}

const DEFAULT_OPTIONS: Required<RateLimitOptions> = {
    windowMs: 60 * 1000,    // 1 minute
    maxRequests: 10,        // 10 requests per minute
    keyPrefix: 'default'
};

/**
 * Get client identifier from request
 * Uses X-Forwarded-For header or falls back to a generic key
 */
function getClientId(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }

    // Fallback - in development this will group all requests
    return 'unknown-client';
}

/**
 * Clean up expired entries periodically
 */
function cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}

/**
 * Check rate limit for a request
 * Returns null if within limits, or an error response if exceeded
 */
export function checkRateLimit(
    request: Request,
    options: RateLimitOptions = {}
): NextResponse | null {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const clientId = getClientId(request);
    const key = `${opts.keyPrefix}:${clientId}`;
    const now = Date.now();

    // Clean up periodically (1% chance per request)
    if (Math.random() < 0.01) {
        cleanupExpiredEntries();
    }

    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
        // Create new entry or reset expired one
        entry = {
            count: 1,
            resetTime: now + opts.windowMs
        };
        rateLimitStore.set(key, entry);
        return null;
    }

    entry.count++;

    if (entry.count > opts.maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

        return NextResponse.json(
            {
                error: 'Too many requests. Please try again later.',
                retryAfter: retryAfter
            },
            {
                status: 429,
                headers: {
                    'Retry-After': String(retryAfter),
                    'X-RateLimit-Limit': String(opts.maxRequests),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': String(Math.ceil(entry.resetTime / 1000))
                }
            }
        );
    }

    return null;
}

/**
 * Create a rate limiter with custom options
 */
export function createRateLimiter(options: RateLimitOptions) {
    return (request: Request) => checkRateLimit(request, options);
}

// Pre-configured rate limiters for common use cases

/**
 * Strict rate limiter for authentication endpoints
 * 5 attempts per minute
 */
export const authRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'auth'
});

/**
 * Standard API rate limiter
 * 100 requests per minute
 */
export const apiRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyPrefix: 'api'
});

/**
 * Heavy operation rate limiter (for database seeding, etc.)
 * 3 requests per 5 minutes
 */
export const heavyOperationRateLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000,
    maxRequests: 3,
    keyPrefix: 'heavy'
});
