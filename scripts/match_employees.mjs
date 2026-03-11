import fs from 'fs';

const SUPABASE_URL = 'https://mnbjpcidjawvygkimgma.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uYmpwY2lkamF3dnlna2ltZ21hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYzNTQxNSwiZXhwIjoyMDg2MjExNDE1fQ.iIHcfXIeeCG69cNlXk8AKaem0N682UkSFm3zyVLW3hw';
const ORG_ID = '79e1ae79-8acc-4144-9c08-d94609123f6d';

// HR Employees mapping
const HR_EMPLOYEES = [
  { id: "0399c31e-da83-4ede-8b10-cbf0a159420a", full_name: "CANER GÖK", role: "Social Media" },
  { id: "dc3dad95-f934-4655-923f-7c8482f7fd2e", full_name: "MERT KAPLAN", role: "Marketing" },
  { id: "b5160a38-d5f2-40a2-9c83-3cab08ad8c56", full_name: "DEMİR GÜVEN", role: "Marketing" },
  { id: "56fa7f1e-04ff-491e-bd5f-671c918c2ddf", full_name: "FIRAT ÇELİK", role: "Marketing" },
  { id: "3964fc51-3d0c-4f5e-bbe8-53c19e2cfe6b", full_name: "BERKAY DİLMEN", role: "Marketing" },
  { id: "98f00686-bbf1-4e73-991f-bf4ea12cda5b", full_name: "ŞERİFE ÇAVUŞ", role: "Operation" },
  { id: "2f7041cc-5622-410e-b06a-a946dfa462e4", full_name: "MİRA DEMİR", role: "Marketing" },
  { id: "05a444b2-57c9-48ab-b283-648854e5fc05", full_name: "İNCİ ÜNAL", role: "Marketing" },
  { id: "d39e7944-1b3c-4a4b-a9b8-1b6ef3887cc8", full_name: "ASU YALÇIN", role: "Marketing" },
  { id: "8494b27b-878b-48b5-b093-837d051f0f39", full_name: "MERT ALTIN", role: "Operation" },
  { id: "89a83022-d851-49ee-aa22-8d4ead4c46e2", full_name: "NAZLI ÖZTÜRK", role: "Marketing" },
  { id: "0eba0dc1-1de7-435d-8a35-c4978da24c20", full_name: "DAMLA ASLAN", role: "Marketing" },
  { id: "a81f2506-cc82-4d65-a02e-bc00a593c67e", full_name: "EZGİ KAYA", role: "Marketing" },
  { id: "d05bdd0a-1370-40bd-b2d9-19fb3ce33e1b", full_name: "TAHA ÖZTÜRK", role: "Marketing" },
  { id: "0b6ddceb-a682-456a-8131-97b4907d6d20", full_name: "CEM MURAT HAN", role: "Retention" },
  { id: "a391ebb3-8c1e-4124-aa43-a73509571324", full_name: "CENK KOÇAK", role: "Retention" },
  { id: "6dc3fa43-5699-43ea-93a1-1af27d3d0c93", full_name: "ESLEM MARALOĞLU", role: "Retention" },
  { id: "b8a7c8d4-4d2e-4b62-b306-39899a49e8d1", full_name: "ATTİLA", role: "Retention" },
  { id: "a1803bed-7dd6-4386-9045-03a5cacd821b", full_name: "TOLGA GÜREL", role: "Retention" },
  { id: "fffa1dd2-8940-4f8a-94cc-551c83fe815f", full_name: "MURAT AKKAYA", role: "Retention" },
  { id: "5bad6d9b-9500-4fbe-9d7d-26b28a2cda04", full_name: "LUNA MUTLU", role: "Operation" },
  { id: "4e598598-d861-4ee2-ba15-3adcc09cbf8c", full_name: "OKAN AYDIN", role: "Operation" },
  { id: "745b90f5-a9e9-44e8-9bce-2b5e62588860", full_name: "KUZEY ALP", role: "Operation" },
  { id: "412922d1-3793-4b54-b20c-04b78fe938ab", full_name: "SİNAN AKAR", role: "Operation" },
  { id: "a05255c3-6403-4a04-a873-bd8fed937dc0", full_name: "ALA ERDEM", role: "Social Media" },
  { id: "c020613c-6f96-4dbb-b29c-cc2085f932d7", full_name: "OĞUZ KARAYEL", role: "Social Media" },
  { id: "038c6d39-08c5-4985-bc8d-cb1fe403f872", full_name: "ERSİN ALTIN", role: "Operation" },
  { id: "b54d34a1-4375-4bfa-9105-30ab665d0542", full_name: "İBRAHİM ASLAN", role: "Operation" },
  { id: "4aa719ca-df77-4241-85a7-18f328b8b3d3", full_name: "AYLİN AKSÜT", role: "Marketing" },
  { id: "2f3a3db1-ca33-4821-a006-7840151d61d1", full_name: "HAMİT ALTINTAŞ", role: "Project Management" },
  { id: "9cef0a3c-0e75-496f-8a8e-36f309565b0e", full_name: "İLKER SOYAK", role: "Project Management" },
  { id: "cef2a015-471c-4632-bacd-b67d8fe9218d", full_name: "YAĞIZ GÖKTÜRK", role: "R&D Department" },
  { id: "cb60f735-1e08-47aa-aa81-4134a31eff21", full_name: "MURAT TANRIVERDİ", role: "Programmer" },
];

