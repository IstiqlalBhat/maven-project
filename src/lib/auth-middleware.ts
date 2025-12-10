import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';

// Admin session tokens (in production, use Redis or database)
const adminSessions = new Map<string, { expires: number }>();

// Token expiration time (1 hour)
const TOKEN_EXPIRY_MS = 60 * 60 * 1000;

/**
 * Generate a secure admin session token
 */
export function generateAdminToken(): string {
    const token = crypto.randomBytes(32).toString('hex');
    adminSessions.set(token, {
        expires: Date.now() + TOKEN_EXPIRY_MS
    });

    // Clean up expired tokens periodically
    cleanupExpiredTokens();

    return token;
}

/**
 * Verify an admin session token
 */
export function verifyAdminToken(token: string | null): boolean {
    if (!token) return false;

    // Check for Bearer token format
    const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    const session = adminSessions.get(actualToken);
    if (!session) return false;

    if (Date.now() > session.expires) {
        adminSessions.delete(actualToken);
        return false;
    }

    return true;
}

/**
 * Invalidate an admin session token
 */
export function invalidateAdminToken(token: string): void {
    const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    adminSessions.delete(actualToken);
}

/**
 * Clean up expired tokens
 */
function cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, session] of adminSessions.entries()) {
        if (now > session.expires) {
            adminSessions.delete(token);
        }
    }
}

/**
 * Middleware helper to require admin authentication
 * Returns null if authenticated, or an error response if not
 */
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

/**
 * Verify Firebase ID token from Authorization header
 * Returns the Firebase UID if valid, null otherwise
 */
export async function verifyFirebaseAuth(): Promise<string | null> {
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const idToken = authHeader.slice(7);

    try {
        // For client-side Firebase Auth, we verify the token structure
        // In production with Firebase Admin SDK, you would use:
        // const decodedToken = await admin.auth().verifyIdToken(idToken);
        // return decodedToken.uid;

        // Parse the JWT to extract the UID (basic validation)
        // Note: This is a simplified check. For production, use Firebase Admin SDK
        const parts = idToken.split('.');
        if (parts.length !== 3) return null;

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

        // Check expiration
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            return null;
        }

        // Return the user ID (sub claim in Firebase tokens)
        return payload.sub || payload.user_id || null;
    } catch {
        return null;
    }
}

/**
 * Middleware helper to require user authentication
 * Returns the Firebase UID if authenticated, or an error response if not
 */
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
