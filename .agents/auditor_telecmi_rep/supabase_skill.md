# Supabase Skill Instructions
Loaded from c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\skills\supabase\SKILL.md

## Core Principles
1. Verify against changelog and current docs before implementing.
2. Verify your work.
3. Recover from errors, don't loop.
4. Exposing tables to Data API requires explicit GRANTs.
5. Enable RLS on every table in exposed schemas.
6. Run through the security checklist:
   - Auth and session security: no user_metadata for JWT auth decisions.
   - API key exposure: never expose service_role or secret key.
   - RLS, views, and privileged database code: security_invoker = true on views, UPDATE needs SELECT policy, TO authenticated instead of auth.role() = 'authenticated', UPDATE needs USING and WITH CHECK, SECURITY DEFINER functions run with postgres privileges (use SECURITY INVOKER instead).
   - Storage access control.
   - Pin package versions.
