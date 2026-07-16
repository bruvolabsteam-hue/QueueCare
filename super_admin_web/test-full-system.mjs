/**
 * Create admin user via Supabase admin API then test login
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "http://127.0.0.1:54321";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const anonClient = createClient(SUPABASE_URL, ANON_KEY);

let passed = 0; let failed = 0;
function pass(msg) { console.log(`  ✅ PASS: ${msg}`); passed++; }
function fail(msg) { console.log(`  ❌ FAIL: ${msg}`); failed++; }

async function run() {
  console.log('🚀 BruvoLabs QueueCare — Full System Test\n');

  // STEP 0: Create admin user via admin API
  console.log('=== SETUP: Creating admin1@queuecare.local via admin API ===');
  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const exists = existingUsers?.users?.find(u => u.email === 'admin1@queuecare.local');
  
  let adminUserId;
  if (!exists) {
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: 'admin1@queuecare.local',
      password: 'Admin123!',
      email_confirm: true,
      user_metadata: { full_name: 'Super Admin 1' }
    });
    if (createErr) { console.error('  ❌ Failed to create user:', createErr.message); process.exit(1); }
    adminUserId = created.user.id;
    console.log('  ✅ Created admin user, ID:', adminUserId);
  } else {
    adminUserId = exists.id;
    // Update password to ensure it works
    await adminClient.auth.admin.updateUserById(adminUserId, { password: 'Admin123!' });
    console.log('  ✅ User exists, password reset. ID:', adminUserId);
  }

  // Ensure staff record exists as super_admin
  const { error: staffErr } = await adminClient
    .from('staff')
    .upsert({ id: adminUserId, email: 'admin1@queuecare.local', name: 'Super Admin 1', role: 'super_admin', is_active: true, clinic_id: null }, { onConflict: 'id' });
  if (staffErr) console.log('  ⚠️  Staff upsert warning:', staffErr.message);
  else console.log('  ✅ Staff record ensured as super_admin');

  // Ensure platform_settings row
  const { data: ps } = await adminClient.from('platform_settings').select('id').limit(1);
  if (!ps || ps.length === 0) {
    await adminClient.from('platform_settings').insert({ master_telecmi_balance: 1000, alert_threshold: 100 });
    console.log('  ✅ Platform settings seeded');
  }

  // Ensure global_settings row
  const { data: gs } = await adminClient.from('global_settings').select('id').limit(1);
  if (!gs || gs.length === 0) {
    await adminClient.from('global_settings').insert({ brain_url: 'https://api.groq.com/openai/v1', brain_model: 'llama-3.1-8b-instant' });
    console.log('  ✅ Global settings seeded');
  }

  console.log('\n=== TEST 1: Super Admin Login ===');
  const { data: loginData, error: loginErr } = await anonClient.auth.signInWithPassword({
    email: 'admin1@queuecare.local', password: 'Admin123!'
  });
  if (loginErr) { fail(`Login failed: ${loginErr.message}`); process.exit(1); }
  pass(`Logged in as ${loginData.user.email}`);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${loginData.session.access_token}` } }
  });

  console.log('\n=== TEST 2: Role Check (must be super_admin) ===');
  const { data: role, error: roleErr } = await userClient.rpc('get_user_role');
  if (roleErr) fail(`get_user_role failed: ${roleErr.message}`);
  else if (role === 'super_admin') pass(`Role confirmed: super_admin`);
  else fail(`Expected super_admin, got: ${role}`);

  console.log('\n=== TEST 3: Clinics Table Accessible ===');
  const { data: clinics, error: clinicsErr } = await userClient.from('clinics').select('id, clinic_name').limit(5);
  if (clinicsErr) fail(`Clinics query failed: ${clinicsErr.message}`);
  else pass(`Clinics accessible — ${clinics.length} found`);

  console.log('\n=== TEST 4: Queue Tokens Table ===');
  const { data: tokens, error: tokErr } = await userClient.from('queue_tokens').select('id, token_number, status').limit(5);
  if (tokErr) fail(`queue_tokens failed: ${tokErr.message}`);
  else pass(`queue_tokens accessible — ${tokens.length} tokens found`);

  console.log('\n=== TEST 5: Platform Settings (TeleCMI balance) ===');
  const { data: platform, error: platErr } = await userClient.from('platform_settings').select('master_telecmi_balance, alert_threshold').limit(1);
  if (platErr) fail(`platform_settings failed: ${platErr.message}`);
  else { pass(`TeleCMI balance: ${platform[0]?.master_telecmi_balance}`); }

  console.log('\n=== TEST 6: Global Settings (Brain + TeleCMI columns) ===');
  const { data: global, error: gErr } = await userClient.from('global_settings').select('brain_url, brain_model, brain_api_key, telecmi_app_id, telecmi_secret_key').limit(1);
  if (gErr) fail(`global_settings failed: ${gErr.message}`);
  else {
    pass(`brain_url: ${global[0]?.brain_url}`);
    if ('telecmi_app_id' in (global[0] || {})) pass('telecmi_app_id column exists');
    else fail('telecmi_app_id column missing');
  }

  console.log('\n=== TEST 7: Billing RPC (increment_usage_and_deduct_master) ===');
  // Create a test clinic first
  const { data: clinic } = await adminClient.from('clinics').select('id').limit(1);
  if (clinic && clinic.length > 0) {
    const { error: billingErr } = await userClient.rpc('increment_usage_and_deduct_master', {
      p_clinic_id: clinic[0].id, p_service: 'telecmi_voice'
    });
    if (billingErr) fail(`Billing RPC failed: ${billingErr.message}`);
    else pass('Billing RPC executed successfully');
  } else {
    console.log('  ⏭️  SKIP: No clinic found for billing test');
  }

  console.log(`\n=============================`);
  console.log(`✅ PASSED: ${passed}  ❌ FAILED: ${failed}`);
  console.log(`=============================`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
