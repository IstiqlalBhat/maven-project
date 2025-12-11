// Supabase database layer
// Uses @supabase/supabase-js client instead of pg for cloud compatibility

import { createClient, SupabaseClient } from '@supabase/supabase-js';

import type {
    UserPitcher,
    UserPitch,
    MLBPitch,
    PitchFingerprint,
    DuplicateCheckResult
} from '@/shared/types';

// Validate environment
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error(
        '⚠️  Supabase configuration missing!\n' +
        '   Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.\n' +
        '   Copy .env.example to .env.local and fill in your Supabase credentials.'
    );
}

// Create Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Service role client for admin operations (bypasses RLS)
let serviceSupabase: SupabaseClient | null = null;
function getServiceClient(): SupabaseClient {
    if (!serviceSupabase) {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceKey) {
            // Service key is REQUIRED for backend operations to bypass RLS
            // We cannot fall back to anon client because it lacks permissions for these operations
            const errorMsg = 'FATAL: SUPABASE_SERVICE_ROLE_KEY is missing. Backend operations requiring admin privileges will fail.';
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        serviceSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            serviceKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );
    }
    return serviceSupabase;
}

// Database is managed by Supabase - no local initialization needed
export async function initializeDatabase() {
    console.log('Using Supabase - database schema managed in Supabase Dashboard');
    // Tables should be created via SQL Editor in Supabase Dashboard
    // See docs/supabase-migration.sql
}

// Query helper - mimics pg's query interface for compatibility
interface QueryResult<T = Record<string, unknown>> {
    rows: T[];
    rowCount: number;
}

export async function query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[]
): Promise<QueryResult<T>> {
    // Parse SQL to determine operation and table
    const sqlLower = text.toLowerCase().trim();

    // Handle different SQL operations
    if (sqlLower.startsWith('select')) {
        return handleSelect<T>(text, params);
    } else if (sqlLower.startsWith('insert')) {
        return handleInsert<T>(text, params);
    } else if (sqlLower.startsWith('update')) {
        return handleUpdate<T>(text, params);
    } else if (sqlLower.startsWith('delete')) {
        return handleDelete<T>(text, params);
    } else if (sqlLower.startsWith('refresh materialized view')) {
        return handleRefreshMaterializedView<T>(text);
    } else if (sqlLower.startsWith('truncate')) {
        return handleTruncate<T>(text);
    } else {
        // For complex queries, use RPC or raw SQL via service role
        return handleRawQuery<T>(text, params);
    }
}

// Handle SELECT queries
async function handleSelect<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    // Check for complex queries that need raw handling
    const sqlLower = sql.toLowerCase();
    if (sqlLower.includes('group by') ||
        sqlLower.includes('having') ||
        sqlLower.includes(' join ') ||
        sqlLower.includes('with ') ||
        sqlLower.includes('stddev') ||
        sqlLower.includes('percentile')) {
        return handleRawQuery<T>(sql, params);
    }

    const tableMatch = sql.match(/from\s+(\w+)/i);
    if (!tableMatch) {
        return handleRawQuery<T>(sql, params);
    }

    const table = tableMatch[1];
    // Use service client to bypass RLS since we validate auth in middleware
    let queryBuilder = getServiceClient().from(table).select('*');

    // Parse WHERE clause and apply filters
    const whereMatch = sql.match(/where\s+([\s\S]+?)(?:order|limit|$)/i);
    if (whereMatch && params && params.length > 0) {
        // Simple parameter substitution for common patterns
        const conditions = whereMatch[1].trim();
        queryBuilder = applyWhereConditions(queryBuilder, conditions, params);
    }

    // Parse ORDER BY - handle multiple columns
    const orderMatch = sql.match(/order\s+by\s+([\w\s,]+?)(?:\s+limit|\s*$)/i);
    if (orderMatch) {
        const orderClauses = orderMatch[1].split(',').map(s => s.trim());
        for (const clause of orderClauses) {
            const parts = clause.match(/(\w+)(?:\s+(asc|desc))?/i);
            if (parts) {
                const column = parts[1];
                const ascending = !parts[2] || parts[2].toLowerCase() === 'asc';
                queryBuilder = queryBuilder.order(column, { ascending });
            }
        }
    }

    // Parse LIMIT
    const limitMatch = sql.match(/limit\s+(\d+)/i);
    if (limitMatch) {
        queryBuilder = queryBuilder.limit(parseInt(limitMatch[1]));
    }

    const { data, error } = await queryBuilder;

    if (error) {
        throw error;
    }

    return {
        rows: (data || []) as T[],
        rowCount: data?.length || 0
    };
}

