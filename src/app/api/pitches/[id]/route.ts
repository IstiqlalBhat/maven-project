import { NextResponse } from 'next/server';
import { query } from '@/lib/postgres';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/pitches/[id] - Get a single pitch
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const result = await query(
            'SELECT * FROM user_pitches WHERE id = $1',
            [parseInt(id)]
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
    try {
        const { id } = await params;
        const body = await request.json();
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
            [pitch_type, velocity_mph, spin_rate, horizontal_break, vertical_break, date, notes, parseInt(id)]
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
    try {
        const { id } = await params;
        await query('DELETE FROM user_pitches WHERE id = $1', [parseInt(id)]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting pitch:', error);
        return NextResponse.json({ error: 'Failed to delete pitch' }, { status: 500 });
    }
}
