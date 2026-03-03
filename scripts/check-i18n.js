/**
 * i18n Translation Parity Check
 *
 * Compares all translation namespaces between en and tr locales.
 * Reports missing and extra keys in either language.
 * Exits with code 1 if any mismatches are found (useful for CI).
 *
 * Usage: node scripts/check-i18n.js
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOCALES_DIR = resolve(__dirname, "..", "src", "locales");
const LANGUAGES = ["en", "tr"];
const NAMESPACES = ["common", "components", "pages"];

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Recursively extract all dot-notation keys from a nested object.
 * e.g. { a: { b: "x", c: "y" } } => ["a.b", "a.c"]
 */
function getKeys(obj, prefix = "") {
  const keys = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/**
 * Load and parse a JSON translation file.
 */
function loadJson(lang, namespace) {
  const filePath = resolve(LOCALES_DIR, lang, `${namespace}.json`);
  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`  ERROR: Could not read ${filePath}: ${err.message}`);
    process.exit(1);
  }
}

// ── Main ─────────────────────────────────────────────────────────────

let totalMissing = 0;
let totalExtra = 0;

console.log("");
console.log("=".repeat(60));
console.log("  i18n Translation Parity Check");
console.log("  Languages: " + LANGUAGES.join(", "));
console.log("  Namespaces: " + NAMESPACES.join(", "));
console.log("=".repeat(60));
console.log("");

for (const ns of NAMESPACES) {
  const data = {};
  const keysByLang = {};

  for (const lang of LANGUAGES) {
    data[lang] = loadJson(lang, ns);
    keysByLang[lang] = new Set(getKeys(data[lang]));
  }

  // Compare en vs tr
  const [langA, langB] = LANGUAGES;
  const keysA = keysByLang[langA];
  const keysB = keysByLang[langB];

  const missingInB = [...keysA].filter((k) => !keysB.has(k)).sort();
  const missingInA = [...keysB].filter((k) => !keysA.has(k)).sort();

  const nsMissingCount = missingInB.length + missingInA.length;

  if (nsMissingCount === 0) {
    console.log(`[${ns}] OK -- ${keysA.size} keys, fully in sync`);
  } else {
    console.log(`[${ns}] MISMATCH`);

    if (missingInB.length > 0) {
      console.log(`  Missing in ${langB} (present in ${langA}): ${missingInB.length} key(s)`);
      for (const key of missingInB) {
        console.log(`    - ${key}`);
      }
      totalMissing += missingInB.length;
    }

    if (missingInA.length > 0) {
      console.log(`  Missing in ${langA} (present in ${langB}): ${missingInA.length} key(s)`);
      for (const key of missingInA) {
        console.log(`    - ${key}`);
      }
      totalExtra += missingInA.length;
    }
  }

  console.log("");
}

// ── Summary ──────────────────────────────────────────────────────────

console.log("-".repeat(60));
const total = totalMissing + totalExtra;
if (total === 0) {
  console.log("  All translations are in sync. No mismatches found.");
  console.log("-".repeat(60));
  console.log("");
  process.exit(0);
} else {
  console.log(`  TOTAL MISMATCHES: ${total}`);
  console.log(`    Missing in tr: ${totalMissing}`);
  console.log(`    Missing in en: ${totalExtra}`);
  console.log("-".repeat(60));
  console.log("");
  process.exit(1);
}
