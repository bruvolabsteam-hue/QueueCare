const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
  console.log('Creating super admin user...');
  
  // 1. Create User
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'admin@queuecare.com',
    password: 'password123',
    email_confirm: true,
    user_metadata: { full_name: 'Super Admin' }
  });

  if (authError) {
    console.error('Error creating user:', authError);
    return;
  }
  
  console.log('User created:', authData.user.email);
  
  // Wait a second for the trigger to insert into staff table
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 2. Promote to super_admin in the staff table
  const { error: updateError } = await supabase
    .from('staff')
    .update({ role: 'super_admin' })
    .eq('id', authData.user.id);
    
  if (updateError) {
    console.error('Error promoting user:', updateError);
  } else {
    console.log('Successfully promoted to super_admin!');
  }
}

seed();
