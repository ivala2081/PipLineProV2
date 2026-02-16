#!/usr/bin/env node
/**
 * Replace YOUR_ORG_ID with actual organization ID
 */

const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter your organization UUID: ', (orgId) => {
  if (!orgId || orgId.trim() === '') {
    console.error('❌ No organization ID provided');
    rl.close();
    process.exit(1);
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(orgId.trim())) {
    console.error('❌ Invalid UUID format');
    rl.close();
    process.exit(1);
  }

  const sql = fs.readFileSync('insert-transfers.sql', 'utf-8');
  const updated = sql.replaceAll('YOUR_ORG_ID', orgId.trim());
  fs.writeFileSync('insert-transfers-final.sql', updated);

  console.log('\n✅ SQL file updated: insert-transfers-final.sql');
  console.log('\nNext step:');
  console.log('Run insert-transfers-final.sql in Supabase SQL Editor');

  rl.close();
});
