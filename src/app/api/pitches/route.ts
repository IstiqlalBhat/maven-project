import { NextResponse } from 'next/server';
import { query } from '@/lib/postgres';

// GET /api/pitches - List pitches (optional filter by pitcher_id)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const pitcherId = searchParams.get('pitcher_id');

        let result;
        if (pitcherId) {
            result = await query(
                'SELECT * FROM user_pitches WHERE pitcher_id = $1 ORDER BY date DESC, created_at DESC',
                [parseInt(pitcherId)]
            );
        } else {
            result = await query(
                'SELECT * FROM user_pitches ORDER BY created_at DESC'
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
    try {
        const body = await request.json();
        const {
            pitcher_id,
            pitch_type,
            velocity_mph,
            spin_rate,
            horizontal_break,
            vertical_break,
            date,
            notes
        } = body;

        // Required field validation
        if (!pitcher_id || !pitch_type) {
            return NextResponse.json(
                { error: 'pitcher_id and pitch_type are required' },
                { status: 400 }
            );
        }

        // Pitch type validation
        if (typeof pitch_type !== 'string' || pitch_type.length > 50) {
            return NextResponse.json(
                { error: 'pitch_type must be a string of 50 characters or less' },
                { status: 400 }
            );
        }

        // Numeric range validation
        if (velocity_mph !== undefined && velocity_mph !== null) {
            if (typeof velocity_mph !== 'number' || velocity_mph < 0 || velocity_mph > 120) {
                return NextResponse.json(
                    { error: 'velocity_mph must be between 0 and 120' },
                    { status: 400 }
                );
            }
        }

        if (spin_rate !== undefined && spin_rate !== null) {
            if (typeof spin_rate !== 'number' || spin_rate < 0 || spin_rate > 5000) {
                return NextResponse.json(
                    { error: 'spin_rate must be between 0 and 5000' },
                    { status: 400 }
                );
            }
        }

        // Notes length validation
        if (notes && notes.length > 2000) {
            return NextResponse.json(
                { error: 'notes must be 2000 characters or less' },
                { status: 400 }
            );
        }

        const result = await query(
            `INSERT INTO user_pitches 
       (pitcher_id, pitch_type, velocity_mph, spin_rate, horizontal_break, vertical_break, date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
            [
                pitcher_id,
                pitch_type.trim(),
                velocity_mph || null,
                spin_rate || null,
                horizontal_break || null,
                vertical_break || null,
                date || null,
                notes?.trim() || null
            ]
        );

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('Error creating pitch:', error);
        return NextResponse.json({ error: 'Failed to create pitch' }, { status: 500 });
    }
}
