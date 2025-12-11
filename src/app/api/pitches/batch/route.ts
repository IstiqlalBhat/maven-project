import { NextResponse } from 'next/server';
import { query, withClient, checkForDuplicates, PitchFingerprint } from '@/lib/postgres';
import { requireUserAuth } from '@/lib/auth-middleware';
import { batchOperationRateLimiter } from '@/lib/rate-limiter';
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

// POST /api/pitches/batch - Batch add pitches
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
        const { pitcher_id, pitches, skipDuplicates = false, checkOnly = false, forceInsert = false } = body;

        // Basic validation
        if (!pitcher_id) {
            return NextResponse.json(
                { error: 'pitcher_id is required' },
                { status: 400 }
            );
        }

        if (!Array.isArray(pitches) || pitches.length === 0) {
            return NextResponse.json(
                { error: 'pitches array is required and must not be empty' },
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

        // Validate all pitches first
        const validPitches: any[] = [];
        const errors: string[] = [];

        for (let i = 0; i < pitches.length; i++) {
            const pitch = pitches[i];
            const validation = validatePitchData(pitch);

            if (!validation.valid) {
                errors.push(`Row ${i + 1}: ${validation.error}`);
            } else {
                validPitches.push(validation.data!);
            }
        }

        if (errors.length > 0) {
            // If any validation fails, return error with details
            // We could allow partial success, but all-or-nothing is safer for "lots of data" to avoid confusion
            return NextResponse.json(
                { error: 'Validation failed', details: errors.slice(0, 10) }, // Limit error details
                { status: 400 }
            );
        }

        // Check for duplicates in the database
        const pitchFingerprints: PitchFingerprint[] = validPitches.map(p => ({
            pitcher_id: pitcherId,
            pitch_type: p.pitch_type,
            velocity_mph: p.velocity_mph,
            spin_rate: p.spin_rate,
            horizontal_break: p.horizontal_break,
            vertical_break: p.vertical_break,
            date: p.date
        }));

        const duplicateCheck = await checkForDuplicates(pitcherId, pitchFingerprints);

        // If checkOnly mode, just return duplicate info without inserting
        if (checkOnly) {
            return NextResponse.json({
                hasDuplicates: duplicateCheck.hasDuplicates,
                duplicateCount: duplicateCheck.duplicateCount,
                uniqueCount: validPitches.length - duplicateCheck.duplicateCount,
                totalCount: validPitches.length,
                duplicateIndices: duplicateCheck.duplicateIndices
            });
        }

        // If forceInsert is true, skip duplicate check and insert anyway
        if (!forceInsert) {
            // If the entire batch is a duplicate (same file uploaded twice), warn the user
            if (duplicateCheck.hasDuplicates && !skipDuplicates) {
                return NextResponse.json({
                    error: 'Duplicate batch detected',
                    code: 'DUPLICATE_BATCH',
                    hasDuplicates: true,
                    duplicateCount: duplicateCheck.duplicateCount,
                    totalCount: validPitches.length,
                    message: `This batch of ${validPitches.length} pitches appears to have already been uploaded. If you want to upload it again anyway, confirm below.`
                }, { status: 409 });
            }

            // If user confirms they want to skip the duplicate batch
            if (duplicateCheck.hasDuplicates && skipDuplicates) {
                return NextResponse.json({
                    success: true,
                    count: 0,
                    skippedDuplicates: duplicateCheck.duplicateCount,
                    message: 'Duplicate batch skipped - these pitches were already in the database.'
                }, { status: 200 });
            }
        }

        // Proceed with insert (either no duplicates, or forceInsert is true)
        const pitchesToInsert = validPitches;

        // Use service client for batch insert (bypasses RLS)
        // Note: Supabase JS client doesn't support true transactions unless using RPC
        // We use withClient which gives us the service role client
        const insertedCount = await withClient(async (client) => {
            const chunkSize = 100; // Process in chunks
            let totalInserted = 0;

            // Map validation data to DB schema
            const fullPitches = pitchesToInsert.map(p => ({
                pitcher_id: pitcherId,
                pitch_type: p.pitch_type,
                velocity_mph: p.velocity_mph,
                spin_rate: p.spin_rate,
                horizontal_break: p.horizontal_break,
                vertical_break: p.vertical_break,
                date: p.date,
                notes: p.notes
            }));

            for (let i = 0; i < fullPitches.length; i += chunkSize) {
                const chunk = fullPitches.slice(i, i + chunkSize);

                const { error } = await client
                    .from('user_pitches')
                    .insert(chunk);

                if (error) {
                    console.error('Batch insert error:', error);
                    throw new Error(`Batch insert failed at chunk ${i / chunkSize}: ${error.message}`);
                }

                totalInserted += chunk.length;
            }

            return totalInserted;
        });

        return NextResponse.json({
            success: true,
            count: insertedCount,
            message: `Successfully uploaded ${insertedCount} pitches`
        }, { status: 201 });

    } catch (error) {
        console.error('Error batch creating pitches:', error);
        return NextResponse.json({ error: 'Failed to batch create pitches' }, { status: 500 });
    }
}
