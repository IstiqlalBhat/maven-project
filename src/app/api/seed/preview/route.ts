import { NextResponse } from 'next/server';
import { previewMLBData } from '@/lib/fetch-mlb-data';
import { requireAdminAuth } from '@/lib/auth-middleware';
import { heavyOperationRateLimiter } from '@/lib/rate-limiter';

// POST /api/seed/preview - Preview how many rows would be imported
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
        } = body;

        const preview = await previewMLBData({
            startDate,
            endDate,
            season,
        });

        return NextResponse.json({
            message: 'Preview complete',
            preview: {
                estimatedRows: preview.estimatedRows,
                totalDays: preview.totalDays,
                sampled: preview.sampled,
                dateRange: { startDate, endDate },
            },
        });
    } catch (error) {
        console.error('Error previewing data:', error);
        return NextResponse.json({
            error: 'Failed to preview data',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
