import { NextResponse } from 'next/server';
import { query } from '@/lib/postgres';
import { requireUserAuth } from '@/lib/auth-middleware';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { parseIdParam, validatePitchData } from '@/lib/validation';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * Verify that the authenticated user owns the pitch (via pitcher ownership)
 */
async function verifyPitchOwnership(pitchId: number, uid: string): Promise<boolean> {
    const result = await query(
        `SELECT p.id FROM user_pitches p
         JOIN user_pitchers pit ON p.pitcher_id = pit.id
         WHERE p.id = $1 AND (pit.firebase_uid = $2 OR pit.firebase_uid IS NULL)`,
        [pitchId, uid]
    );
    return result.rows.length > 0;
}

// GET /api/pitches/[id] - Get a single pitch
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
        const pitchId = parseIdParam(id);
        if (pitchId instanceof NextResponse) {
            return pitchId;
        }

        // Verify ownership
        const isOwner = await verifyPitchOwnership(pitchId, uid);
        if (!isOwner) {
            return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });
        }

        const result = await query(
            'SELECT * FROM user_pitches WHERE id = $1',
            [pitchId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching pitch:', error);
        return NextResponse.json({ error: 'Failed to fetch pitch' }, { status: 500 });
    }
}

// PUT /api/pitches/[id] - Update a pitch
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
        const pitchId = parseIdParam(id);
        if (pitchId instanceof NextResponse) {
            return pitchId;
        }

        // Verify ownership
        const isOwner = await verifyPitchOwnership(pitchId, uid);
        if (!isOwner) {
            return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });
        }

        const body = await request.json();

        // Validate pitch data (partial update, so we don't require all fields)
        const { pitch_type, velocity_mph, spin_rate, horizontal_break, vertical_break, date, notes } = body;

        const result = await query(
            `UPDATE user_pitches
       SET pitch_type = COALESCE($1, pitch_type),
           velocity_mph = COALESCE($2, velocity_mph),
           spin_rate = COALESCE($3, spin_rate),
           horizontal_break = COALESCE($4, horizontal_break),
           vertical_break = COALESCE($5, vertical_break),
           date = COALESCE($6, date),
           notes = COALESCE($7, notes)
       WHERE id = $8
       RETURNING *`,
            [pitch_type, velocity_mph, spin_rate, horizontal_break, vertical_break, date, notes, pitchId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating pitch:', error);
        return NextResponse.json({ error: 'Failed to update pitch' }, { status: 500 });
    }
}

// DELETE /api/pitches/[id] - Delete a pitch
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
        const pitchId = parseIdParam(id);
        if (pitchId instanceof NextResponse) {
            return pitchId;
        }

        // Verify ownership
        const isOwner = await verifyPitchOwnership(pitchId, uid);
        if (!isOwner) {
            return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });
        }

        await query('DELETE FROM user_pitches WHERE id = $1', [pitchId]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting pitch:', error);
        return NextResponse.json({ error: 'Failed to delete pitch' }, { status: 500 });
    }
}