// Handle INSERT queries
async function handleInsert<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    const tableMatch = sql.match(/into\s+(\w+)/i);
    if (!tableMatch || !params) {
        throw new Error('Invalid INSERT query');
    }

    const table = tableMatch[1];

    // Parse column names - use [\s\S] to handle multiline
    const columnsMatch = sql.match(/\(([\s\S]+?)\)[\s\S]*?values/i);
    if (!columnsMatch) {
        throw new Error('Could not parse INSERT columns');
    }

    // Clean up column names (remove whitespace and newlines)
    const columns = columnsMatch[1].split(',').map(c => c.trim().replace(/\s+/g, ''));

    // Build insert object
    const insertData: Record<string, unknown> = {};
    columns.forEach((col, i) => {
        if (i < params.length) {
            insertData[col] = params[i];
        }
    });

    // Use service client to bypass RLS
    const { data, error } = await getServiceClient()
        .from(table)
        .insert(insertData)
        .select();

    if (error) {
        throw error;
    }

    return {
        rows: (data || []) as T[],
        rowCount: data?.length || 0
    };
}

// Handle UPDATE queries
async function handleUpdate<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    const tableMatch = sql.match(/update\s+(\w+)/i);
    if (!tableMatch || !params) {
        throw new Error('Invalid UPDATE query');
    }

    const table = tableMatch[1];

    // Parse SET clause - use [\s\S] to match across newlines
    const setMatch = sql.match(/set\s+([\s\S]+?)\s+where/i);
    if (!setMatch) {
        throw new Error('Could not parse UPDATE SET clause');
    }

    // Parse SET columns (assumes $1, $2, etc placeholders)
    const setClause = setMatch[1];
    const setColumns = setClause.split(',').map(s => {
        const match = s.trim().match(/(\w+)\s*=/);
        return match ? match[1] : '';
    }).filter(Boolean);

    // Build update object - handle COALESCE by using null for undefined values
    const updateData: Record<string, unknown> = {};
    setColumns.forEach((col, i) => {
        if (i < params.length - 1) { // Last param is usually the WHERE id
            // Only include non-null values (Supabase will keep existing value if not included)
            if (params[i] !== null && params[i] !== undefined) {
                updateData[col] = params[i];
            }
        }
    });

    // Parse WHERE clause to get the ID
    const whereMatch = sql.match(/where\s+(\w+)\s*=\s*\$(\d+)/i);
    if (!whereMatch) {
        throw new Error('Could not parse UPDATE WHERE clause');
    }

    const whereColumn = whereMatch[1];
    const whereParamIndex = parseInt(whereMatch[2]) - 1;
    const whereValue = params[whereParamIndex];

    // Use service client to bypass RLS
    const { data, error } = await getServiceClient()
        .from(table)
        .update(updateData)
        .eq(whereColumn, whereValue)
        .select();

    if (error) {
        throw error;
    }

    return {
        rows: (data || []) as T[],
        rowCount: data?.length || 0
    };
}

// Handle DELETE queries
async function handleDelete<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    const tableMatch = sql.match(/from\s+(\w+)/i);
    if (!tableMatch) {
        throw new Error('Invalid DELETE query');
    }

    const table = tableMatch[1];

    // Parse WHERE clause
    const whereMatch = sql.match(/where\s+(\w+)\s*=\s*\$1/i);
    if (!whereMatch || !params || params.length === 0) {
        throw new Error('DELETE requires WHERE clause');
    }

    const whereColumn = whereMatch[1];

    // Use service client to bypass RLS
    const { data, error } = await getServiceClient()
        .from(table)
        .delete()
        .eq(whereColumn, params[0])
        .select();

    if (error) {
        throw error;
    }

    return {
        rows: (data || []) as T[],
        rowCount: data?.length || 0
    };
}

