import { NextResponse } from 'next/server';
import { initializeDatabase, query } from '@/lib/postgres';
import { fetchAndSeedMLBData, hasMLBData, getMLBDataStats } from '@/lib/fetch-mlb-data';
import { requireAdminAuth } from '@/lib/auth-middleware';
import { heavyOperationRateLimiter } from '@/lib/rate-limiter';

// POST /api/seed - Seed the database with MLB data
export async function POST(request: Request) {
    // Rate limiting for heavy operations
    const rateLimitResponse = heavyOperationRateLimiter(request);
    if (rateLimitResponse) {
        return rateLimitResponse;
    }

    // Require admin authentication
    const authError = await requireAdminAuth();
    if (authError) {
        return authError;
    }

    try {
        const body = await request.json().catch(() => ({}));
        const {
            startDate = '2024-09-01',
            endDate = '2024-09-30',
            season = 2024,
            force = false,
            append = false  // New: append mode adds data without truncating existing data
        } = body;

        // Initialize database schema
        await initializeDatabase();

        // Check if data already exists (skip check if appending)
        const hasData = await hasMLBData();

        // Append mode: just insert new data without any truncation
        if (append) {
            // Proceed directly to insertion - no truncation, no blocking check
            console.log(`Appending data for ${startDate} to ${endDate}...`);
        } else if (hasData && !force) {
            // Normal mode: block if data exists and force not specified
            const stats = await getMLBDataStats();
            return NextResponse.json({
                message: 'MLB data already exists. Use force=true to re-seed or append=true to add more data.',
                exists: true,
                stats,
            });
        } else if (force && hasData) {
            // Force mode: clear existing data first (TRUNCATE is much faster than DELETE)
            await query('TRUNCATE TABLE mlb_pitches RESTART IDENTITY');
        }

        // Fetch and seed data
        const result = await fetchAndSeedMLBData({
            startDate,
            endDate,
            season,
        });

        // Refresh materialized view for similar pitchers feature
        try {
            await query('REFRESH MATERIALIZED VIEW mv_pitcher_stats');
        } catch (refreshError) {
            console.warn('Could not refresh materialized view:', refreshError);
            // Continue anyway - view might not exist yet
        }

        const stats = await getMLBDataStats();

        return NextResponse.json({
            message: append ? 'MLB data appended successfully' : 'MLB data seeded successfully',
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
export async function GET(request: Request) {
    // Require admin authentication to view database stats
    const authError = await requireAdminAuth();
    if (authError) {
        return authError;
    }

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

// DELETE /api/seed - Clear all MLB data
export async function DELETE(request: Request) {
    // Rate limiting for heavy operations
    const rateLimitResponse = heavyOperationRateLimiter(request);
    if (rateLimitResponse) {
        return rateLimitResponse;
    }

    // Require admin authentication
    const authError = await requireAdminAuth();
    if (authError) {
        return authError;
    }

    try {
        await initializeDatabase();

        const hasData = await hasMLBData();
        if (!hasData) {
            return NextResponse.json({
                message: 'No data to delete.',
                deleted: false,
            });
        }

        // Use TRUNCATE for much faster deletion (vs DELETE which logs each row)
        // RESTART IDENTITY resets any associated sequences
        // CASCADE handles dependent objects
        await query('TRUNCATE TABLE mlb_pitches RESTART IDENTITY');

        // Refresh the materialized view to reflect empty state
        await query('REFRESH MATERIALIZED VIEW mv_pitcher_stats');

        return NextResponse.json({
            message: 'All MLB data has been deleted.',
            deleted: true,
        });
    } catch (error) {
        console.error('Error deleting data:', error);
        return NextResponse.json({
            error: 'Failed to delete data',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
