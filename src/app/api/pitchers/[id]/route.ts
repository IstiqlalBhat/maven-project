import { NextResponse } from 'next/server';
import { query } from '@/lib/postgres';
import { requireUserAuth } from '@/lib/auth-middleware';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { parseIdParam, sanitizeString } from '@/lib/validation';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * Verify that the authenticated user owns the specified pitcher
 */
async function verifyPitcherOwnership(pitcherId: number, uid: string): Promise<boolean> {
    const result = await query(
        'SELECT id FROM user_pitchers WHERE id = $1 AND firebase_uid = $2',
        [pitcherId, uid]
    );
    return result.rows.length > 0;
}

// GET /api/pitchers/[id] - Get a single pitcher
export async function GET(request: Request, { params }: RouteParams) {
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
        const { id } = await params;

        // Validate ID
        const pitcherId = parseIdParam(id);
        if (pitcherId instanceof NextResponse) {
            return pitcherId;
        }

        // Verify ownership
        const isOwner = await verifyPitcherOwnership(pitcherId, uid);
        if (!isOwner) {
            return NextResponse.json({ error: 'Pitcher not found' }, { status: 404 });
        }

        const result = await query(
            'SELECT * FROM user_pitchers WHERE id = $1',
            [pitcherId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Pitcher not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching pitcher:', error);
        return NextResponse.json({ error: 'Failed to fetch pitcher' }, { status: 500 });
    }
}

// PUT /api/pitchers/[id] - Update a pitcher
export async function PUT(request: Request, { params }: RouteParams) {
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
        const { id } = await params;

        // Validate ID
        const pitcherId = parseIdParam(id);
        if (pitcherId instanceof NextResponse) {
            return pitcherId;
        }

        // Verify ownership
        const isOwner = await verifyPitcherOwnership(pitcherId, uid);
        if (!isOwner) {
            return NextResponse.json({ error: 'Pitcher not found' }, { status: 404 });
        }

        const body = await request.json();
        const { name, age, throws: throwsHand, level, primary_pitch } = body;

        // Validate and sanitize inputs
        const sanitizedName = name ? sanitizeString(name, 100) : null;
        const sanitizedLevel = level ? sanitizeString(level, 50) : null;
        const sanitizedPrimaryPitch = primary_pitch ? sanitizeString(primary_pitch, 50) : null;

        const result = await query(
            `UPDATE user_pitchers
       SET name = COALESCE($1, name),
           age = COALESCE($2, age),
           throws = COALESCE($3, throws),
           level = COALESCE($4, level),
           primary_pitch = COALESCE($5, primary_pitch)
       WHERE id = $6
       RETURNING *`,
            [sanitizedName, age, throwsHand, sanitizedLevel, sanitizedPrimaryPitch, pitcherId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Pitcher not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating pitcher:', error);
        return NextResponse.json({ error: 'Failed to update pitcher' }, { status: 500 });
    }
}

// DELETE /api/pitchers/[id] - Delete a pitcher and their pitches
export async function DELETE(request: Request, { params }: RouteParams) {
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
        const { id } = await params;

        // Validate ID
        const pitcherId = parseIdParam(id);
        if (pitcherId instanceof NextResponse) {
            return pitcherId;
        }

        // Verify ownership
        const isOwner = await verifyPitcherOwnership(pitcherId, uid);
        if (!isOwner) {
            return NextResponse.json({ error: 'Pitcher not found' }, { status: 404 });
        }

        // Pitches are deleted automatically via ON DELETE CASCADE
        await query('DELETE FROM user_pitchers WHERE id = $1', [pitcherId]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting pitcher:', error);
        return NextResponse.json({ error: 'Failed to delete pitcher' }, { status: 500 });
    }
}