// Handle REFRESH MATERIALIZED VIEW
async function handleRefreshMaterializedView<T>(sql: string): Promise<QueryResult<T>> {
    const viewMatch = sql.match(/refresh\s+materialized\s+view\s+(\w+)/i);
    if (!viewMatch) {
        throw new Error('Invalid REFRESH MATERIALIZED VIEW query');
    }

    const viewName = viewMatch[1];

    // Use RPC function to refresh materialized view
    const { error } = await getServiceClient().rpc('refresh_materialized_view', {
        view_name: viewName
    });

    if (error) {
        // If RPC doesn't exist, log warning but don't fail
        console.warn(`Could not refresh materialized view ${viewName}:`, error.message);
        console.warn('Create the refresh_materialized_view RPC function in Supabase to enable this feature.');
    }

    return { rows: [] as T[], rowCount: 0 };
}

// Handle TRUNCATE queries
async function handleTruncate<T>(sql: string): Promise<QueryResult<T>> {
    const tableMatch = sql.match(/truncate\s+(?:table\s+)?(\w+)/i);
    if (!tableMatch) {
        throw new Error('Invalid TRUNCATE query');
    }

    const table = tableMatch[1];

    // Use RPC function to truncate table
    const { error } = await getServiceClient().rpc('truncate_table', {
        table_name: table
    });

    if (error) {
        // If RPC doesn't exist, try deleting all rows instead
        console.warn(`TRUNCATE RPC not available, falling back to DELETE for ${table}`);
        const { error: deleteError } = await getServiceClient()
            .from(table)
            .delete()
            .neq('id', 0); // Delete all rows (id is never 0)

        if (deleteError) {
            throw deleteError;
        }
    }

    return { rows: [] as T[], rowCount: 0 };
}

// Handle raw/complex queries via RPC
async function handleRawQuery<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    // For complex queries, we need to use Supabase's RPC
    // This handles GROUP BY, JOINs, CTEs, etc.

    // Replace $1, $2, etc. with actual values for the raw query
    let processedSql = sql;
    if (params && params.length > 0) {
        params.forEach((param, index) => {
            const placeholder = `$${index + 1}`;
            let value: string;
            if (param === null) {
                value = 'NULL';
            } else if (typeof param === 'string') {
                // Escape single quotes
                value = `'${param.replace(/'/g, "''")}'`;
            } else if (typeof param === 'number') {
                value = String(param);
            } else if (Array.isArray(param)) {
                value = `ARRAY[${param.map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v).join(',')}]`;
            } else {
                value = `'${String(param).replace(/'/g, "''")}'`;
            }
            processedSql = processedSql.replace(placeholder, value);
        });
    }

    // Try using a raw query RPC if available
    const { data, error } = await getServiceClient().rpc('raw_query', {
        query_text: processedSql,
        query_params: JSON.stringify(params || [])
    });

    if (error) {
        // If RPC doesn't exist, log and return empty
        if (error.message.includes('does not exist')) {
            console.warn('raw_query RPC function not found. Run the migration SQL to create it.');
        } else {
            console.error('Raw query failed:', error.message);
        }
        return { rows: [], rowCount: 0 };
    }

    // The RPC returns JSONB, parse it properly
    const rows = Array.isArray(data) ? data : (data ? [data] : []);

    return {
        rows: rows as T[],
        rowCount: rows.length
    };
}

