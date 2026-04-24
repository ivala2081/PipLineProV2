// ============================================================================
// import-transfers-2026.mjs
// ----------------------------------------------------------------------------
// Parses 4 KASA CSV files (OCAK/ŞUBAT/MART/NİSAN 2026) from C:\Users\ACER\Downloads\data
// and generates supabase/migrations/136_transfers_2026_data_import.sql
//
// Run:    node scripts/import-transfers-2026.mjs
// Output: console summary + migration SQL file
// ============================================================================

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = resolve(__dirname, "..");
const DATA_DIR = "C:/Users/ACER/Downloads/data";
const OUTPUT_SQL = resolve(PROJECT_ROOT, "supabase/migrations/136_transfers_2026_data_import.sql");
const PHASE_OUT_DIR = resolve(PROJECT_ROOT, "scripts/import-phases");
const ORG_ID_LITERAL = "'79e1ae79-8acc-4144-9c08-d94609123f6d'::uuid";

const FILES = [
  { name: "OCAK",  path: resolve(DATA_DIR, "KASA - OCAK (2).csv"),    month: 1 },
  { name: "ŞUBAT", path: resolve(DATA_DIR, "KASA - ŞUBAT26 (2).csv"), month: 2 },
  { name: "MART",  path: resolve(DATA_DIR, "KASA - MART26 (1).csv"),  month: 3 },
  { name: "NİSAN", path: resolve(DATA_DIR, "KASA - NİSAN26.csv"),     month: 4 },
];

