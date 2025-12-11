# Deployment Guide

Quick guide for testing locally and deploying to production.

## Environment Files

| File | Purpose | Committed to Git? |
|------|---------|-------------------|
| `.env.example` | Template (no secrets) | ✅ Yes |
| `.env.local` | Local dev with TESTING Supabase | ❌ No |
| `.env` | Production credentials | ❌ No |

| Environment | Supabase Project | Purpose |
|-------------|------------------|---------|
| **Testing** | `ttuwsoparxwtvwpldeko` | Local development |
| **Production** | `ginjqjqzbpecymsknxea` | Live application |

---

## Quick Start: Local Development

### 1. Verify Environment
Your `.env.local` is already set up with testing Supabase credentials.

### 2. Setup Database Schema
Run these SQL files in your **testing** Supabase SQL Editor:
1. `docs/supabase-migration.sql` - Creates tables and base schema
2. `docs/supabase-rpc-functions.sql` - Creates RPC functions for analytics

### 3. Run Locally
```powershell
npm run dev
```

### 4. Test RPC Functions
In Supabase SQL Editor, run:
```sql
SELECT get_pitcher_arsenal_stats(1);
SELECT get_mlb_pitch_percentiles(ARRAY['FF', 'CU']);
```

---

## Deploy to Production

### 1. Setup Production Database
Run the same SQL files in your **production** Supabase SQL Editor:
1. `docs/supabase-migration.sql`
2. `docs/supabase-rpc-functions.sql`

### 2. Configure Vercel Environment Variables
In Vercel Dashboard → Settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your production Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production service role key |
| `ADMIN_PASSWORD` | Your admin password |
| `GEMINI_API_KEY` | Your Gemini API key |
| `NEXT_PUBLIC_FIREBASE_*` | All Firebase credentials |

### 3. Deploy
```powershell
# Via Vercel CLI
vercel --prod

# Or push to main branch (auto-deploys)
git push origin main
```

---

## Environment Switching

The app automatically detects which environment it's running in:

- **`.env.local`** - Used when running `npm run dev` locally
- **Vercel Environment Variables** - Used in production deployment

No code changes needed to switch between environments.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Supabase config missing" | Check `.env.local` has correct values |
| RPC function not found | Run `supabase-rpc-functions.sql` in SQL Editor |
| Auth not working | Verify Firebase credentials match your project |