// CSV employee name → HR employee ID mapping (with aliases)
const EMPLOYEE_NAME_MAP = {
  'MERT KAPLAN': 'dc3dad95-f934-4655-923f-7c8482f7fd2e',
  'DEMİR GÜVEN': 'b5160a38-d5f2-40a2-9c83-3cab08ad8c56',
  'DEMIR GÜVEN': 'b5160a38-d5f2-40a2-9c83-3cab08ad8c56',
  'FIRAT ÇELİK': '56fa7f1e-04ff-491e-bd5f-671c918c2ddf',
  'FIRAT ÇELIK': '56fa7f1e-04ff-491e-bd5f-671c918c2ddf',
  'FИРАТ ÇELİK': '56fa7f1e-04ff-491e-bd5f-671c918c2ddf',
  'BERKAY DİLMEN': '3964fc51-3d0c-4f5e-bbe8-53c19e2cfe6b',
  'BERKAY DILMEN': '3964fc51-3d0c-4f5e-bbe8-53c19e2cfe6b',
  'CEM MURATHAN': '0b6ddceb-a682-456a-8131-97b4907d6d20',
  'CEM MURAT HAN': '0b6ddceb-a682-456a-8131-97b4907d6d20',
  'CENK KOÇAK': 'a391ebb3-8c1e-4124-aa43-a73509571324',
  'ESLEM MARALOĞLU': '6dc3fa43-5699-43ea-93a1-1af27d3d0c93',
  'ATTİLA KILIÇ': 'b8a7c8d4-4d2e-4b62-b306-39899a49e8d1',
  'ATTİLA': 'b8a7c8d4-4d2e-4b62-b306-39899a49e8d1',
  'ATTILA KILIÇ': 'b8a7c8d4-4d2e-4b62-b306-39899a49e8d1',
  'ATTILA': 'b8a7c8d4-4d2e-4b62-b306-39899a49e8d1',
  'TOLGA GÜREL': 'a1803bed-7dd6-4386-9045-03a5cacd821b',
  'MURAT AKKAYA': 'fffa1dd2-8940-4f8a-94cc-551c83fe815f',
  'CANER GÖK': '0399c31e-da83-4ede-8b10-cbf0a159420a',
  'MUSTAFA DERE': 'b75ca24a-8414-4ece-8fe2-e8bb2354c56c',
  'SEMİH KOÇ': null, // Left company
  'SEMIH KOÇ': null,
  'SELEN AKÇA': null, // Left company
  'ENES GÖK': '201a907f-744d-4c09-96d8-c05e42c94d20',
  'NAZLICAN RENA': null,
  'NAZLICAN RENA 1': null,
  'CEYLAN KAYA': null,
  'CEYLAN KAYA 1': null,
  'HAKAN ATALAY': null,
  'ONUR TOPRAK 1': null,
  'GÖRKEM ŞAHİN 1': null,
  'GORKEM SAHIN 1': null,
};

function normalize(name) {
  if (!name) return '';
  return name.trim()
    .toUpperCase()
    .replace(/İ/g, 'I')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ş/g, 'S')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/ı/g, 'I')
    .replace(/ğ/g, 'G')
    .replace(/ü/g, 'U')
    .replace(/ş/g, 'S')
    .replace(/ö/g, 'O')
    .replace(/ç/g, 'C')
    .replace(/â/g, 'A')
    .replace(/î/g, 'I')
    .replace(/û/g, 'U')
    .replace(/\s+/g, ' ');
}

