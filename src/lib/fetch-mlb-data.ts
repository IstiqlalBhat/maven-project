import { query, initializeDatabase, withClient, pool } from './postgres';
import { from as copyFrom } from 'pg-copy-streams';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

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

// Helper to escape values for CSV
function escapeCsv(value: string | number | null): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

// Fetch MLB data from Baseball Savant and insert into PostgreSQL
export async function fetchAndSeedMLBData(options: {
    startDate: string;
    endDate: string;
    season?: number;
    batchSize?: number; // Kept for interface compatibility, mostly irrelevant with COPY
}): Promise<{ inserted: number; skipped: number; errors: number }> {
    const season = options.season || new Date().getFullYear();
    // Increase chunk size since COPY is much faster
    // But don't make it too huge to avoid memory issues with fetch/parse
    // LIMIT: Baseball savant CSV export limit is 25,000 rows.
    // 7 days * ~4500 pitches/day > 30k -> truncated data.
    // 3 days * ~4500 pitches/day = ~13.5k -> safe buffer.
    const CHUNK_DAYS = 3;

    console.log(`\n🎯 Fetching MLB Statcast data from ${options.startDate} to ${options.endDate}`);
    console.log(`   Season: ${season}`);
    console.log(`   Chunk size: ${CHUNK_DAYS} days (optimized for 25k limit)`);

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
                console.warn('⚠️ WARNING: Chunk hit 25,000 record limit! Data may be truncated. Reduce CHUNK_DAYS further.');
            }

            if (rows.length > 0) {
                // Prepare data for COPY
                const csvLines: string[] = [];
                let chunkSkipped = 0;

                for (const row of rows) {
                    // Skip rows without essential data
                    if (!row.player_name || !row.pitch_type) {
                        chunkSkipped++;
                        continue;
                    }

                    // Parse numeric values
                    const releaseSpeed = row.release_speed ? parseFloat(row.release_speed) : null;
                    const spinRate = row.release_spin_rate ? parseInt(row.release_spin_rate) : null;
                    const pfxX = row.pfx_x ? parseFloat(row.pfx_x) : null;
                    const pfxZ = row.pfx_z ? parseFloat(row.pfx_z) : null;
                    const gameDate = row.game_date || null;
                    const pThrows = row.p_throws || null;

                    // Create CSV line matching the table schema order:
                    // pitcher_name, pitch_type, release_speed, release_spin_rate, pfx_x, pfx_z, game_date, p_throws
                    // Note: Postgres CSV format defaults to simple comma separation, quotes for strings if needed.
                    csvLines.push(
                        [
                            escapeCsv(row.player_name),
                            escapeCsv(row.pitch_type),
                            escapeCsv(releaseSpeed),
                            escapeCsv(spinRate),
                            escapeCsv(pfxX),
                            escapeCsv(pfxZ),
                            escapeCsv(gameDate),
                            escapeCsv(pThrows)
                        ].join(',')
                    );
                }

                if (csvLines.length > 0) {
                    console.log('🚀 Streaming to database via COPY...');
                    const csvData = csvLines.join('\n');

                    await withClient(async (client) => {
                        const stream = client.query(
                            copyFrom('COPY mlb_pitches (pitcher_name, pitch_type, release_speed, release_spin_rate, pfx_x, pfx_z, game_date, p_throws) FROM STDIN WITH (FORMAT csv)')
                        );

                        // Create a readable stream from our data
                        const sourceStream = Readable.from([csvData]);

                        // Pipeline handles error propagation and cleanup
                        await pipeline(sourceStream, stream);
                    });

                    const insertedCount = csvLines.length;
                    console.log(`   Chunk results: ${insertedCount} inserted, ${chunkSkipped} skipped`);
                    totalInserted += insertedCount;
                    totalSkipped += chunkSkipped;
                }
            }
        } catch (error) {
            console.error(`Error processing chunk ${currentStartDate} to ${currentEndDate}:`, error);
            totalErrors++;
        }

        // Move to next chunk
        currentStartDate = addDays(currentEndDate, 1);

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`\n✅ Complete! Total Inserted: ${totalInserted}, Skipped: ${totalSkipped}, Errors: ${totalErrors}`);

    if (totalInserted > 0) {
        console.log('🔄 Refreshing pitcher stats materialized view...');
        await query('REFRESH MATERIALIZED VIEW mv_pitcher_stats');
        console.log('✨ View refreshed!');
    }

    return { inserted: totalInserted, skipped: totalSkipped, errors: totalErrors };
}

// Check if database already has data
export async function hasMLBData(): Promise<boolean> {
    try {
        const result = await query('SELECT COUNT(*) as count FROM mlb_pitches');
        return parseInt(result.rows[0].count) > 0;
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
            // We sampled the entire range
            estimatedRows = sampleRowCount;
        } else {
            // Extrapolate based on sample
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
    await query('DELETE FROM mlb_pitches');
    console.log('Cleared existing MLB data');
}

// Get statistics about loaded data
export async function getMLBDataStats(): Promise<{
    totalPitches: number;
    uniquePitchers: number;
    pitchTypeCounts: Record<string, number>;
    dateRange: { min: string; max: string };
}> {
    const [totalResult, pitcherResult, typeResult, dateResult] = await Promise.all([
        query('SELECT COUNT(*) as count FROM mlb_pitches'),
        query('SELECT COUNT(DISTINCT pitcher_name) as count FROM mlb_pitches'),
        query('SELECT pitch_type, COUNT(*) as count FROM mlb_pitches GROUP BY pitch_type ORDER BY count DESC'),
        query('SELECT MIN(game_date) as min_date, MAX(game_date) as max_date FROM mlb_pitches'),
    ]);

    const pitchTypeCounts: Record<string, number> = {};
    for (const row of typeResult.rows) {
        pitchTypeCounts[row.pitch_type] = parseInt(row.count);
    }

    return {
        totalPitches: parseInt(totalResult.rows[0].count),
        uniquePitchers: parseInt(pitcherResult.rows[0].count),
        pitchTypeCounts,
        dateRange: {
            min: dateResult.rows[0].min_date,
            max: dateResult.rows[0].max_date,
        },
    };
}

// Close pool connection
export async function closeConnection(): Promise<void> {
    await pool.end();
}
