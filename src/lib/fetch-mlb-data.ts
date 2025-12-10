import { query, initializeDatabase, pool } from './postgres';

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

// Fetch MLB data from Baseball Savant and insert into PostgreSQL
export async function fetchAndSeedMLBData(options: {
    startDate: string;
    endDate: string;
    season?: number;
    batchSize?: number;
}): Promise<{ inserted: number; skipped: number; errors: number }> {
    const season = options.season || new Date().getFullYear();
    const batchSize = options.batchSize || 1000;

    console.log(`\n🎯 Fetching MLB Statcast data from ${options.startDate} to ${options.endDate}`);
    console.log(`   Season: ${season}`);

    // Initialize database schema
    await initializeDatabase();

    // Build URL and fetch
    const url = buildStatcastUrl({
        startDate: options.startDate,
        endDate: options.endDate,
        season,
    });

    console.log('📡 Downloading CSV from Baseball Savant...');

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

    if (rows.length === 0) {
        return { inserted: 0, skipped: 0, errors: 0 };
    }

    // Insert in batches
    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    console.log('💾 Inserting into database...');

    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const values: unknown[] = [];
        const placeholders: string[] = [];
        let paramIndex = 1;

        for (const row of batch) {
            // Skip rows without essential data
            if (!row.player_name || !row.pitch_type) {
                skipped++;
                continue;
            }

            // Parse numeric values
            const releaseSpeed = row.release_speed ? parseFloat(row.release_speed) : null;
            const spinRate = row.release_spin_rate ? parseInt(row.release_spin_rate) : null;
            const pfxX = row.pfx_x ? parseFloat(row.pfx_x) : null;
            const pfxZ = row.pfx_z ? parseFloat(row.pfx_z) : null;
            const gameDate = row.game_date || null;
            const pThrows = row.p_throws || null;

            placeholders.push(
                `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
            );
            values.push(
                row.player_name,
                row.pitch_type,
                releaseSpeed,
                spinRate,
                pfxX,
                pfxZ,
                gameDate,
                pThrows
            );
        }

        if (placeholders.length > 0) {
            try {
                await query(
                    `INSERT INTO mlb_pitches (pitcher_name, pitch_type, release_speed, release_spin_rate, pfx_x, pfx_z, game_date, p_throws)
           VALUES ${placeholders.join(', ')}`,
                    values
                );
                inserted += placeholders.length;
            } catch (error) {
                console.error(`Error inserting batch: ${error}`);
                errors += batch.length;
            }
        }

        // Progress update
        if ((i + batchSize) % 5000 === 0 || i + batchSize >= rows.length) {
            const progress = Math.min(100, Math.round(((i + batchSize) / rows.length) * 100));
            console.log(`   Progress: ${progress}% (${inserted} inserted, ${skipped} skipped)`);
        }
    }

    console.log(`\n✅ Complete! Inserted: ${inserted}, Skipped: ${skipped}, Errors: ${errors}`);

    return { inserted, skipped, errors };
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
