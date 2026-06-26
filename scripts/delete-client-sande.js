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

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and SUPABASE_SECRET_KEY must be in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const clientId = '16b0d05f-8efc-4c30-b0ae-089c4f7f9fcd';

async function deleteClientAndHistory() {
  console.log(`Starting deletion for Sande Joram (ID: ${clientId})...`);

  // 1. Fetch farmer
  const { data: farmer, error: fErr } = await supabase
    .from('farmers')
    .select('*')
    .eq('id', clientId)
    .maybeSingle();

  if (fErr) {
    console.error('Error finding farmer:', fErr.message);
    process.exit(1);
  }

  if (!farmer) {
    console.warn(`Farmer with ID ${clientId} not found. Deletion script aborting.`);
    process.exit(0);
  }

  console.log(`Found client: ${farmer.name} (Phone: ${farmer.phone}, Village: ${farmer.village})`);

  // 2. Delete farmer_payments
  console.log('Deleting farmer payments...');
  const { data: payDel, error: payErr } = await supabase
    .from('farmer_payments')
    .delete()
    .eq('farmer_id', clientId)
    .select();
  if (payErr) {
    console.error('Error deleting farmer_payments:', payErr.message);
  } else {
    console.log(`Deleted ${payDel?.length || 0} payment records.`);
  }

  // 3. Delete purchases
  console.log('Deleting purchases...');
  const { data: purchDel, error: purchErr } = await supabase
    .from('purchases')
    .delete()
    .eq('farmer_id', clientId)
    .select();
  if (purchErr) {
    console.error('Error deleting purchases:', purchErr.message);
  } else {
    console.log(`Deleted ${purchDel?.length || 0} purchase records.`);
  }

  // 4. Delete advances
  console.log('Deleting advances...');
  const { data: advDel, error: advErr } = await supabase
    .from('advances')
    .delete()
    .eq('farmer_id', clientId)
    .select();
  if (advErr) {
    console.error('Error deleting advances:', advErr.message);
  } else {
    console.log(`Deleted ${advDel?.length || 0} advance records.`);
  }

  // 5. Delete farmer record
  console.log('Deleting farmer from farmers table...');
  const { data: farmerDel, error: farmerErr } = await supabase
    .from('farmers')
    .delete()
    .eq('id', clientId)
    .select();
  if (farmerErr) {
    console.error('Error deleting farmer:', farmerErr.message);
  } else {
    console.log(`Deleted farmer record:`, farmerDel);
  }

  console.log('Deletion complete!');
}

deleteClientAndHistory().catch(e => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