// ── TR decimal / currency parsing ──────────────────────────────────────────
function parseTrNumber(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  // strip TL/USD symbols, %, $, ₺, spaces
  s = s.replace(/[₺$%\s]/g, "");
  // Handle negative
  const isNeg = s.startsWith("-") || s.endsWith("-");
  s = s.replace(/^-|-$/g, "");
  if (!s) return null;
  // TR format:
  //   1.000.000,50   → 1000000.50   (. = thousand sep, , = decimal)
  //   4.300          → 4300         (. = thousand sep, 3-digit groups)
  //   43,05          → 43.05        (, = decimal)
  //   0,11           → 0.11         (, = decimal)
  //   43.05          → 43.05        (English decimal, 2-digit tail)
  //   1.5            → 1.5          (English decimal, 1-digit tail)
  if (s.includes(",")) {
    // Comma present → always decimal separator; strip all dots (thousand seps)
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(".")) {
    // No comma — infer if "." is thousand separator
    // If all segments after the first `.` are exactly 3 digits, it's thousand sep
    const parts = s.split(".");
    const isThousandSep =
      parts.length >= 2 &&
      parts.slice(1).every((p) => /^\d{3}$/.test(p)) &&
      /^\d{1,3}$/.test(parts[0]);
    if (isThousandSep) {
      s = parts.join("");
    }
    // else: leave as English decimal (e.g. "43.05", "0.11")
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return isNeg ? -n : n;
}

function parseTrDate(raw) {
  if (!raw) return null;
  const m = String(raw).trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`; // ISO
}

function parseTrDateTime(raw) {
  if (!raw) return null;
  const m = String(raw).trim().match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, dd, mm, yyyy, h, mi, ss] = m;
  const hh = h.padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}+03`;
}

// ── DB value mapping ───────────────────────────────────────────────────────
function mapCategory(raw) {
  const s = String(raw || "").trim().toUpperCase();
  if (!s) return null;
  if (s.includes("YATIRIM") || s.includes("YATIRI")) return "dep";
  if (s.includes("ÇEKME") || s.includes("CEKME") || s.includes("ÇEKI") || s.includes("CEKI")) return "wd";
  return null;
}

function mapPaymentMethod(raw) {
  const s = String(raw || "").trim().toUpperCase();
  if (!s) return null;
  if (s === "BANKA" || s === "IBAN" || s === "BANK") return "bank";
  if (s === "TETHER" || s === "USDT") return "tether";
  if (s === "KK" || s.includes("KREDI") || s.includes("CREDIT") || s.includes("CARD")) return "credit-card";
  return null;
}

function mapType(raw) {
  const s = String(raw || "").trim().toUpperCase();
  if (!s) return null;
  if (s.includes("BLOKE") || s.includes("BLOCKED")) return "blocked";
  if (s.includes("ÖDEME") || s.includes("ODEME") || s.includes("PAYMENT")) return "payment";
  if (s.includes("MÜŞTERİ") || s.includes("MUSTERI") || s.includes("CLIENT") || s.includes("CUSTOMER")) return "client";
  return null;
}

function mapCurrency(raw) {
  const s = String(raw || "").trim().toUpperCase();
  if (!s) return null;
  if (s === "TL" || s === "TRY" || s === "₺") return "TRY";
  if (s === "USD" || s === "$" || s === "USDT") return "USDT";
  return null;
}

// ── SQL escaping ───────────────────────────────────────────────────────────
function sqlStr(v) {
  if (v === null || v === undefined || v === "") return "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}

function sqlNum(v) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "NULL";
  return String(v);
}

// ── CSV reading ────────────────────────────────────────────────────────────
function readCsv(path) {
  const content = readFileSync(path, "utf8");
  const parsed = Papa.parse(content, { skipEmptyLines: false });
  return parsed.data; // array of row arrays
}

// ── Extract PSP rate catalog from right-side of rows ───────────────────────
function extractPspRates(rows) {
  const rates = new Map(); // pspName -> rate
  for (const row of rows) {
    if (!row || row.length < 2) continue;
    // Find last non-empty cell
    let lastIdx = row.length - 1;
    while (lastIdx >= 0 && String(row[lastIdx] ?? "").trim() === "") lastIdx--;
    if (lastIdx < 1) continue;
    const lastCell = String(row[lastIdx]).trim();
    const prevCell = String(row[lastIdx - 1] ?? "").trim();
    // last should be rate (decimal 0..1), prev should be PSP name (alphanumeric)
    const rate = parseTrNumber(lastCell);
    if (rate === null || rate < 0 || rate > 1) continue;
    // Skip the header row where prevCell may be "ORDER" or similar
    if (!prevCell || prevCell.length < 2) continue;
    if (/^(ORDER|GENEL|KASA|PSP|DİP TOPLAM|USD ÇEVRİM|KOM\. SONRASI|GÜNLÜK.*)$/i.test(prevCell)) continue;
    // PSP names must contain at least one letter (filters ₺0,00, 0, etc.)
    if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(prevCell)) continue;
    // PSP names must not start with currency symbols
    if (/^[₺$€%]/.test(prevCell)) continue;
    // Good candidate
    rates.set(prevCell, rate);
  }
  return rates;
}

// ── Extract daily exchange rates (DD.MM.YYYY followed by decimal 40..60) ──
function extractDailyRates(rows) {
  const rates = new Map(); // 'YYYY-MM-DD' -> rate
  for (const row of rows) {
    if (!row) continue;
    for (let i = 15; i < row.length; i++) {
      const cell = String(row[i] ?? "").trim();
      const dateIso = parseTrDate(cell);
      if (!dateIso) continue;
      // Look ahead up to 15 cells for rate
      for (let j = i + 1; j < Math.min(row.length, i + 16); j++) {
        const v = parseTrNumber(row[j]);
        if (v !== null && v >= 30 && v <= 60) {
          // Record first hit only (daily rate is usually adjacent to daily totals)
          if (!rates.has(dateIso)) rates.set(dateIso, v);
          break;
        }
      }
    }
  }
  return rates;
}

