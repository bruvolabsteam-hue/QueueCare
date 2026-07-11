# BRIEFING — 2026-07-11T06:17:30Z

## Mission
Fix critical errors in the BruvoFlow AI infrastructure, specifically updating schema, settings API, Settings UI, Claude client, and Exotel webhooks.

## 🔒 My Identity
- Archetype: Senior Developer
- Roles: implementer, qa, specialist
- Working directory: c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\senior_developer_m2_m3
- Original parent: ac7e2f40-701f-4a86-97f9-a3dd012ae5a1
- Milestone: Fixing BruvoFlow AI infrastructure errors

## 🔒 Key Constraints
- CODE_ONLY network mode (no external HTTP/HTTPS calls to non-local domains)
- Integrity Mandate (genuine implementation, no hardcoded values or bypasses)
- All writes inside own folder or specific requested files

## Current Parent
- Conversation ID: ac7e2f40-701f-4a86-97f9-a3dd012ae5a1
- Updated: not yet

## Task Summary
- **What to build**: Database migration for `ollama_model`, GET/POST endpoints in `/api/settings`, AI settings UI update, dynamic model call in Claude/Ollama client, absolute paths in Exotel webhooks.
- **Success criteria**: Next.js builds successfully (`npm run build` inside `super_admin_web`), tests and migrations are functional.
- **Interface contracts**: API routes support JSON payload; database schemas match specification.
- **Code layout**: `super_admin_web/src` for Next.js files, `supabase/migrations` for db migrations.

## Key Decisions Made
- Will check migration system first to see how migrations are managed and run.

## Loaded Skills
- **supabase**: c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\senior_developer_m2_m3\skills\supabase\SKILL.md — Use when doing database migrations or settings API interactions with Supabase.
- **supabase-postgres-best-practices**: c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\senior_developer_m2_m3\skills\supabase-postgres-best-practices\SKILL.md — Best practices for postgres database design and queries.

## Change Tracker
- **Files modified**:
  - `supabase/migrations/20260101000019_add_ollama_model.sql` (Added database migration)
  - `super_admin_web/src/app/api/settings/route.ts` (Implemented GET/POST settings API route)
  - `super_admin_web/src/app/(dashboard)/settings/ai/page.tsx` (Added settings UI field and save/load logic for ollama_model)
  - `super_admin_web/src/lib/ai/claude.ts` (Used dynamic model from settings)
  - `super_admin_web/src/app/api/webhooks/exotel/route.ts` (Used absolute URLs for Exotel playback/gather actions)
- **Build status**: Running npm run build in background
- **Pending issues**: None

## Quality Status
- **Build/test result**: In Progress
- **Lint status**: Clean
- **Tests added/modified**: None

## Artifact Index
- c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\senior_developer_m2_m3\progress.md — Liveness heartbeat and progress tracking.
- c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\senior_developer_m2_m3\handoff.md — Handoff report.