function findEmployeeId(name) {
  if (!name || !name.trim()) return null;
  const upper = name.trim().toUpperCase();
  // Direct match
  if (EMPLOYEE_NAME_MAP[upper] !== undefined) return EMPLOYEE_NAME_MAP[upper];
  // Try normalized
  const normName = normalize(name);
  for (const [key, id] of Object.entries(EMPLOYEE_NAME_MAP)) {
    if (normalize(key) === normName) return id;
  }
  // Fuzzy: check if name contains an HR employee name
  for (const emp of HR_EMPLOYEES) {
    if (normalize(emp.full_name) === normName) return emp.id;
    if (normName.includes(normalize(emp.full_name)) || normalize(emp.full_name).includes(normName)) return emp.id;
  }
  return undefined; // Unknown
}

function parseCSVLine(line) {
  // Simple CSV parse (no quoted commas expected in this data)
  return line.split(',');
}

function parseDate(dateStr) {
  // DD.MM.YYYY → YYYY-MM-DD
  const parts = dateStr.trim().split('.');
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
}

function parseAmount(amountStr) {
  if (!amountStr) return 0;
  // Handle "13.200" (Turkish thousands separator) and "501"
  return parseFloat(amountStr.replace(/\./g, '').replace(',', '.')) || 0;
}

// Read CSV files
const fdCSV = fs.readFileSync('KASA_OZET/ORD_SATIŞ - ORDER SATIS.csv', 'utf-8');
const retDepCSV = fs.readFileSync('KASA_OZET/ORD_SATIŞ - ORD RET DEPOSIT.csv', 'utf-8');
const wdCSV = fs.readFileSync('KASA_OZET/ORD_SATIŞ - ORD WITHDRAWAL.csv', 'utf-8');

// Parse MRT26 entries from First Deposit CSV
// Columns: 0=channel, 1=period, 2=date, 3=source, 4=data, 5=MT(employee), 6=team_leader, 7=customer, 8=meta_id, 9=payment, 10=tl, 11=usd, ..., 17=RET
const fdEntries = fdCSV.split('\n')
  .filter(l => l.includes('MRT26'))
  .map(l => {
    const cols = parseCSVLine(l);
    return {
      type: 'fd',
      date: parseDate(cols[2]),
      mt_employee: (cols[5]?.trim() || '').replace(/ SİLİNEN SATIŞ/g, ''),
      customer: cols[7]?.trim(),
      crm_id: cols[8]?.trim(),
      amount_usd: parseAmount(cols[11]),
      ret_employee: (cols[17]?.trim() || '').replace(/ SİLİNEN SATIŞ/g, ''),
    };
  });

// Parse MRT26 entries from Retention Deposit CSV
// Columns: 0=channel, 1=period, 2=date, 3=RET, 4=source, 5=data, 6=team_leader, 7=MT, 8=customer, 9=meta_id, 10=payment, 11=tl, 12=usd
const retDepEntries = retDepCSV.split('\n')
  .filter(l => l.includes('MRT26'))
  .map(l => {
    const cols = parseCSVLine(l);
    return {
      type: 'ret_dep',
      date: parseDate(cols[2]),
      ret_employee: cols[3]?.trim(),
      mt_employee: cols[7]?.trim(),
      customer: cols[8]?.trim(),
      crm_id: cols[9]?.trim(),
      amount_usd: parseAmount(cols[12]),
    };
  });

// Parse MRT26 entries from Withdrawal CSV
// Columns: 0=channel, 1=period, 2=date, 3=RET, 4=source, 5=data, 6=team_leader, 7=MT, 8=customer, 9=meta_id, 10=payment, 11=tl, 12=usd
const wdEntries = wdCSV.split('\n')
  .filter(l => l.includes('MRT26'))
  .map(l => {
    const cols = parseCSVLine(l);
    return {
      type: 'wd',
      date: parseDate(cols[2]),
      ret_employee: cols[3]?.trim(),
      mt_employee: cols[7]?.trim(),
      customer: cols[8]?.trim(),
      crm_id: cols[9]?.trim(),
      amount_usd: Math.abs(parseAmount(cols[12])),
    };
  });

console.log(`Parsed: ${fdEntries.length} FD, ${retDepEntries.length} RET DEP, ${wdEntries.length} WD entries`);

// Fetch March transfers from DB
async function fetchTransfers() {
  const url = `${SUPABASE_URL}/rest/v1/transfers?organization_id=eq.${ORG_ID}&transfer_date=gte.2026-03-01&transfer_date=lte.2026-03-31&select=id,full_name,crm_id,category_id,transfer_date,amount_usd,employee_id,is_first_deposit&order=transfer_date.asc&limit=500`;
  const res = await fetch(url, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
  });
  return res.json();
}

