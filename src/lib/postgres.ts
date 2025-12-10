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
    // SSL configuration for production
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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
      -- User pitcher profiles
      CREATE TABLE IF NOT EXISTS user_pitchers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        age INTEGER,
        throws VARCHAR(1) CHECK(throws IN ('L', 'R')),
        level VARCHAR(50),
        primary_pitch VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

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
      CREATE INDEX IF NOT EXISTS idx_mlb_pitches_type ON mlb_pitches(pitch_type);
      CREATE INDEX IF NOT EXISTS idx_mlb_pitches_pitcher ON mlb_pitches(pitcher_name);
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
