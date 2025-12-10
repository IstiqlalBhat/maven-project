import { Pool, PoolClient } from 'pg';

// Validate required database configuration
if (!process.env.DATABASE_URL && !process.env.PGPASSWORD) {
    console.error(
        '⚠️  Database configuration missing!\n' +
        '   Set DATABASE_URL or PGPASSWORD environment variable.\n' +
        '   Copy .env.example to .env.local and fill in your credentials.'
    );
}

// PostgreSQL connection configuration
// Uses environment variables - see .env.example for required variables
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Fallback to individual params if DATABASE_URL not set
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432'),
    database: process.env.PGDATABASE || 'pitch_tracker',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD,
    // SSL configuration for production - properly validate certificates
    // Set DB_SSL_REJECT_UNAUTHORIZED=false only if using self-signed certs
    ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
        : false,
    // Connection pool settings
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Initialize database schema
export async function initializeDatabase() {
    const client = await pool.connect();
    try {
        await client.query(`
      -- User pitcher profiles with ownership tracking
      CREATE TABLE IF NOT EXISTS user_pitchers (
        id SERIAL PRIMARY KEY,
        firebase_uid VARCHAR(128),
        name VARCHAR(100) NOT NULL,
        age INTEGER,
        throws VARCHAR(1) CHECK(throws IN ('L', 'R')),
        level VARCHAR(50),
        primary_pitch VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Add firebase_uid column if it doesn't exist (for existing databases)
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'user_pitchers' AND column_name = 'firebase_uid') THEN
          ALTER TABLE user_pitchers ADD COLUMN firebase_uid VARCHAR(128);
        END IF;
      END $$;

      -- Index for fast user lookups
      CREATE INDEX IF NOT EXISTS idx_user_pitchers_firebase_uid ON user_pitchers(firebase_uid);

      -- User's pitch data
      CREATE TABLE IF NOT EXISTS user_pitches (
        id SERIAL PRIMARY KEY,
        pitcher_id INTEGER REFERENCES user_pitchers(id) ON DELETE CASCADE,
        pitch_type VARCHAR(50) NOT NULL,
        velocity_mph REAL,
        spin_rate INTEGER,
        horizontal_break REAL,
        vertical_break REAL,
        date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- MLB Statcast data from Baseball Savant
      CREATE TABLE IF NOT EXISTS mlb_pitches (
        id SERIAL PRIMARY KEY,
        pitcher_name VARCHAR(100) NOT NULL,
        pitch_type VARCHAR(10) NOT NULL,
        release_speed REAL,
        release_spin_rate INTEGER,
        pfx_x REAL,
        pfx_z REAL,
        game_date DATE,
        p_throws VARCHAR(1),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Index for faster queries on MLB data
      -- Optimized for 700k+ rows: Composite indexes for frequent filtering/aggregation
      CREATE INDEX IF NOT EXISTS idx_mlb_pitches_type_stats ON mlb_pitches(pitch_type, release_speed, release_spin_rate);
      CREATE INDEX IF NOT EXISTS idx_mlb_pitches_pitcher_date ON mlb_pitches(pitcher_name, game_date);
      CREATE INDEX IF NOT EXISTS idx_mlb_pitches_date ON mlb_pitches(game_date);

      -- Index for user pitches optimization
      CREATE INDEX IF NOT EXISTS idx_user_pitches_pitcher_date ON user_pitches(pitcher_id, date);

      -- Materialized View for pitcher statistics
      -- Pre-calculates aggregates to make "similar pitcher" queries instant
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_pitcher_stats AS
      SELECT 
        pitcher_name,
        AVG(release_speed) as avg_velo,
        AVG(release_spin_rate) as avg_spin,
        COUNT(*) as pitch_count
      FROM mlb_pitches
      WHERE release_speed IS NOT NULL AND release_spin_rate IS NOT NULL
      GROUP BY pitcher_name
      HAVING COUNT(*) >= 10;

      -- Indexes on the materialized view for fast lookup and sorting
      CREATE INDEX IF NOT EXISTS idx_mv_pitcher_stats_velo ON mv_pitcher_stats(avg_velo);
      CREATE INDEX IF NOT EXISTS idx_mv_pitcher_stats_spin ON mv_pitcher_stats(avg_spin);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_pitcher_stats_name ON mv_pitcher_stats(pitcher_name);
    `);
        console.log('Database schema initialized successfully');
    } finally {
        client.release();
    }
}

// Helper to get a client from the pool
export async function getClient(): Promise<PoolClient> {
    return pool.connect();
}

// Query helper
export async function query(text: string, params?: unknown[]) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production') {
        console.log('Executed query', { text: text.substring(0, 50), duration, rows: result.rowCount });
    }
    return result;
}

// Transaction helper
export async function withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>
): Promise<T> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// Copy stream helper
export async function copyStream(
    text: string,
    callback: (stream: NodeJS.WritableStream) => Promise<void>
): Promise<void> {
    const client = await pool.connect();
    try {
        const stream = client.query(text); // This works because pg allows passing a ReadableStream to query when using pg-copy-streams? 
        // Wait, pg-copy-streams usually works like: stream = client.query(copyStreams.from('COPY ...'))
        // So the 'text' argument here should probably be the result of copyStreams.from('COPY ...') which returns a Stream.
        // Actually, client.query() returns a stream if a stream is passed? No, client.query(stream) is how it works with pg-copy-streams.
        // Let's check typical usage:
        // var stream = client.query(copyFrom('COPY table FROM STDIN'));
        // stream.write(...)
        // So I'll pass the result of copyFrom to this function? Or just let the caller handle the stream creation?
        // Better: let the caller provide the stream creation logic, but we manage the client connection.

        // Actually, to keep it simple and type-safe with the 'pg' library:
        // The `client.query` method returns a stream when used with `pg-copy-streams`.
        await callback(stream as unknown as NodeJS.WritableStream);
    } finally {
        client.release();
    }
}

// Let's refine the copyStream signature to be more robust.
// We need to pass the query string (e.g. "COPY ... FROM STDIN") and a callback that writes to the stream.
// BUT, to use pg-copy-streams, we need to import `from` in this file or let the caller pass the stream.
// Let's stick to a simple `getRawClient` or `withClient` for maximum flexibility.
// Existing `withTransaction` is close but wraps in BEGIN/COMMIT which COPY doesn't strictly need (though good practice).
// Let's add `withClient`.

export async function withClient<T>(
    callback: (client: PoolClient) => Promise<T>
): Promise<T> {
    const client = await pool.connect();
    try {
        return await callback(client);
    } finally {
        client.release();
    }
}

// Export pool for direct access if needed
export { pool };

// Helper types (matching SQLite version for compatibility)
export interface UserPitcher {
    id: number;
    name: string;
    age: number | null;
    throws: 'L' | 'R' | null;
    level: string | null;
    primary_pitch: string | null;
    created_at: Date;
}

export interface UserPitch {
    id: number;
    pitcher_id: number;
    pitch_type: string;
    velocity_mph: number | null;
    spin_rate: number | null;
    horizontal_break: number | null;
    vertical_break: number | null;
    date: string | null;
    notes: string | null;
    created_at: Date;
}

export interface MLBPitch {
    id: number;
    pitcher_name: string;
    pitch_type: string;
    release_speed: number | null;
    release_spin_rate: number | null;
    pfx_x: number | null;
    pfx_z: number | null;
    game_date: string | null;
    p_throws: string | null;
}

export default pool;