// ── Extract transfer rows ──────────────────────────────────────────────────
function extractTransfers(rows, fileName) {
  const transfers = [];
  const warnings = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    if (!row || row.length < 14) continue;

    // Skip obvious summary / header rows
    const col3 = String(row[2] ?? "").trim(); // AD SOYAD
    const col7 = String(row[6] ?? "").trim(); // TARİH
    const col8 = String(row[7] ?? "").trim(); // KATEGORİ

    // Header row
    if (col3 === "AD SOYAD") continue;
    // Skip "DİP TOPLAM", "USD ÇEVRİM", "KOM. SONRASI" rows where positions are swapped
    // These rows have summary text in early columns — AD SOYAD empty + no valid date
    if (!col3 || !col7) continue;

    const date = parseTrDate(col7);
    if (!date) continue; // Not a valid date → not a transfer row

    // AD SOYAD shouldn't be a known summary word
    if (/^(DİP TOPLAM|USD ÇEVRİM|KOM\. SONRASI)$/i.test(col3)) continue;

    const category = mapCategory(col8);
    if (!category) {
      warnings.push(`${fileName}:row${idx + 1} unknown category "${col8}" for ${col3} @ ${date}`);
      continue;
    }

    const paymentMethod = mapPaymentMethod(row[4]); // ÖDEME ŞEKLİ
    if (!paymentMethod) {
      warnings.push(`${fileName}:row${idx + 1} unknown payment method "${row[4]}" for ${col3} @ ${date}`);
      continue;
    }

    const amount = parseTrNumber(row[8]); // TUTAR
    if (amount === null) {
      warnings.push(`${fileName}:row${idx + 1} unparsable amount "${row[8]}" for ${col3} @ ${date}`);
      continue;
    }

    const commission = parseTrNumber(row[9]) ?? 0; // KOMİSYON
    const net = parseTrNumber(row[10]) ?? (amount - commission); // NET
    const currency = mapCurrency(row[11]);
    if (!currency) {
      warnings.push(`${fileName}:row${idx + 1} unknown currency "${row[11]}" for ${col3} @ ${date}`);
      continue;
    }

    const pspName = String(row[12] ?? "").trim() || null; // KASA
    const type = mapType(row[13]) ?? "client"; // Tür fallback

    // CRM/META may be empty (e.g. last Nisan row)
    const rawCrm = String(row[0] ?? "").trim();
    const rawMeta = String(row[1] ?? "").trim();
    const crmId = /^\d+$/.test(rawCrm) ? rawCrm : null;
    const metaId = /^\d+$/.test(rawMeta) ? rawMeta : null;

    // İŞLEM TARİH/SAAT (Mart/Nisan — col 15)
    const txTs = parseTrDateTime(String(row[15] ?? "").trim());

    transfers.push({
      fileName,
      srcRow: idx + 1,
      crmId,
      metaId,
      fullName: col3.replace(/\s+/g, " "),
      date,
      timestamp: txTs, // may be null
      amount,
      commission,
      net,
      currency,
      category,
      paymentMethod,
      type,
      pspName,
    });
  }

  return { transfers, warnings };
}

