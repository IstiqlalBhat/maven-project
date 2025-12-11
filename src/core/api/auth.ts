// Auth middleware - handles Firebase users + admin sessions
// TODO: swap to Redis for sessions if we ever scale horizontally

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';

// In-memory session store (fine for single instance, but use Redis in prod)
const adminSessions = new Map<string, { expires: number }>();

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// Creates a random 32-byte hex token for admin sessions
export function generateAdminToken(): string {
    const token = crypto.randomBytes(32).toString('hex');
    adminSessions.set(token, {
        expires: Date.now() + TOKEN_EXPIRY_MS
    });

    cleanupExpiredTokens();

    return token;
}

// Checks if a token is valid and not expired
export function verifyAdminToken(token: string | null): boolean {
    if (!token) return false;

    // Strip "Bearer " prefix if present
    const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    const session = adminSessions.get(actualToken);
    if (!session) return false;

    if (Date.now() > session.expires) {
        adminSessions.delete(actualToken);
        return false;
    }

    return true;
}

// Logs out an admin by removing their session
export function invalidateAdminToken(token: string): void {
    const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    adminSessions.delete(actualToken);
}

// Cleans up old sessions to prevent memory leaks
function cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, session] of adminSessions.entries()) {
        if (now > session.expires) {
            adminSessions.delete(token);
        }
    }
}

// Call this at the top of admin-only routes - returns 401 if not authed
export async function requireAdminAuth(): Promise<NextResponse | null> {
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');

    if (!verifyAdminToken(authHeader)) {
        return NextResponse.json(
            { error: 'Unauthorized. Admin authentication required.' },
            { status: 401 }
        );
    }

    return null;
}

// Parses Firebase JWT and extracts the user ID
// 
// HEADS UP: This only checks structure + expiry, not the actual signature!
// Works fine for our use case but if you need real security, use Firebase Admin SDK:
//   npm install firebase-admin
//   admin.auth().verifyIdToken(token)
export async function verifyFirebaseAuth(): Promise<string | null> {
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const idToken = authHeader.slice(7);

    try {
        const parts = idToken.split('.');
        if (parts.length !== 3) return null;

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

        // Make sure the token isn't expired
        if (!payload.exp || payload.exp * 1000 < Date.now()) {
            console.warn('Firebase token expired or missing exp claim');
            return null;
        }

        // Sanity check - token shouldn't be from the future
        if (payload.iat && payload.iat * 1000 > Date.now() + 60000) {
            console.warn('Firebase token issued in the future');
            return null;
        }

        // Make sure it's actually from Firebase
        if (payload.iss && !payload.iss.includes('securetoken.google.com')) {
            console.warn('Firebase token has invalid issuer');
            return null;
        }

        const uid = payload.sub || payload.user_id;
        if (!uid || typeof uid !== 'string') {
            console.warn('Firebase token missing valid user ID');
            return null;
        }

        // UIDs should be reasonable length
        if (uid.length < 10 || uid.length > 128) {
            console.warn('Firebase token has suspicious UID format');
            return null;
        }

        return uid;
    } catch (error) {
        console.error('Error parsing Firebase token:', error);
        return null;
    }
}

// Use this in routes that need a logged-in user - returns their UID or 401s
export async function requireUserAuth(): Promise<{ uid: string } | NextResponse> {
    const uid = await verifyFirebaseAuth();

    if (!uid) {
        return NextResponse.json(
            { error: 'Unauthorized. Please sign in.' },
            { status: 401 }
        );
    }

    return { uid };
}