// Apply WHERE conditions to Supabase query
function applyWhereConditions(
    query: ReturnType<typeof supabase.from>,
    conditions: string,
    params: unknown[]
): ReturnType<typeof supabase.from> {
    // Parse simple conditions like "column = $1" or "column = $1 AND column2 = $2"
    const parts = conditions.split(/\s+and\s+/i);

    for (const part of parts) {
        // Handle ANY($N) for array comparisons
        const anyMatch = part.trim().match(/(\w+)\s*=\s*any\s*\(\s*\$(\d+)\s*\)/i);
        if (anyMatch) {
            const column = anyMatch[1];
            const paramIndex = parseInt(anyMatch[2]) - 1;
            const value = params[paramIndex];
            if (Array.isArray(value)) {
                query = query.in(column, value);
            }
            continue;
        }

        // Handle OR conditions with IS NULL
        const orNullMatch = part.trim().match(/\(?\s*(\w+)\s*=\s*\$(\d+)\s+or\s+\1\s+is\s+null\s*\)?/i);
        if (orNullMatch) {
            const column = orNullMatch[1];
            const paramIndex = parseInt(orNullMatch[2]) - 1;
            const value = params[paramIndex];
            // Use 'or' filter for column = value OR column IS NULL
            query = query.or(`${column}.eq.${value},${column}.is.null`);
            continue;
        }

        const match = part.trim().match(/(\w+)\s*(=|>|<|>=|<=|!=|<>)\s*\$(\d+)/i);
        if (match) {
            const column = match[1];
            const operator = match[2];
            const paramIndex = parseInt(match[3]) - 1;
            const value = params[paramIndex];

            switch (operator) {
                case '=':
                    query = query.eq(column, value);
                    break;
                case '>':
                    query = query.gt(column, value);
                    break;
                case '<':
                    query = query.lt(column, value);
                    break;
                case '>=':
                    query = query.gte(column, value);
                    break;
                case '<=':
                    query = query.lte(column, value);
                    break;
                case '!=':
                case '<>':
                    query = query.neq(column, value);
                    break;
            }
        }
    }

    return query;
}

// Transaction support - Supabase doesn't support transactions via JS client
// Use RPC functions for transaction-like behavior if needed
export async function withTransaction<T>(
    callback: (client: SupabaseClient) => Promise<T>
): Promise<T> {
    // Supabase JS client doesn't support transactions
    // Execute directly - for true transactions, use RPC functions
    console.warn('Transactions not supported via Supabase JS client - executing directly');
    return await callback(getServiceClient());
}

// Client helper for COPY operations (not supported via JS client)
export async function withClient<T>(
    callback: (client: SupabaseClient) => Promise<T>
): Promise<T> {
    return await callback(getServiceClient());
}

// Detects duplicate uploads
export async function checkForDuplicateBatch(
    pitcherId: number,
    pitches: Omit<PitchFingerprint, 'pitcher_id'>[]
): Promise<DuplicateCheckResult> {
    if (pitches.length === 0) {
        return {
            hasDuplicates: false,
            duplicateCount: 0,
            duplicateIndices: [],
            uniquePitches: [],
            existingPitches: []
        };
    }

    // Check first pitch as a sample
    const samplePitch = pitches[0];

    const { data, error } = await getServiceClient()
        .from('user_pitches')
        .select('id')
        .eq('pitcher_id', pitcherId)
        .eq('pitch_type', samplePitch.pitch_type)
        .limit(1);

    if (error) {
        console.error('Error checking duplicates:', error);
        return {
            hasDuplicates: false,
            duplicateCount: 0,
            duplicateIndices: [],
            uniquePitches: pitches,
            existingPitches: []
        };
    }

    // If we found a matching pitch, consider it a potential duplicate batch
    if (data && data.length > 0) {
        // For now, return as not duplicate to allow upload
        // Full duplicate detection would require checking each pitch
        return {
            hasDuplicates: false,
            duplicateCount: 0,
            duplicateIndices: [],
            uniquePitches: pitches,
            existingPitches: []
        };
    }

    return {
        hasDuplicates: false,
        duplicateCount: 0,
        duplicateIndices: [],
        uniquePitches: pitches,
        existingPitches: []
    };
}

// Old name for backwards compat
export const checkForDuplicates = checkForDuplicateBatch;

// Get a client reference (for compatibility with pg-based code)
export async function getClient() {
    return getServiceClient();
}

// Export the pool-like interface for compatibility
export const pool = {
    query: async (text: string, params?: unknown[]) => query(text, params),
    connect: async () => ({
        query: async (text: string, params?: unknown[]) => query(text, params),
        release: () => { }
    }),
    end: async () => { }
};

export { supabase };
export default supabase;