// ── Main ───────────────────────────────────────────────────────────────────
function main() {
  const allTransfers = [];
  const allWarnings = [];
  const pspRates = new Map(); // month -> Map(pspName -> rate)
  const exchangeRates = new Map(); // date -> rate

  for (const file of FILES) {
    console.log(`\n── Parsing ${file.name} (${file.path}) ──`);
    const rows = readCsv(file.path);
    console.log(`  raw rows: ${rows.length}`);

    const monthRates = extractPspRates(rows);
    pspRates.set(file.month, monthRates);
    console.log(`  PSP rates found: ${monthRates.size}`);
    for (const [name, rate] of monthRates) {
      console.log(`    ${name.padEnd(25)} → ${rate}`);
    }

    const monthExRates = extractDailyRates(rows);
    console.log(`  daily exchange rates found: ${monthExRates.size}`);
    for (const [d, r] of monthExRates) {
      // Only keep dates in 2026 Jan-Apr range (filter spill-over into May)
      if (d >= "2026-01-01" && d < "2026-05-01") {
        exchangeRates.set(d, r);
      }
    }

    const { transfers, warnings } = extractTransfers(rows, file.name);
    console.log(`  valid transfers: ${transfers.length}`);
    console.log(`  warnings: ${warnings.length}`);
    allTransfers.push(...transfers);
    allWarnings.push(...warnings);
  }

  // Collect all PSP names used in transfers
  const usedPsps = new Set();
  for (const t of allTransfers) {
    if (t.pspName) usedPsps.add(t.pspName);
  }

  // Build final PSP list: union of used PSPs + rate-listed PSPs per month
  const allPspNames = new Set(usedPsps);
  for (const m of pspRates.values()) {
    for (const name of m.keys()) allPspNames.add(name);
  }

  console.log(`\n── Summary ──`);
  console.log(`  total transfers:        ${allTransfers.length}`);
  console.log(`  unique PSPs (used):     ${usedPsps.size}`);
  console.log(`  unique PSPs (all):      ${allPspNames.size}`);
  console.log(`  unique exchange dates:  ${exchangeRates.size}`);
  console.log(`  total warnings:         ${allWarnings.length}`);

  if (allWarnings.length > 0) {
    console.log(`\n── Warnings (first 30) ──`);
    for (const w of allWarnings.slice(0, 30)) console.log("  " + w);
  }

  // Sanity: each PSP used in a transfer should have a rate in at least one month
  const pspsWithoutRate = [];
  for (const name of usedPsps) {
    let has = false;
    for (const m of pspRates.values()) {
      if (m.has(name)) { has = true; break; }
    }
    if (!has) pspsWithoutRate.push(name);
  }
  if (pspsWithoutRate.length > 0) {
    console.log(`\n── PSPs used but without rate (default 0) ──`);
    for (const n of pspsWithoutRate) console.log("  " + n);
  }

  // Categorize transfers by date
  const byDate = new Map();
  for (const t of allTransfers) {
    const k = t.date;
    byDate.set(k, (byDate.get(k) || 0) + 1);
  }
  const dateKeys = [...byDate.keys()].sort();
  console.log(`\n  earliest date: ${dateKeys[0]}`);
  console.log(`  latest date:   ${dateKeys[dateKeys.length - 1]}`);
  console.log(`  days with transfers: ${dateKeys.length}`);

  // Generate SQL
  console.log(`\n── Generating migration SQL ──`);
  const sql = buildSql(allTransfers, pspRates, exchangeRates, allPspNames);
  writeFileSync(OUTPUT_SQL, sql, "utf8");
  const bytes = Buffer.byteLength(sql, "utf8");
  console.log(`  wrote ${OUTPUT_SQL}`);
  console.log(`  size: ${(bytes / 1024).toFixed(1)} KiB (${sql.split("\n").length} lines)`);

  console.log(`\n── Writing per-phase SQL files for MCP execution ──`);
  mkdirSync(PHASE_OUT_DIR, { recursive: true });
  writePhaseFiles(allTransfers, pspRates, exchangeRates, allPspNames);
}