async function main() {
  const transfers = await fetchTransfers();
  console.log(`DB transfers: ${transfers.length}`);

  // Show category breakdown
  const cats = {};
  transfers.forEach(t => {
    const key = `${t.category_id}${t.is_first_deposit ? '_FD' : ''}`;
    cats[key] = (cats[key] || 0) + 1;
  });
  console.log('Category breakdown:', cats);

  // All CSV entries combined
  const allCSV = [...fdEntries, ...retDepEntries, ...wdEntries];

  // Matching strategy: for each DB transfer, find the best CSV match
  const matches = [];
  const unmatched_db = [];
  const used_csv = new Set();
  const unknown_employees = new Set();

  for (const transfer of transfers) {
    const tDate = transfer.transfer_date.split('T')[0]; // YYYY-MM-DD
    const tName = normalize(transfer.full_name);
    const tAmount = Math.abs(transfer.amount_usd);
    const tCrmId = transfer.crm_id;
    const isWd = transfer.category_id === 'wd';
    const isFd = transfer.is_first_deposit;

    let bestMatch = null;
    let bestScore = 0;

    for (let i = 0; i < allCSV.length; i++) {
      if (used_csv.has(i)) continue;
      const csv = allCSV[i];

      // Check type compatibility (relaxed - allow cross-type matching with penalty)
      let typePenalty = 0;
      if (isWd && csv.type !== 'wd') continue; // WD must match WD
      if (!isWd && csv.type === 'wd') continue; // non-WD can't match WD
      if (!isWd && isFd && csv.type === 'ret_dep') typePenalty = 3;
      if (!isWd && !isFd && csv.type === 'fd') typePenalty = 3;

      let score = -typePenalty;

      // Date match (allow ±1 day, or ±3 days with higher penalty)
      if (csv.date === tDate) score += 10;
      else {
        const csvD = new Date(csv.date);
        const tD = new Date(tDate);
        const diffDays = Math.abs((csvD - tD) / 86400000);
        if (diffDays <= 1) score += 5;
        else if (diffDays <= 3) score += 2;
        else continue;
      }

      // Name match (fuzzy: Levenshtein-like)
      const csvName = normalize(csv.customer);
      if (csvName === tName) score += 20;
      else if (csvName && tName && (csvName.includes(tName) || tName.includes(csvName))) score += 15;
      else {
        // Word-level matching
        const csvWords = csvName.split(' ');
        const tWords = tName.split(' ');
        const commonWords = csvWords.filter(w => tWords.some(tw => tw === w || (tw.length > 3 && w.length > 3 && (tw.startsWith(w.slice(0,4)) || w.startsWith(tw.slice(0,4))))));
        if (commonWords.length >= 2) score += 12;
        else if (commonWords.length === 1 && commonWords[0].length > 3) score += 6;
        else continue;
      }

      // Amount match (bonus, not required)
      const amountDiff = Math.abs(tAmount - csv.amount_usd);
      if (amountDiff < 1) score += 15;
      else if (amountDiff < 5) score += 10;
      else if (amountDiff / Math.max(tAmount, csv.amount_usd, 1) < 0.05) score += 5;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = { csvIdx: i, csv, score };
      }
    }

    if (bestMatch && bestScore >= 12) {
      // Don't mark CSV as used if it's a consolidated entry (allow one-to-many)
      // Only mark as used if amounts roughly match
      const amtRatio = Math.abs(bestMatch.csv.amount_usd) > 0
        ? Math.abs(tAmount) / Math.abs(bestMatch.csv.amount_usd)
        : 1;
      if (amtRatio > 0.5 && amtRatio < 2) {
        used_csv.add(bestMatch.csvIdx);
      }
      // else: keep CSV entry available for other DB transfers (one-to-many)
      const csv = bestMatch.csv;

      // Determine which employee to assign
      // FD transfers → MT (marketing) employee
      // RET deposits & withdrawals → RET employee
      let employeeName;
      if (csv.type === 'fd' && isFd) {
        employeeName = csv.mt_employee; // First deposit → marketing employee
      } else if (csv.type === 'fd' && !isFd) {
        // CSV says FD but DB says not FD → use RET employee from FD CSV if available, else MT
        employeeName = csv.ret_employee || csv.mt_employee;
      } else {
        employeeName = csv.ret_employee; // Ret deposit & withdrawal → retention employee
      }

      const employeeId = findEmployeeId(employeeName);
      if (employeeId === undefined) {
        unknown_employees.add(employeeName);
      }

      matches.push({
        transfer_id: transfer.id,
        transfer_name: transfer.full_name,
        transfer_date: tDate,
        transfer_amount: transfer.amount_usd,
        csv_type: csv.type,
        csv_customer: csv.customer,
        csv_amount: csv.amount_usd,
        employee_name: employeeName,
        employee_id: employeeId,
        score: bestMatch.score,
      });
    } else {
      unmatched_db.push({
        id: transfer.id,
        full_name: transfer.full_name,
        date: tDate,
        amount: transfer.amount_usd,
        category: transfer.category_id,
        is_fd: transfer.is_first_deposit,
      });
    }
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`Matched: ${matches.length}`);
  console.log(`Unmatched DB transfers: ${unmatched_db.length}`);
  console.log(`Unknown employees: ${[...unknown_employees].join(', ')}`);

  // Summary by employee
  const byEmployee = {};
  matches.forEach(m => {
    const key = m.employee_name || 'NULL';
    if (!byEmployee[key]) byEmployee[key] = { count: 0, id: m.employee_id };
    byEmployee[key].count++;
  });
  console.log('\n--- Employee assignment summary ---');
  for (const [name, info] of Object.entries(byEmployee).sort((a,b) => b[1].count - a[1].count)) {
    console.log(`  ${name}: ${info.count} transfers → ${info.id || 'NOT IN HR TABLE'}`);
  }

  // Show unmatched
  if (unmatched_db.length > 0) {
    console.log('\n--- Unmatched DB transfers ---');
    unmatched_db.forEach(t => {
      console.log(`  ${t.date} | ${t.full_name} | ${t.amount} USD | ${t.category}${t.is_fd ? ' (FD)' : ''}`);
    });
  }

  // Show matches with null employee_id (employee not in HR)
  const nullEmp = matches.filter(m => m.employee_id === null);
  if (nullEmp.length > 0) {
    console.log(`\n--- Transfers matched but employee NOT in HR table (${nullEmp.length}) ---`);
    nullEmp.forEach(m => {
      console.log(`  ${m.transfer_date} | ${m.transfer_name} | ${m.employee_name} | ${m.csv_type}`);
    });
  }

  // Valid updates (employee exists in HR)
  const validUpdates = matches.filter(m => m.employee_id);
  console.log(`\n--- Valid updates to execute: ${validUpdates.length} ---`);

  // Save to file for review
  fs.writeFileSync('/tmp/employee_matches.json', JSON.stringify({ matches, unmatched_db, validUpdates }, null, 2));
  console.log('\nFull details saved to /tmp/employee_matches.json');

  // === EXECUTE UPDATES ===
  if (process.argv.includes('--execute')) {
    console.log(`\n🔄 Executing ${validUpdates.length} updates...`);
    let success = 0;
    let failed = 0;

    // Batch updates: group by employee_id for efficiency
    const batches = {};
    validUpdates.forEach(u => {
      if (!batches[u.employee_id]) batches[u.employee_id] = [];
      batches[u.employee_id].push(u.transfer_id);
    });

    for (const [employeeId, transferIds] of Object.entries(batches)) {
      // Update in chunks of 50
      for (let i = 0; i < transferIds.length; i += 50) {
        const chunk = transferIds.slice(i, i + 50);
        const idFilter = chunk.map(id => `"${id}"`).join(',');
        const url = `${SUPABASE_URL}/rest/v1/transfers?id=in.(${idFilter})`;
        try {
          const res = await fetch(url, {
            method: 'PATCH',
            headers: {
              'apikey': SERVICE_KEY,
              'Authorization': `Bearer ${SERVICE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ employee_id: employeeId }),
          });
          if (res.ok) {
            success += chunk.length;
            const empName = validUpdates.find(u => u.employee_id === employeeId)?.employee_name;
            console.log(`  ✓ ${chunk.length} transfers → ${empName} (${employeeId})`);
          } else {
            const err = await res.text();
            console.error(`  ✗ Failed for ${employeeId}: ${err}`);
            failed += chunk.length;
          }
        } catch (e) {
          console.error(`  ✗ Error for ${employeeId}: ${e.message}`);
          failed += chunk.length;
        }
      }
    }

    console.log(`\n✅ Done: ${success} updated, ${failed} failed`);
  } else {
    console.log('\nRun with --execute to apply updates to DB');
  }
}

main().catch(console.error);
