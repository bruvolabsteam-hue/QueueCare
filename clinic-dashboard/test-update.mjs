import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oddvrnamlsenvftbnzic.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '...'; // Needs correct key

// Actually, I can just use execute_sql to update a patient and see what happens?
// Or I can test with the service role key? If it works with service role, it's an RLS issue.