function writePhaseFiles(transfers, pspRates, exchangeRates, allPspNames) {
  const org = ORG_ID_LITERAL;

  // Phase B: PSPs
  {
    const lines = [];
    for (const name of [...allPspNames].sort()) {
      const n = name.replace(/'/g, "''");
      lines.push(`INSERT INTO public.psps (organization_id, name, commission_rate, is_active) VALUES (${org}, '${n}', 0.0000, true) ON CONFLICT (organization_id, name) DO NOTHING;`);
    }
    writeFileSync(resolve(PHASE_OUT_DIR, "B_psps.sql"), lines.join("\n"), "utf8");
    console.log(`  phase B: ${lines.length} PSP upserts`);
  }

  // Phase C: PSP commission rates
  {
    const lines = [];
    for (const [month, map] of pspRates) {
      const mm = String(month).padStart(2, "0");
      const eff = `2026-${mm}-01`;
      for (const [name, rate] of map) {
        const n = name.replace(/'/g, "''");
        lines.push(`INSERT INTO public.psp_commission_rates (psp_id, organization_id, commission_rate, effective_from) SELECT id, ${org}, ${rate}, '${eff}'::date FROM public.psps WHERE organization_id = ${org} AND name = '${n}' LIMIT 1;`);
      }
    }
    writeFileSync(resolve(PHASE_OUT_DIR, "C_psp_rates.sql"), lines.join("\n"), "utf8");
    console.log(`  phase C: ${lines.length} PSP rate inserts`);
  }

  // Phase D: exchange rates
  {
    const lines = [];
    const sortedDates = [...exchangeRates.keys()].sort();
    for (const d of sortedDates) {
      const r = exchangeRates.get(d);
      lines.push(`INSERT INTO public.exchange_rates (organization_id, currency, rate_to_tl, rate_date, source) VALUES (${org}, 'USD', ${r}, '${d}'::date, 'csv-import') ON CONFLICT (organization_id, currency, rate_date) DO UPDATE SET rate_to_tl = EXCLUDED.rate_to_tl;`);
    }
    writeFileSync(resolve(PHASE_OUT_DIR, "D_exchange_rates.sql"), lines.join("\n"), "utf8");
    console.log(`  phase D: ${lines.length} exchange rate inserts`);
  }

  // Phase E: transfers — chunked with inline PSP UUIDs (fetched live from DB)
  {
    const PSP_UUIDS = {
      '#60 CASHPAY': '83a5699f-9fc2-4d81-b46c-54390bfc34cc',
      '#61 CRYPPAY': 'e1dd8bef-9124-4372-a18f-3d8a2859cce5',
      '#62 CRYPPAY': '4c6f670c-fd56-415c-bbf1-a2bd84b9bba9',
      '#70 CRYPPAY': 'b380d675-f4ee-41f8-b499-d7454bf470e3',
      '#70 CRYPPAY 9': 'cfa95f1a-b05f-4d93-b4d0-61f762d92f35',
      '#71 CRYPPAY': 'a15d12e7-3ec5-4c72-a3ad-c41f54185f38',
      '#72 CRYPPAY': 'e4ab2220-a340-4479-afa9-b23b964d9d46',
      '#72 CRYPPAY 10': '1cff4b11-441e-4bdc-b3a7-012e44f93efe',
      '#72 CRYPPAY 8': '70af4c9a-9f64-408e-82d1-a6a4b31c2366',
      '70 BLOKE': 'b99be2ec-a35d-421d-a116-59ff18410341',
      '72 BLOKE': 'e261bc89-b5ee-4d24-be98-dc3f3612f9d1',
      'ATATP': '4929f1c8-e24a-4f41-ba94-1ad4161c3c6a',
      'CPO': 'af038896-f71f-41e7-be3a-eab3f35f4be5',
      'CPO PY KK': '788e2150-fb5c-42b3-944b-26925f72a939',
      'FILBOX KK': 'fc349279-e8b6-4159-83cb-b93982c22199',
      'FSK': 'f12ee2d2-7d28-4c5f-b01e-ec4cd948d314',
      'KUYUMCU': '1e5ea023-5b18-4b47-81d6-630d8b2b022e',
      'SİPAY': 'efebb111-0311-4db4-a2f0-4524f59abd09',
      'TETHER': '4cd3f472-aab2-4106-9bd8-ba71ecc3f667',
      'YESOD KK': '583502b3-15c3-41aa-8ed4-efe7438edfbd',
    };

    function rateForDate(date) {
      if (exchangeRates.has(date)) return exchangeRates.get(date);
      const sorted = [...exchangeRates.keys()].sort();
      let prev = null;
      for (const d of sorted) { if (d <= date) prev = d; else break; }
      if (prev) return exchangeRates.get(prev);
      for (const d of sorted) if (d >= date) return exchangeRates.get(d);
      return 43.05;
    }

    // Skip first SKIP_ROWS (already inserted in DB)
    const SKIP_ROWS = 200;
    const CHUNK = 120;
    const toInsert = transfers.slice(SKIP_ROWS);
    const chunks = [];
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      chunks.push(toInsert.slice(i, i + CHUNK));
    }
    let fileIdx = 0;
    for (const chunk of chunks) {
      fileIdx++;
      const header = [
        "INSERT INTO public.transfers (",
        "  organization_id, full_name, transfer_date, amount, commission, net, currency,",
        "  category_id, payment_method_id, type_id, psp_id, crm_id, meta_id,",
        "  exchange_rate, amount_try, amount_usd, commission_rate_snapshot",
        ") VALUES",
      ];
      const valueLines = [];
      for (const t of chunk) {
        const rate = rateForDate(t.date);
        const ts = t.timestamp ? `'${t.timestamp}'` : `'${t.date} 12:00:00+03'`;
        const amt = t.amount;
        const amtTry = t.currency === "TRY" ? amt : amt * rate;
        const amtUsd = t.currency === "USDT" ? amt : amt / rate;
        const pspId = t.pspName ? PSP_UUIDS[t.pspName] : null;
        const pspExpr = pspId ? `'${pspId}'` : 'NULL';
        valueLines.push(
          `  ('79e1ae79-8acc-4144-9c08-d94609123f6d',${sqlStr(t.fullName)},${ts},${sqlNum(amt)},${sqlNum(t.commission)},${sqlNum(t.net)},${sqlStr(t.currency)},${sqlStr(t.category)},${sqlStr(t.paymentMethod)},${sqlStr(t.type)},${pspExpr},${sqlStr(t.crmId)},${sqlStr(t.metaId)},${sqlNum(rate)},${sqlNum(round2(amtTry))},${sqlNum(round2(amtUsd))},NULL)`
        );
      }
      const fname = `F_transfers_${String(fileIdx).padStart(3, "0")}.sql`;
      writeFileSync(resolve(PHASE_OUT_DIR, fname), header.join("\n") + "\n" + valueLines.join(",\n") + ";\n", "utf8");
    }
    console.log(`  phase E (remaining, optimized): ${toInsert.length} transfers in ${chunks.length} chunks × ${CHUNK} (skipped first ${SKIP_ROWS})`);
  }
}

function buildSql(transfers, pspRates, exchangeRates, allPspNames) {
  const lines = [];
  lines.push(`-- ============================================================================`);
  lines.push(`-- 136: Transfers 2026 Data Import`);
  lines.push(`-- ============================================================================`);
  lines.push(`-- Generated from: C:\\Users\\ACER\\Downloads\\data\\KASA - {OCAK,ŞUBAT,MART,NİSAN}26.csv`);
  lines.push(`-- Target org: ORDERINVEST`);
  lines.push(`-- Date range: 2026-01-01 → 2026-04-XX`);
  lines.push(`-- Transfer count: ${transfers.length}`);
  lines.push(`-- PSPs: ${allPspNames.size}`);
  lines.push(`-- Exchange rate dates: ${exchangeRates.size}`);
  lines.push(`--`);
  lines.push(`-- Flow (atomic):`);
  lines.push(`--   1. Resolve ORDERINVEST org_id`);
  lines.push(`--   2. Backup existing 2026 transfers to transfers_backup_2026_import`);
  lines.push(`--   3. Delete existing rows in import scope (transfers / psp_rates / exchange_rates)`);
  lines.push(`--   4. Upsert PSPs`);
  lines.push(`--   5. Insert PSP commission rates (one per PSP per month)`);
  lines.push(`--   6. Insert daily exchange rates`);
  lines.push(`--   7. Insert transfers (batch)`);
  lines.push(`-- ============================================================================`);
  lines.push(``);
  lines.push(`BEGIN;`);
  lines.push(``);
  lines.push(`-- Disable transfer audit trigger during bulk insert (re-enabled at end)`);
  lines.push(`ALTER TABLE public.transfers DISABLE TRIGGER on_transfer_created;`);
  lines.push(`ALTER TABLE public.transfers DISABLE TRIGGER on_transfer_updated_audit;`);
  lines.push(``);
  lines.push(`DO $$`);
  lines.push(`DECLARE`);
  lines.push(`  _org_id uuid;`);
  lines.push(`  _backup_count int;`);
  lines.push(`BEGIN`);
  lines.push(`  -- 1. Resolve org`);
  lines.push(`  SELECT id INTO _org_id FROM public.organizations WHERE name ILIKE 'ORDERINVEST' LIMIT 1;`);
  lines.push(`  IF _org_id IS NULL THEN`);
  lines.push(`    RAISE EXCEPTION 'ORDERINVEST organization not found';`);
  lines.push(`  END IF;`);
  lines.push(`  RAISE NOTICE 'ORDERINVEST org_id: %', _org_id;`);
  lines.push(``);
  lines.push(`  -- 2. Backup (snapshot table — re-imports overwrite it)`);
  lines.push(`  DROP TABLE IF EXISTS public.transfers_backup_2026_import;`);
  lines.push(`  CREATE TABLE public.transfers_backup_2026_import AS`);
  lines.push(`    SELECT * FROM public.transfers`);
  lines.push(`    WHERE organization_id = _org_id`);
  lines.push(`      AND transfer_date >= '2026-01-01'::timestamptz`);
  lines.push(`      AND transfer_date <  '2026-05-01'::timestamptz;`);
  lines.push(`  GET DIAGNOSTICS _backup_count = ROW_COUNT;`);
  lines.push(`  RAISE NOTICE 'Backed up % existing 2026 transfers to transfers_backup_2026_import', _backup_count;`);
  lines.push(``);
  lines.push(`  -- 3. Delete existing 2026 transfers for this org`);
  lines.push(`  DELETE FROM public.transfers`);
  lines.push(`    WHERE organization_id = _org_id`);
  lines.push(`      AND transfer_date >= '2026-01-01'::timestamptz`);
  lines.push(`      AND transfer_date <  '2026-05-01'::timestamptz;`);
  lines.push(``);
  lines.push(`  -- 3b. Delete existing PSP commission rate rows for this org in 2026 range`);
  lines.push(`  DELETE FROM public.psp_commission_rates`);
  lines.push(`    WHERE organization_id = _org_id`);
  lines.push(`      AND effective_from >= '2026-01-01'::date`);
  lines.push(`      AND effective_from <  '2026-05-01'::date;`);
  lines.push(``);
  lines.push(`  -- 3c. Delete existing exchange rates for this org in 2026 range`);
  lines.push(`  DELETE FROM public.exchange_rates`);
  lines.push(`    WHERE organization_id = _org_id`);
  lines.push(`      AND currency = 'USD'`);
  lines.push(`      AND rate_date >= '2026-01-01'::date`);
  lines.push(`      AND rate_date <  '2026-05-01'::date;`);
  lines.push(``);
  lines.push(`  -- 4. Upsert PSPs`);
  for (const name of [...allPspNames].sort()) {
    const nameLit = name.replace(/'/g, "''");
    lines.push(`  INSERT INTO public.psps (organization_id, name, commission_rate, is_active)`);
    lines.push(`    VALUES (_org_id, '${nameLit}', 0.0000, true)`);
    lines.push(`    ON CONFLICT (organization_id, name) DO NOTHING;`);
  }
  lines.push(``);
  lines.push(`  -- 5. Insert PSP commission rates (effective_from = first day of month)`);
  for (const [month, monthMap] of pspRates) {
    const monthStr = String(month).padStart(2, "0");
    const effDate = `2026-${monthStr}-01`;
    for (const [name, rate] of monthMap) {
      const nameLit = name.replace(/'/g, "''");
      lines.push(`  INSERT INTO public.psp_commission_rates (psp_id, organization_id, commission_rate, effective_from)`);
      lines.push(`    SELECT id, _org_id, ${rate}, '${effDate}'::date`);
      lines.push(`    FROM public.psps WHERE organization_id = _org_id AND name = '${nameLit}' LIMIT 1;`);
    }
  }
  lines.push(``);
  lines.push(`  -- 6. Insert daily USD/TL exchange rates`);
  const sortedDates = [...exchangeRates.keys()].sort();
  for (const date of sortedDates) {
    const rate = exchangeRates.get(date);
    lines.push(`  INSERT INTO public.exchange_rates (organization_id, currency, rate_to_tl, rate_date, source)`);
    lines.push(`    VALUES (_org_id, 'USD', ${rate}, '${date}'::date, 'csv-import')`);
    lines.push(`    ON CONFLICT (organization_id, currency, rate_date) DO UPDATE SET rate_to_tl = EXCLUDED.rate_to_tl;`);
  }
  lines.push(``);
  lines.push(`  -- 7. Insert transfers (batch VALUES)`);

  // Determine exchange rate for each transfer
  function rateForDate(date) {
    if (exchangeRates.has(date)) return exchangeRates.get(date);
    // Fallback: nearest previous date, then nearest next date
    const sorted = [...exchangeRates.keys()].sort();
    let prev = null;
    for (const d of sorted) {
      if (d <= date) prev = d; else break;
    }
    if (prev) return exchangeRates.get(prev);
    // Otherwise first future
    for (const d of sorted) if (d >= date) return exchangeRates.get(d);
    return 43.05;
  }

  // Build INSERT for transfers in chunks
  const CHUNK = 100;
  for (let i = 0; i < transfers.length; i += CHUNK) {
    const chunk = transfers.slice(i, i + CHUNK);
    lines.push(`  INSERT INTO public.transfers (`);
    lines.push(`    organization_id, full_name, transfer_date, amount, commission, net, currency,`);
    lines.push(`    category_id, payment_method_id, type_id, psp_id, crm_id, meta_id,`);
    lines.push(`    exchange_rate, amount_try, amount_usd, commission_rate_snapshot`);
    lines.push(`  ) VALUES`);
    const valueLines = [];
    for (const t of chunk) {
      const rate = rateForDate(t.date);
      const ts = t.timestamp ? `'${t.timestamp}'::timestamptz` : `'${t.date} 12:00:00+03'::timestamptz`;
      const amountAbs = t.amount; // keep sign; schema allows negative for ÇEKME
      const amountTry = t.currency === "TRY" ? amountAbs : amountAbs * rate;
      const amountUsd = t.currency === "USDT" ? amountAbs : amountAbs / rate;

      // PSP id via subquery
      const pspExpr = t.pspName
        ? `(SELECT id FROM public.psps WHERE organization_id = _org_id AND name = ${sqlStr(t.pspName)} LIMIT 1)`
        : `NULL`;

      valueLines.push(
        `    (_org_id, ${sqlStr(t.fullName)}, ${ts}, ` +
        `${sqlNum(amountAbs)}, ${sqlNum(t.commission)}, ${sqlNum(t.net)}, ` +
        `${sqlStr(t.currency)}, ${sqlStr(t.category)}, ${sqlStr(t.paymentMethod)}, ${sqlStr(t.type)}, ` +
        `${pspExpr}, ${sqlStr(t.crmId)}, ${sqlStr(t.metaId)}, ` +
        `${sqlNum(rate)}, ${sqlNum(round2(amountTry))}, ${sqlNum(round2(amountUsd))}, NULL)`
      );
    }
    lines.push(valueLines.join(",\n") + ";");
    lines.push(``);
  }

  lines.push(`  RAISE NOTICE 'Inserted % transfers', ${transfers.length};`);
  lines.push(`END $$;`);
  lines.push(``);
  lines.push(`-- Re-enable audit triggers`);
  lines.push(`ALTER TABLE public.transfers ENABLE TRIGGER on_transfer_created;`);
  lines.push(`ALTER TABLE public.transfers ENABLE TRIGGER on_transfer_updated_audit;`);
  lines.push(``);
  lines.push(`COMMIT;`);
  lines.push(``);
  lines.push(`-- ============================================================================`);
  lines.push(`-- POST-IMPORT VERIFICATION (run manually)`);
  lines.push(`-- ============================================================================`);
  lines.push(`-- SELECT COUNT(*), MIN(transfer_date), MAX(transfer_date),`);
  lines.push(`--        SUM(CASE WHEN category_id = 'dep' THEN amount_try ELSE 0 END) AS total_dep_try,`);
  lines.push(`--        SUM(CASE WHEN category_id = 'wd'  THEN ABS(amount_try) ELSE 0 END) AS total_wd_try`);
  lines.push(`-- FROM public.transfers`);
  lines.push(`-- WHERE organization_id = (SELECT id FROM organizations WHERE name ILIKE 'ORDERINVEST')`);
  lines.push(`--   AND transfer_date >= '2026-01-01';`);
  lines.push(`--`);
  lines.push(`-- If all looks good, clean up backup:`);
  lines.push(`-- DROP TABLE public.transfers_backup_2026_import;`);
  lines.push(``);

  return lines.join("\n");
}

function round2(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

main();
