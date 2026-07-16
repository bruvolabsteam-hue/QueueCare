import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://oddvrnamlsenvftbnzic.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kZHZybmFtbHNlbnZmdGJuemljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxODIzMTgsImV4cCI6MjA5ODc1ODMxOH0.rQswYVsuuoOV6w3pZSBfmwJFS3ecNnAiDYDB-0gRars";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testLogin() {
  console.log('Testing login as admin1@queuecare.local...');
  
  let { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin1@queuecare.local',
    password: 'password123'
  });

  if (error) {
    console.log('Sign in failed:', error.message);
    if (error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed')) {
      console.log('Attempting sign up (auto-provision)...');
      const signUpRes = await supabase.auth.signUp({
        email: 'admin1@queuecare.local',
        password: 'password123',
        options: {
          data: { full_name: 'Super Admin Test' }
        }
      });
      if (signUpRes.error) {
        console.error('Sign up failed:', signUpRes.error.message);
        return;
      }
      console.log('Sign up successful, user ID:', signUpRes.data.user.id);
      
      console.log('Signing in again...');
      const signIn2 = await supabase.auth.signInWithPassword({
        email: 'admin1@queuecare.local',
        password: 'password123'
      });
      if (signIn2.error) {
        console.error('Second sign in failed:', signIn2.error.message);
        return;
      }
      data = signIn2.data;
    } else {
      return;
    }
  }

  console.log('Successfully authenticated!');
  console.log('Session user ID:', data.user.id);

  console.log('Testing RPC get_user_role...');
  const { data: roleData, error: roleError } = await supabase.rpc('get_user_role');
  
  if (roleError) {
    console.error('Error fetching role:', roleError);
  } else {
    console.log('User Role is:', roleData);
    if (roleData === 'super_admin') {
      console.log('✅ LOGIN BUG FIXED! User is correctly recognized as super_admin.');
    } else {
      console.log('❌ LOGIN BUG STILL PRESENT! User is', roleData);
    }
  }
}

testLogin().catch(console.error);
