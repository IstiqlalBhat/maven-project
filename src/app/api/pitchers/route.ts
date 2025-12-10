import { NextResponse } from 'next/server';
import { query } from '@/lib/postgres';

// GET /api/pitchers - List all pitcher profiles
export async function GET() {
    try {
        const result = await query(
            'SELECT * FROM user_pitchers ORDER BY created_at DESC'
        );
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching pitchers:', error);
        return NextResponse.json({ error: 'Failed to fetch pitchers' }, { status: 500 });
    }
}

// POST /api/pitchers - Create a new pitcher profile
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, age, throws, level, primary_pitch } = body;

        // Input validation
        if (!name || typeof name !== 'string') {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }
        if (name.length > 100) {
            return NextResponse.json({ error: 'Name must be 100 characters or less' }, { status: 400 });
        }
        if (throws && !['L', 'R'].includes(throws)) {
            return NextResponse.json({ error: 'Throws must be "L" or "R"' }, { status: 400 });
        }
        if (age !== undefined && age !== null && (typeof age !== 'number' || age < 1 || age > 100)) {
            return NextResponse.json({ error: 'Age must be a number between 1 and 100' }, { status: 400 });
        }
        if (level && level.length > 50) {
            return NextResponse.json({ error: 'Level must be 50 characters or less' }, { status: 400 });
        }

        const result = await query(
            `INSERT INTO user_pitchers (name, age, throws, level, primary_pitch)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [name.trim(), age || null, throws || null, level || null, primary_pitch || null]
        );

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('Error creating pitcher:', error);
        return NextResponse.json({ error: 'Failed to create pitcher' }, { status: 500 });
    }
}
