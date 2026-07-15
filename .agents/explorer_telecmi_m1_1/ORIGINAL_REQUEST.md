## 2026-07-15T01:50:40Z
Analyze the codebase and provide a detailed report on:
1. All database migrations and table schemas that contain references to 'exotel' or 'whatsapp' (e.g. global_settings, clinics, platform_settings tables). Document which columns need to be dropped, and specify the new sql statement to add:
   - `telecmi_app_id` (text)
   - `telecmi_secret_key` (text)
   - `brain_url` (text, default 'https://api.groq.com/openai/v1')
   - `brain_model` (text, default 'llama-3.1-8b-instant')
   - `brain_api_key` (text)
   - `telecmi_caller_id` (varchar) on the clinics table
   - `master_telecmi_balance` (numeric) on the platform_settings table.
Specify how to update/re-write the database RPC function `increment_usage_and_deduct_master` to decrement `master_telecmi_balance` when voice/messaging functions are triggered.
Write your analysis and proposed database schema update to handoff.md inside your working directory.
