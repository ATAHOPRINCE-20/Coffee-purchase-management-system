import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('Error: VITE_SUPABASE_URL and SUPABASE_SECRET_KEY must be set as environment variables.');
  console.log('Usage: $env:SUPABASE_SECRET_KEY="your_key"; node scripts/check-buckets.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

async function check() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error('Error listing buckets:', error.message);
  } else {
    console.log('Buckets:', data.map(b => b.name));
  }
}

check();
