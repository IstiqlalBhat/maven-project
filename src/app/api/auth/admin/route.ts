import { NextResponse } from 'next/server';
import { generateAdminToken } from '@/lib/auth-middleware';
import { authRateLimiter } from '@/lib/rate-limiter';

export async function POST(request: Request) {
    // Rate limiting - 5 attempts per minute
    const rateLimitResponse = authRateLimiter(request);
    if (rateLimitResponse) {
        return rateLimitResponse;
    }

    try {
        const body = await request.json();
        const { password } = body;

        // Compare with environment variable
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminPassword) {
            console.error('ADMIN_PASSWORD environment variable is not set');
            return NextResponse.json(
                { success: false, message: 'Server configuration error' },
                { status: 500 }
            );
        }

        // Constant-time comparison to prevent timing attacks
        const passwordMatch = password && password.length === adminPassword.length &&
            crypto.subtle !== undefined
            ? await constantTimeCompare(password, adminPassword)
            : password === adminPassword;

        if (passwordMatch) {
            // Generate a secure session token
            const token = generateAdminToken();

            return NextResponse.json({
                success: true,
                token: token,
                expiresIn: 3600 // 1 hour in seconds
            });
        } else {
            // Generic error message to prevent enumeration
            return NextResponse.json(
                { success: false, message: 'Invalid credentials' },
                { status: 401 }
            );
        }
    } catch {
        return NextResponse.json(
            { success: false, message: 'An error occurred' },
            { status: 500 }
        );
    }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
async function constantTimeCompare(a: string, b: string): Promise<boolean> {
    if (a.length !== b.length) return false;

    const encoder = new TextEncoder();
    const aBytes = encoder.encode(a);
    const bBytes = encoder.encode(b);

    let result = 0;
    for (let i = 0; i < aBytes.length; i++) {
        result |= aBytes[i] ^ bBytes[i];
    }

    return result === 0;
}
