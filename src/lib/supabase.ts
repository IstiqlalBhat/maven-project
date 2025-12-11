// Supabase client configuration
// For production database access

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client for browser/API routes (uses anon key + RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service role client for admin operations (bypasses RLS)
// Only use server-side, never expose to client
export function getServiceSupabase() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    }
    return createClient(supabaseUrl, serviceKey);
}
