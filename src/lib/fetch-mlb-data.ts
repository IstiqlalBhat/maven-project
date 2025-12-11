import { query, initializeDatabase, getClient } from './postgres';

// Baseball Savant CSV URL pattern
const BASEBALL_SAVANT_CSV_URL = 'https://baseballsavant.mlb.com/statcast_search/csv';

// Pitch type codes with names
export const PITCH_TYPES: Record<string, string> = {
    'FF': '4-Seam Fastball',
    'SI': 'Sinker',
    'SL': 'Slider',
    'CU': 'Curveball',
    'CH': 'Changeup',
    'FC': 'Cutter',
    'FS': 'Splitter',
    'KC': 'Knuckle Curve',
    'ST': 'Sweeper',
    'SV': 'Slurve',
};

// Build URL for fetching MLB data
export function buildStatcastUrl(options: {
    pitchTypes?: string[];
    startDate: string;
    endDate: string;
    season: number;
}): string {
    const pitchTypesParam = (options.pitchTypes || Object.keys(PITCH_TYPES))
        .map(t => `${t}|`)
        .join('');

    const params = new URLSearchParams({
        all: 'true',
        hfPT: pitchTypesParam,
        hfAB: '',
        hfGT: 'R|',
        hfPR: '',
        hfZ: '',
        hfStadium: '',
        hfBBL: '',
        hfNewZones: '',
        hfPull: '',
        hfC: '',
        hfSea: `${options.season}|`,
        hfSit: '',
        player_type: 'pitcher',
        hfOuts: '',
        hfOpponent: '',
        pitcher_throws: '',
        batter_stands: '',
        hfSA: '',
        game_date_gt: options.startDate,
        game_date_lt: options.endDate,
        hfMo: '',
        hfTeam: '',
        home_road: '',
        hfRO: '',
        position: '',
        hfInfield: '',
        hfOutfield: '',
        hfInn: '',
        hfBBT: '',
        hfFlag: '',
        metric_1: '',
        group_by: 'name',
        min_pitches: '0',
        min_results: '0',
        min_pas: '0',
        sort_col: 'pitches',
        player_event_sort: 'api_p_release_speed',
        sort_order: 'desc',
        type: 'details',
    });

    return `${BASEBALL_SAVANT_CSV_URL}?${params.toString()}`;
}

// Parse CSV data from Baseball Savant
export function parseCSV(csvText: string): Record<string, string>[] {
    const lines = csvText.split('\n');
    if (lines.length < 2) return [];

    // Parse headers (remove quotes and BOM)
    const headers = lines[0]
        .replace(/^\ufeff/, '') // Remove BOM
        .split(',')
        .map(h => h.replace(/^"|"$/g, '').trim());

    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse CSV line (handle quoted values)
        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (const char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.replace(/^"|"$/g, '').trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.replace(/^"|"$/g, '').trim());

        // Create row object
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        rows.push(row);
    }

    return rows;
}

