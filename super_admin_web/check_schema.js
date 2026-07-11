const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:/Users/HOME/OneDrive/Attachments/ai agent/super_admin_web/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const { data, error } = await supabase.from('global_settings').select('*');
  console.log("global_settings data:", data);
  console.log("global_settings error:", error);
}
run();
