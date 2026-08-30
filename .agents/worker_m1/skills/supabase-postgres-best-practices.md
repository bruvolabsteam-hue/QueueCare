# Supabase Postgres Best Practices Reference

## Performance & Optimization Rules
1. Query Performance: Add indexes for foreign keys, filtered columns, order by, join keys. Use composite indexes with correct column order (equality first, then range/sort).
2. Security & RLS: Explicitly set search_path = public, pg_temp on SECURITY DEFINER functions to prevent search path hijacking.
3. Concurrency & Locking: Write idempotent migrations (`IF NOT EXISTS`, safe alter table statements).
4. Realtime: Ensure tables are added to publication `supabase_realtime` safely.
