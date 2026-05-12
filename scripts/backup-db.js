import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// 1. Configuration - Replace these or use environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_SECRET_KEY) {
  console.error('Error: SUPABASE_SECRET_KEY is required.');
  console.log('Usage: $env:SUPABASE_SECRET_KEY="your_key"; node scripts/backup-db.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

const TABLES = [
  'profiles',
  'company_profiles',
  'seasons',
  'farmers',
  'purchases',
  'buying_prices',
  'agent_capital_advances',
  'advances',
  'agent_settlements',
  'farmer_payments',
  'expenses',
  'sale_reports'
];

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFolder = `backup-${timestamp}`;
  const backupDir = path.join(process.cwd(), 'backups', backupFolder);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Ensure 'backups' bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find(b => b.name === 'backups')) {
    console.log('Creating "backups" storage bucket...');
    await supabase.storage.createBucket('backups', { public: false });
  }

  console.log(`Starting backup to ${backupDir} and Supabase Storage...`);

  for (const table of TABLES) {
    console.log(`Backing up table: ${table}...`);
    const { data, error } = await supabase.from(table).select('*');

    if (error) {
      console.error(`Error fetching table ${table}:`, error.message);
      continue;
    }

    const filePath = path.join(backupDir, `${table}.json`);
    const fileContent = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, fileContent);
    console.log(`Saved ${data.length} records to local ${table}.json`);

    // Upload to Supabase Storage
    const storagePath = `${backupFolder}/${table}.json`;
    const { error: uploadError } = await supabase.storage
      .from('backups')
      .upload(storagePath, fileContent, {
        contentType: 'application/json',
        upsert: true
      });

    if (uploadError) {
      console.error(`Error uploading ${table}.json to storage:`, uploadError.message);
    } else {
      console.log(`Uploaded ${table}.json to Supabase Storage.`);
    }
  }

  console.log('\nBackup complete!');
}

backup().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
