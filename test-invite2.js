// test-invite2.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = "https://ffqihcnkjqgkrjrsztxw.supabase.co/functions/v1/invite-agent";
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  // Login as admin first
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@example.com', // Need a real admin email to test, using dummy for now or auth from CLI
    password: 'password123'
  });
  
  if (authErr) {
    console.log("Auth error:", authErr.message);
    // Let's just create a dummy request to see what it returns
    // In reality, testing the cloud function without an actual admin JWT is hard locally. Let me rethink.
  }
}
test();
