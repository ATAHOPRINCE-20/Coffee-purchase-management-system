import fs from 'fs';
import path from 'path';

// Read .env file from the project root
const envPath = path.resolve('f:/JANUARY 2026/Coffee Management System/.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const url = env.VITE_SUPABASE_URL || 'https://ffqihcnkjqgkrjrsztxw.supabase.co';
const key = env.SUPABASE_SECRET_KEY;

if (!key) {
  console.error('Error: SUPABASE_SECRET_KEY not found in .env file.');
  process.exit(1);
}

const ADVANCE_ID = 'd78c0815-6b5b-49d6-9df0-284618b6f143';
const LEDGER_ID = 'd62d2599-22cc-4706-af14-712cc0848be8';
const COMPANY_PROFILE_ID = 'a414398f-b9e0-40e9-a14d-dc69c24bcd24';

async function updateAdvance() {
  console.log('--- Database Correction Script ---');
  
  // 1. Correct the capital ledger entry for this purchase
  console.log(`Updating capital_ledger entry ${LEDGER_ID}...`);
  const ledgerRes = await fetch(`${url}/rest/v1/capital_ledger?id=eq.${LEDGER_ID}`, {
    method: 'PATCH',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      amount: -24815700
    })
  });
  
  if (!ledgerRes.ok) {
    throw new Error(`Failed to update capital_ledger: ${ledgerRes.statusText} - ${await ledgerRes.text()}`);
  }
  console.log('Capital ledger updated successfully.');

  // 2. Deduct the amount from the company profile's capital balance
  console.log(`Updating company profile capital balance for ${COMPANY_PROFILE_ID}...`);
  const companyRes = await fetch(`${url}/rest/v1/company_profiles?id=eq.${COMPANY_PROFILE_ID}`, {
    method: 'PATCH',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      capital: 35672800 // 60488500 - 24815700
    })
  });
  
  if (!companyRes.ok) {
    throw new Error(`Failed to update company capital: ${companyRes.statusText} - ${await companyRes.text()}`);
  }
  console.log('Company profile capital updated successfully.');

  // 3. Revert the deduction from Musiime Jackson's advance
  console.log(`Updating Musiime Jackson's advance ${ADVANCE_ID}...`);
  const advanceRes = await fetch(`${url}/rest/v1/advances?id=eq.${ADVANCE_ID}`, {
    method: 'PATCH',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      deducted: 12397000,   // 37212700 - 24815700 (Postgres will automatically recompute remaining = amount - deducted)
      status: 'Active'
    })
  });

  if (!advanceRes.ok) {
    throw new Error(`Failed to update advance: ${advanceRes.statusText} - ${await advanceRes.text()}`);
  }
  console.log('Musiime Jackson\'s advance updated successfully.');
  console.log('\nAll updates completed successfully!');
}

updateAdvance().catch(console.error);
