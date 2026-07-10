# BruvoFlow Platform

BruvoFlow is a dual-dashboard platform designed to streamline clinic wait times and patient queueing. 

## Live Deployments
- **Super Admin Dashboard:** [https://bruvoflow-superadmin.vercel.app](https://bruvoflow-superadmin.vercel.app)
- **Clinic Dashboard:** [https://bruvoflow-bruvolabs.vercel.app](https://bruvoflow-bruvolabs.vercel.app)

## Project Structure
- `/super_admin_web` - The Next.js 16/TypeScript dashboard for system administrators. Manages platform billing, API keys, and global AI configuration.
- `/clinic-dashboard` - The frontend for clinic staff to manage patients and live queues.
- `/supabase` - Contains the database migrations, Edge Functions, and RLS policies for the Supabase backend.
