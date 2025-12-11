import { NextResponse } from 'next/server';
import { query, withClient } from '@/lib/postgres';
import { requireUserAuth } from '@/lib/auth-middleware';
import { batchOperationRateLimiter } from '@/lib/rate-limiter';

/**
 * Verify that the authenticated user owns all the pitches (via pitcher ownership)
 */
async function verifyPitchesOwnership(pitchIds: number[], uid: string): Promise<{ valid: boolean; ownedIds: number[] }> {
    // First get pitcher_ids for all the pitches
    const pitchesResult = await query(
        'SELECT id, pitcher_id FROM user_pitches WHERE id = ANY($1)',
        [pitchIds]
    );

    if (pitchesResult.rows.length === 0) {
        return { valid: false, ownedIds: [] };
    }

    // Get unique pitcher IDs
    const pitcherIds = [...new Set(pitchesResult.rows.map(row => row.pitcher_id))];

    // Verify user owns all those pitchers
    const pitchersResult = await query(
        'SELECT id FROM user_pitchers WHERE id = ANY($1) AND (firebase_uid = $2 OR firebase_uid IS NULL)',
        [pitcherIds, uid]
    );

    const ownedPitcherIds = new Set(pitchersResult.rows.map(row => row.id));

    // Filter pitches to only those owned by the user
    const ownedIds = pitchesResult.rows
        .filter(row => ownedPitcherIds.has(row.pitcher_id))
        .map(row => Number(row.id));

    return {
        valid: ownedIds.length === pitchIds.length,
        ownedIds
    };
}

// POST /api/pitches/batch-delete - Batch delete pitches
export async function POST(request: Request) {
    // Rate limiting - restricted for batch operations
    const rateLimitResponse = batchOperationRateLimiter(request);
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
        const { pitch_ids } = body;

        // Basic validation
        if (!Array.isArray(pitch_ids) || pitch_ids.length === 0) {
            return NextResponse.json(
                { error: 'pitch_ids array is required and must not be empty' },
                { status: 400 }
            );
        }

        // Validate all IDs are numbers
        const pitchIds = pitch_ids.map(id => {
            const parsed = parseInt(String(id));
            if (isNaN(parsed)) {
                throw new Error(`Invalid pitch ID: ${id}`);
            }
            return parsed;
        });

        // Verify ownership of all pitches
        const { valid, ownedIds } = await verifyPitchesOwnership(pitchIds, uid);

        if (!valid) {
            return NextResponse.json(
                {
                    error: 'Some pitches not found or you do not have permission to delete them',
                    deletedCount: 0
                },
                { status: 403 }
            );
        }

        // Perform batch delete using service client
        const deletedCount = await withClient(async (client) => {
            // Use Supabase client method
            const { error, count } = await client
                .from('user_pitches')
                .delete({ count: 'exact' })
                .in('id', ownedIds);

            if (error) throw error;
            return count || 0;
        });

        return NextResponse.json({
            success: true,
            deletedCount,
            message: `Successfully deleted ${deletedCount} pitches`
        }, { status: 200 });

    } catch (error) {
        console.error('Error batch deleting pitches:', error);
        return NextResponse.json(
            { error: 'Failed to batch delete pitches' },
            { status: 500 }
        );
    }
}
