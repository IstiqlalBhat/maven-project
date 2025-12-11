import { NextResponse } from 'next/server';
import { query } from '@/lib/postgres';
import { requireUserAuth } from '@/lib/auth-middleware';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { safeParseInt, validatePitchData } from '@/lib/validation';

/**
 * Verify that the authenticated user owns the specified pitcher
 */
async function verifyPitcherOwnership(pitcherId: number, uid: string): Promise<boolean> {
    const result = await query(
        'SELECT id FROM user_pitchers WHERE id = $1 AND (firebase_uid = $2 OR firebase_uid IS NULL)',
        [pitcherId, uid]
    );
    return result.rows.length > 0;
}

// GET /api/pitches - List pitches (optional filter by pitcher_id)
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
        const { searchParams } = new URL(request.url);
        const pitcherIdParam = searchParams.get('pitcher_id');

        let result;
        if (pitcherIdParam) {
            const pitcherId = safeParseInt(pitcherIdParam);
            if (pitcherId === null) {
                return NextResponse.json({ error: 'Invalid pitcher_id' }, { status: 400 });
            }

            // Verify ownership of the pitcher
            const isOwner = await verifyPitcherOwnership(pitcherId, uid);
            if (!isOwner) {
                return NextResponse.json({ error: 'Pitcher not found' }, { status: 404 });
            }

            result = await query(
                'SELECT * FROM user_pitches WHERE pitcher_id = $1 ORDER BY date DESC, created_at DESC',
                [pitcherId]
            );
        } else {
            // Get all user's pitcher IDs first
            const pitchersResult = await query(
                'SELECT id FROM user_pitchers WHERE firebase_uid = $1 OR firebase_uid IS NULL',
                [uid]
            );
            const pitcherIds = pitchersResult.rows.map(row => row.id);

            if (pitcherIds.length === 0) {
                return NextResponse.json([]);
            }

            // Get pitches for all user's pitchers
            result = await query(
                'SELECT * FROM user_pitches WHERE pitcher_id = ANY($1) ORDER BY created_at DESC',
                [pitcherIds]
            );
        }

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching pitches:', error);
        return NextResponse.json({ error: 'Failed to fetch pitches' }, { status: 500 });
    }
}

// POST /api/pitches - Add a new pitch
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
        const { pitcher_id } = body;

        // Required field validation
        if (!pitcher_id) {
            return NextResponse.json(
                { error: 'pitcher_id is required' },
                { status: 400 }
            );
        }

        const pitcherId = safeParseInt(String(pitcher_id));
        if (pitcherId === null) {
            return NextResponse.json(
                { error: 'pitcher_id must be a valid integer' },
                { status: 400 }
            );
        }

        // Verify ownership of the pitcher
        const isOwner = await verifyPitcherOwnership(pitcherId, uid);
        if (!isOwner) {
            return NextResponse.json({ error: 'Pitcher not found' }, { status: 404 });
        }

        // Validate pitch data
        const validation = validatePitchData(body);
        if (!validation.valid) {
            return NextResponse.json(
                { error: validation.error },
                { status: 400 }
            );
        }

        const { pitch_type, velocity_mph, spin_rate, horizontal_break, vertical_break, date, notes } = validation.data!;

        const result = await query(
            `INSERT INTO user_pitches
       (pitcher_id, pitch_type, velocity_mph, spin_rate, horizontal_break, vertical_break, date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
            [
                pitcherId,
                pitch_type,
                velocity_mph,
                spin_rate,
                horizontal_break,
                vertical_break,
                date,
                notes
            ]
        );

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('Error creating pitch:', error);
        return NextResponse.json({ error: 'Failed to create pitch' }, { status: 500 });
    }
}
