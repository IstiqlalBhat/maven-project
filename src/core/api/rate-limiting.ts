// Simple in-memory rate limiter
// Good enough for single-instance, but swap to Redis if you go multi-node

import { NextResponse } from 'next/server';
import { RATE_LIMITS } from '@/shared/constants';

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// Tracks request counts per client (lives in memory, resets on restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
    windowMs?: number;      // how long before the counter resets
    maxRequests?: number;   // max hits allowed in that window
    keyPrefix?: string;     // helps separate different limiters
}

// Tries to figure out who the client is - checks proxy headers first
function getClientId(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }

    // No IP? Fall back to user-agent + origin combo
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const origin = request.headers.get('origin') || request.headers.get('referer') || 'local';
    return `local:${origin}:${userAgent.substring(0, 50)}`;
}

// Garbage collection - removes stale entries
function cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}

// Returns null if they're under the limit, 429 response if they're over
export function checkRateLimit(
    request: Request,
    options: RateLimitOptions = {}
): NextResponse | null {
    const opts = { ...RATE_LIMITS.DEFAULT, ...options };
    const clientId = getClientId(request);
    const key = `${opts.keyPrefix}:${clientId}`;
    const now = Date.now();

    // Clean up occasionally (1% of requests) to prevent memory bloat
    if (Math.random() < 0.01) {
        cleanupExpiredEntries();
    }

    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
        // First request or window expired - start fresh
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

// Factory for creating limiters with custom settings
export function createRateLimiter(options: RateLimitOptions) {
    return (request: Request) => checkRateLimit(request, options);
}

// Pre-built limiters for common scenarios:

// For login/auth - strict to prevent brute force (5/min)
export const authRateLimiter = createRateLimiter(RATE_LIMITS.AUTH);

// Normal API calls (100/min)
export const apiRateLimiter = createRateLimiter(RATE_LIMITS.API);

// Batch uploads like CSV import (50/min)
export const batchOperationRateLimiter = createRateLimiter(RATE_LIMITS.BATCH);

// Heavy stuff like DB seeding (3 per 5 min)
export const heavyOperationRateLimiter = createRateLimiter(RATE_LIMITS.HEAVY);

// AI chat - stricter to protect Gemini API (10/min)
export const aiRateLimiter = createRateLimiter(RATE_LIMITS.AI);
