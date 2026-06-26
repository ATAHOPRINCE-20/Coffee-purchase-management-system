import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[key] = value.trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SECRET_KEY);
const testEmail = 'testadmin@example.com';
const testPassword = 'password123';

async function setup() {
  console.log('Checking for existing test admin...');
  
  // 1. Get user by email if it exists
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('Error listing users:', listErr.message);
    process.exit(1);
  }

  let user = users.find(u => u.email === testEmail);

  if (user) {
    console.log('Test admin user exists. Updating password...');
    const { data: updateData, error: updateErr } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: testPassword }
    );
    if (updateErr) {
      console.error('Error updating password:', updateErr.message);
      process.exit(1);
    }
    console.log('Password updated successfully.');
  } else {
    console.log('Creating new test admin user...');
    const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });
    if (createErr) {
      console.error('Error creating user:', createErr.message);
      process.exit(1);
    }
    user = createData.user;
    console.log('User created successfully:', user.id);
  }

  // 2. Ensure profile exists in public.profiles with role Admin
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profErr) {
    console.error('Error checking profile:', profErr.message);
    process.exit(1);
  }

  if (!profile) {
    console.log('Creating public profile for admin user...');
    const { error: insertErr } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: testEmail,
        role: 'Admin',
        full_name: 'Test Admin',
        admin_id: user.id // Point to self as admin
      });
    if (insertErr) {
      console.error('Error inserting profile:', insertErr.message);
      process.exit(1);
    }
    console.log('Profile created successfully.');
  } else {
    console.log('Public profile already exists:', profile);
    // Ensure role is Admin
    if (profile.role !== 'Admin') {
      console.log('Updating profile role to Admin...');
      const { error: updateRoleErr } = await supabase
        .from('profiles')
        .update({ role: 'Admin', admin_id: user.id })
        .eq('id', user.id);
      if (updateRoleErr) {
        console.error('Error updating role:', updateRoleErr.message);
        process.exit(1);
      }
      console.log('Profile role updated to Admin.');
    }
  }

  console.log('Test admin configuration complete!');
}

setup().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
