import { NextResponse } from 'next/server';
import { initializeDatabase, query } from '@/lib/postgres';
import { fetchAndSeedMLBData, hasMLBData, getMLBDataStats } from '@/lib/fetch-mlb-data';

// POST /api/seed - Seed the database with MLB data
export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const {
            startDate = '2024-09-01',
            endDate = '2024-09-30',
            season = 2024,
            force = false
        } = body;

        // Initialize database schema
        await initializeDatabase();

        // Check if data already exists
        const hasData = await hasMLBData();
        if (hasData && !force) {
            const stats = await getMLBDataStats();
            return NextResponse.json({
                message: 'MLB data already exists. Use force=true to re-seed.',
                exists: true,
                stats,
            });
        }

        // Clear existing data if force seeding
        if (force && hasData) {
            await query('DELETE FROM mlb_pitches');
        }

        // Fetch and seed data
        const result = await fetchAndSeedMLBData({
            startDate,
            endDate,
            season,
        });

        const stats = await getMLBDataStats();

        return NextResponse.json({
            message: 'MLB data seeded successfully',
            result,
            stats,
        });
    } catch (error) {
        console.error('Error seeding database:', error);
        return NextResponse.json({
            error: 'Failed to seed database',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// GET /api/seed - Check current data status
export async function GET() {
    try {
        await initializeDatabase();

        const hasData = await hasMLBData();
        if (!hasData) {
            return NextResponse.json({
                message: 'No MLB data loaded. POST to this endpoint to seed data.',
                exists: false,
            });
        }

        const stats = await getMLBDataStats();
        return NextResponse.json({
            message: 'MLB data is loaded',
            exists: true,
            stats,
        });
    } catch (error) {
        console.error('Error checking seed status:', error);
        return NextResponse.json({
            error: 'Failed to check seed status',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