// Helper to add days to a date string
function addDays(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

// MLB pitch data structure for insert
interface MLBPitchInsert {
    pitcher_name: string;
    pitch_type: string;
    release_speed: number | null;
    release_spin_rate: number | null;
    pfx_x: number | null;
    pfx_z: number | null;
    game_date: string | null;
    p_throws: string | null;
}

// Fetch MLB data from Baseball Savant and insert into Supabase
export async function fetchAndSeedMLBData(options: {
    startDate: string;
    endDate: string;
    season?: number;
    batchSize?: number;
}): Promise<{ inserted: number; skipped: number; errors: number }> {
    const season = options.season || new Date().getFullYear();
    const CHUNK_DAYS = 3;
    const BATCH_SIZE = options.batchSize || 500; // Supabase insert batch size

    console.log(`\n🎯 Fetching MLB Statcast data from ${options.startDate} to ${options.endDate}`);
    console.log(`   Season: ${season}`);
    console.log(`   Chunk size: ${CHUNK_DAYS} days`);

    // Initialize database schema
    await initializeDatabase();

    let currentStartDate = options.startDate;
    const finalEndDate = options.endDate;

    let totalInserted = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Loop through date chunks
    while (new Date(currentStartDate) <= new Date(finalEndDate)) {
        let currentEndDate = addDays(currentStartDate, CHUNK_DAYS);

        // Don't go past the final end date
        if (new Date(currentEndDate) > new Date(finalEndDate)) {
            currentEndDate = finalEndDate;
        }

        console.log(`\n📅 Processing chunk: ${currentStartDate} to ${currentEndDate}`);

        // Build URL and fetch
        const url = buildStatcastUrl({
            startDate: currentStartDate,
            endDate: currentEndDate,
            season,
        });

        console.log('📡 Downloading CSV from Baseball Savant...');

        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'PitchTracker/1.0',
                    'Accept': 'text/csv',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
            }

            const csvText = await response.text();
            console.log(`📥 Downloaded ${(csvText.length / 1024 / 1024).toFixed(2)} MB`);

            // Parse CSV
            const rows = parseCSV(csvText);
            console.log(`📊 Parsed ${rows.length} pitch records`);

            if (rows.length >= 25000) {
                console.warn('⚠️ WARNING: Chunk hit 25,000 record limit! Data may be truncated.');
            }

            if (rows.length > 0) {
                // Prepare data for batch insert
                const pitchesToInsert: MLBPitchInsert[] = [];
                let chunkSkipped = 0;

                for (const row of rows) {
                    // Skip rows without essential data
                    if (!row.player_name || !row.pitch_type) {
                        chunkSkipped++;
                        continue;
                    }

                    pitchesToInsert.push({
                        pitcher_name: row.player_name,
                        pitch_type: row.pitch_type,
                        release_speed: row.release_speed ? parseFloat(row.release_speed) : null,
                        release_spin_rate: row.release_spin_rate ? parseInt(row.release_spin_rate) : null,
                        pfx_x: row.pfx_x ? parseFloat(row.pfx_x) : null,
                        pfx_z: row.pfx_z ? parseFloat(row.pfx_z) : null,
                        game_date: row.game_date || null,
                        p_throws: row.p_throws || null,
                    });
                }

                if (pitchesToInsert.length > 0) {
                    console.log('🚀 Inserting to Supabase in batches...');

                    const client = await getClient();

                    // Insert in batches
                    for (let i = 0; i < pitchesToInsert.length; i += BATCH_SIZE) {
                        const batch = pitchesToInsert.slice(i, i + BATCH_SIZE);

                        const { error } = await client
                            .from('mlb_pitches')
                            .insert(batch);

                        if (error) {
                            console.error(`Batch insert error:`, error.message);
                            totalErrors++;
                        } else {
                            totalInserted += batch.length;
                        }

                        // Progress indicator
                        if ((i / BATCH_SIZE) % 10 === 0) {
                            console.log(`   Progress: ${Math.min(i + BATCH_SIZE, pitchesToInsert.length)}/${pitchesToInsert.length}`);
                        }
                    }

                    console.log(`   Chunk results: ${pitchesToInsert.length} processed, ${chunkSkipped} skipped`);
                    totalSkipped += chunkSkipped;
                }
            }
        } catch (error) {
            console.error(`Error processing chunk ${currentStartDate} to ${currentEndDate}:`, error);
            totalErrors++;
        }

        // Move to next chunk
        currentStartDate = addDays(currentEndDate, 1);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`\n✅ Complete! Total Inserted: ${totalInserted}, Skipped: ${totalSkipped}, Errors: ${totalErrors}`);

    // Note: Materialized view refresh not supported via JS client
    // This would need to be done via Supabase Dashboard or RPC function
    if (totalInserted > 0) {
        console.log('⚠️ Note: Run `REFRESH MATERIALIZED VIEW mv_pitcher_stats` in Supabase SQL Editor');
    }

    return { inserted: totalInserted, skipped: totalSkipped, errors: totalErrors };
}

// Check if database already has data
export async function hasMLBData(): Promise<boolean> {
    try {
        const client = await getClient();
        const { count, error } = await client
            .from('mlb_pitches')
            .select('*', { count: 'exact', head: true });

        if (error) return false;
        return (count || 0) > 0;
    } catch {
        return false;
    }
}

