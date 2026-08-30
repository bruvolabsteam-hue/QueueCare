# Supabase Skill Reference

## Core Principles
1. Verify against Supabase docs & schema before implementing.
2. Verify work with test queries.
3. Recover from errors, don't loop.
4. RLS in exposed schemas: enable RLS on every table in public.
5. Security checklist:
   - Views bypass RLS unless security_invoker = true.
   - UPDATE requires SELECT policy.
   - SECURITY DEFINER functions bypass RLS. SET search_path = public, pg_temp. Explicit grants to anon, authenticated, service_role.
