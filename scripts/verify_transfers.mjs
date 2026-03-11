import fs from 'fs';

const SUPABASE_URL = 'https://mnbjpcidjawvygkimgma.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uYmpwY2lkamF3dnlna2ltZ21hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYzNTQxNSwiZXhwIjoyMDg2MjExNDE1fQ.iIHcfXIeeCG69cNlXk8AKaem0N682UkSFm3zyVLW3hw';
const ORG_ID = '79e1ae79-8acc-4144-9c08-d94609123f6d';

const res = await fetch(`${SUPABASE_URL}/rest/v1/transfers?organization_id=eq.${ORG_ID}&transfer_date=gte.2026-03-01&transfer_date=lte.2026-03-31&employee_id=not.is.null&select=id,full_name,crm_id,category_id,transfer_date,amount_usd,is_first_deposit,employee_id,hr_employees:employee_id(full_name,role)&order=transfer_date.asc&limit=300`, {
  headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
});
const data = await res.json();
console.log('Total assigned:', data.length);
console.log('');

const byDate = {};
data.forEach(t => {
  const d = t.transfer_date.split('T')[0];
  if (!byDate[d]) byDate[d] = [];
  byDate[d].push(t);
});

for (const [date, transfers] of Object.entries(byDate).sort()) {
  console.log('--- ' + date + ' (' + transfers.length + ' transfers) ---');
  transfers.forEach(t => {
    const emp = t.hr_employees?.full_name || 'N/A';
    const role = t.hr_employees?.role || '';
    const cat = t.category_id;
    const fd = t.is_first_deposit ? ' [FD]' : '';
    console.log('  ' + t.full_name.padEnd(28) + ' | ' + String(t.amount_usd).padStart(10) + ' USD | ' + cat + fd + ' → ' + emp + ' (' + role + ')');
  });
}
