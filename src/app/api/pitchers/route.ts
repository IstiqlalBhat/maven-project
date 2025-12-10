import { NextResponse } from 'next/server';
import { query } from '@/lib/postgres';
import { requireUserAuth } from '@/lib/auth-middleware';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { sanitizeString } from '@/lib/validation';

// GET /api/pitchers - List all pitcher profiles for the authenticated user
export async function GET(request: Request) {
    // Rate limiting
    const rateLimitResponse = apiRateLimiter(request);
    if (rateLimitResponse) {
        return rateLimitResponse;
    }

    // Require user authentication
    const authResult = await requireUserAuth();
    if (authResult instanceof NextResponse) {
        return authResult;
    }
    const { uid } = authResult;

    try {
        const result = await query(
            'SELECT * FROM user_pitchers WHERE firebase_uid = $1 OR firebase_uid IS NULL ORDER BY created_at DESC',
            [uid]
        );
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching pitchers:', error);
        return NextResponse.json({ error: 'Failed to fetch pitchers' }, { status: 500 });
    }
}

// POST /api/pitchers - Create a new pitcher profile
export async function POST(request: Request) {
    // Rate limiting
    const rateLimitResponse = apiRateLimiter(request);
    if (rateLimitResponse) {
        return rateLimitResponse;
    }

    // Require user authentication
    const authResult = await requireUserAuth();
    if (authResult instanceof NextResponse) {
        return authResult;
    }
    const { uid } = authResult;

    try {
        const body = await request.json();
        const { name, age, throws: throwsHand, level, primary_pitch } = body;

        // Input validation
        if (!name || typeof name !== 'string') {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const sanitizedName = sanitizeString(name, 100);
        if (!sanitizedName) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        if (sanitizedName.length > 100) {
            return NextResponse.json({ error: 'Name must be 100 characters or less' }, { status: 400 });
        }
        if (throwsHand && !['L', 'R'].includes(throwsHand)) {
            return NextResponse.json({ error: 'Throws must be "L" or "R"' }, { status: 400 });
        }
        if (age !== undefined && age !== null && (typeof age !== 'number' || age < 1 || age > 100)) {
            return NextResponse.json({ error: 'Age must be a number between 1 and 100' }, { status: 400 });
        }

        const sanitizedLevel = sanitizeString(level, 50);
        if (level && sanitizedLevel && sanitizedLevel.length > 50) {
            return NextResponse.json({ error: 'Level must be 50 characters or less' }, { status: 400 });
        }

        const result = await query(
            `INSERT INTO user_pitchers (firebase_uid, name, age, throws, level, primary_pitch)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [uid, sanitizedName, age || null, throwsHand || null, sanitizedLevel || null, sanitizeString(primary_pitch, 50) || null]
        );

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('Error creating pitcher:', error);
        return NextResponse.json({ error: 'Failed to create pitcher' }, { status: 500 });
    }
}
