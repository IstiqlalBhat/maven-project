import { NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/postgres';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/pitchers/[id] - Get a single pitcher
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const result = await query(
            'SELECT * FROM user_pitchers WHERE id = $1',
            [parseInt(id)]
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
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, age, throws, level, primary_pitch } = body;

        const result = await query(
            `UPDATE user_pitchers
       SET name = COALESCE($1, name),
           age = COALESCE($2, age),
           throws = COALESCE($3, throws),
           level = COALESCE($4, level),
           primary_pitch = COALESCE($5, primary_pitch)
       WHERE id = $6
       RETURNING *`,
            [name, age, throws, level, primary_pitch, parseInt(id)]
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
    try {
        const { id } = await params;
        const pitcherId = parseInt(id);

        await withTransaction(async (client) => {
            // Pitches are deleted automatically via ON DELETE CASCADE
            await client.query('DELETE FROM user_pitchers WHERE id = $1', [pitcherId]);
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting pitcher:', error);
        return NextResponse.json({ error: 'Failed to delete pitcher' }, { status: 500 });
    }
}