// Preview/estimate how many rows would be imported from a date range
export async function previewMLBData(options: {
    startDate: string;
    endDate: string;
    season?: number;
}): Promise<{ estimatedRows: number; totalDays: number; sampled: boolean }> {
    const season = options.season || new Date().getFullYear();

    // Calculate total days in range
    const startMs = new Date(options.startDate).getTime();
    const endMs = new Date(options.endDate).getTime();
    const totalDays = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;

    // Fetch first 3-day sample to estimate
    let sampleEndDate = addDays(options.startDate, 2);
    const maxEnd = new Date(options.endDate);
    if (new Date(sampleEndDate) > maxEnd) {
        sampleEndDate = options.endDate;
    }

    console.log(`📊 Previewing data from ${options.startDate} to ${sampleEndDate} (sample)...`);

    const url = buildStatcastUrl({
        startDate: options.startDate,
        endDate: sampleEndDate,
        season,
    });

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'PitchTracker/1.0',
                'Accept': 'text/csv',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch preview: ${response.status}`);
        }

        const csvText = await response.text();
        const rows = parseCSV(csvText);
        const sampleDays = Math.min(3, totalDays);

        // Filter valid rows (those with pitcher name and pitch type)
        const validRows = rows.filter(row => row.player_name && row.pitch_type);
        const sampleRowCount = validRows.length;

        // Extrapolate to full date range (rough estimate)
        let estimatedRows: number;
        if (sampleDays >= totalDays) {
            estimatedRows = sampleRowCount;
        } else {
            const avgPerDay = sampleRowCount / sampleDays;
            estimatedRows = Math.round(avgPerDay * totalDays);
        }

        console.log(`   Sample: ${sampleRowCount} rows in ${sampleDays} days`);
        console.log(`   Estimated total: ~${estimatedRows.toLocaleString()} rows over ${totalDays} days`);

        return {
            estimatedRows,
            totalDays,
            sampled: sampleDays < totalDays,
        };
    } catch (error) {
        console.error('Preview error:', error);
        throw error;
    }
}

// Clear existing MLB data
export async function clearMLBData(): Promise<void> {
    const client = await getClient();
    const { error } = await client
        .from('mlb_pitches')
        .delete()
        .neq('id', 0); // Delete all rows

    if (error) {
        console.error('Error clearing MLB data:', error.message);
        throw error;
    }
    console.log('Cleared existing MLB data');
}

// Get statistics about loaded data
export async function getMLBDataStats(): Promise<{
    totalPitches: number;
    uniquePitchers: number;
    pitchTypeCounts: Record<string, number>;
    dateRange: { min: string; max: string };
}> {
    const client = await getClient();

    // Get total count
    const { count: totalPitches } = await client
        .from('mlb_pitches')
        .select('*', { count: 'exact', head: true });

    // Get unique pitchers - using distinct query
    const { data: pitcherData } = await client
        .from('mlb_pitches')
        .select('pitcher_name')
        .limit(10000);

    const uniquePitchers = new Set(pitcherData?.map(r => r.pitcher_name) || []).size;

    // Get pitch type counts
    const { data: typeData } = await client
        .from('mlb_pitches')
        .select('pitch_type')
        .limit(50000);

    const pitchTypeCounts: Record<string, number> = {};
    for (const row of typeData || []) {
        const type = row.pitch_type;
        pitchTypeCounts[type] = (pitchTypeCounts[type] || 0) + 1;
    }

    // Get date range
    const { data: dateData } = await client
        .from('mlb_pitches')
        .select('game_date')
        .order('game_date', { ascending: true })
        .limit(1);

    const { data: maxDateData } = await client
        .from('mlb_pitches')
        .select('game_date')
        .order('game_date', { ascending: false })
        .limit(1);

    return {
        totalPitches: totalPitches || 0,
        uniquePitchers,
        pitchTypeCounts,
        dateRange: {
            min: dateData?.[0]?.game_date || '',
            max: maxDateData?.[0]?.game_date || '',
        },
    };
}

// Close connection (no-op for Supabase JS client)
export async function closeConnection(): Promise<void> {
    // Supabase JS client doesn't need explicit closing
    console.log('Supabase connection cleanup (no-op)');
}
