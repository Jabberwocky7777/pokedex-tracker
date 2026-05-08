/**
 * Fetches Battle Tower data from the Gen IV Frontier Informant Google Sheet
 * and writes two JSON files used by the Trainer Lookup and Damage Calculator tabs.
 *
 * Run: npm run fetch-battle-tower
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../src/data");

const SHEET_ID = "1neWvhrrd27FIJ87bwzcD6OcBtheD5leZB8LuGNqnUHo";
const GID_SETS = "222775103";
const GID_TRAINERS = "1742900250";

function csvUrl(gid: string) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
}

// ─── Minimal CSV parser (handles quoted fields with embedded commas) ──────────

function parseCSVRow(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSV(text: string): string[][] {
  // Normalize line endings
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  return lines.map(parseCSVRow);
}

// ─── Fetch / read helper ──────────────────────────────────────────────────────

/**
 * Tries to read a local CSV file first; falls back to remote fetch.
 * Google Sheets "anyone with link" requires auth for the export URL,
 * so if remote fetch fails the user should:
 *   1. Open the sheet in Chrome
 *   2. File > Download > CSV (.csv)
 *   3. Save as `scripts/data/<name>.csv` (sets.csv or trainers.csv)
 */
async function fetchCSV(url: string, localPath?: string): Promise<string[][]> {
  if (localPath && fs.existsSync(localPath)) {
    console.log(`  Reading local file: ${localPath}`);
    const text = fs.readFileSync(localPath, "utf8");
    return parseCSV(text);
  }

  console.log(`  Fetching: ${url}`);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; DataFetcher/1.0)" },
  });
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} — Google Sheets requires auth for export.\n` +
      `  Please download the CSV manually:\n` +
      `  1. Open the sheet in Chrome → File > Download > CSV\n` +
      `  2. Save as: ${localPath ?? "scripts/data/<name>.csv"}\n` +
      `  Then re-run: npm run fetch-battle-tower`
    );
  }
  const text = await res.text();
  return parseCSV(text);
}

// ─── Frontier Sets parser ─────────────────────────────────────────────────────

export interface BattleTowerSet {
  id: number;
  species: string;
  setNumber: number;
  nature: string;
  item: string;
  moves: [string, string, string, string];
  evSpread: string;
  stats: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
}

function parseSpeciesSet(raw: string): { species: string; setNumber: number } {
  // "Abomasnow-1" → species: "Abomasnow", setNumber: 1
  // "Porygon-Z-2" → species: "Porygon-Z", setNumber: 2
  // "Ho-Oh-3"     → species: "Ho-Oh", setNumber: 3
  const match = raw.match(/^(.+)-(\d)$/);
  if (!match) throw new Error(`Cannot parse species-set: "${raw}"`);
  return { species: match[1], setNumber: parseInt(match[2], 10) };
}

function parseSets(rows: string[][]): BattleTowerSet[] {
  const sets: BattleTowerSet[] = [];

  // Row 0 is the header row — skip it
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Skip empty rows
    if (!row[0] || row[0] === "#") continue;

    const rawId = row[0];
    const rawSpecies = row[1];
    const nature = row[2];
    const item = row[3];
    const move1 = row[4];
    const move2 = row[5];
    const move3 = row[6];
    const move4 = row[7];
    const evSpread = row[8];
    const hp = parseInt(row[9], 10);
    const atk = parseInt(row[10], 10);
    const def = parseInt(row[11], 10);
    const spa = parseInt(row[12], 10);
    const spd = parseInt(row[13], 10);
    const spe = parseInt(row[14], 10);

    if (!rawSpecies || !nature || isNaN(hp)) continue;

    let speciesParsed: { species: string; setNumber: number };
    try {
      speciesParsed = parseSpeciesSet(rawSpecies);
    } catch {
      console.warn(`  Skipping unparseable row ${i + 1}: "${rawSpecies}"`);
      continue;
    }

    sets.push({
      id: parseInt(rawId, 10) || i,
      species: speciesParsed.species,
      setNumber: speciesParsed.setNumber,
      nature,
      item,
      moves: [move1, move2, move3, move4],
      evSpread,
      stats: { hp, atk, def, spa, spd, spe },
    });
  }

  return sets;
}

// ─── Battle Frontier Trainers parser ─────────────────────────────────────────

export interface TrainerEntry {
  class: string;
  gender: "M" | "F" | null;
  name: string;
}

export interface PoolEntry {
  species: string;
  sets: number[]; // e.g. [1,2,3,4] or [4]
}

export interface TrainerCategory {
  id: string;
  description: string;
  ivTier: 21 | 31;
  game: "platinum" | "hgss" | "both";
  round: "open" | "super" | "both";
  pokemonPool: PoolEntry[];
  trainers: TrainerEntry[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 40);
}

/**
 * Parse "Jynx 1-4" → { species: "Jynx", sets: [1,2,3,4] }
 * Parse "Venusaur 4" → { species: "Venusaur", sets: [4] }
 */
function parsePoolEntry(raw: string): PoolEntry | null {
  raw = raw.trim();
  if (!raw) return null;

  // Try "Species N-M" range
  const rangeMatch = raw.match(/^(.+?)\s+(\d)-(\d)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[2], 10);
    const end = parseInt(rangeMatch[3], 10);
    const sets: number[] = [];
    for (let s = start; s <= end; s++) sets.push(s);
    return { species: rangeMatch[1].trim(), sets };
  }

  // Try "Species N" single set
  const singleMatch = raw.match(/^(.+?)\s+(\d)$/);
  if (singleMatch) {
    return { species: singleMatch[1].trim(), sets: [parseInt(singleMatch[2], 10)] };
  }

  return null;
}

/**
 * Parse the pool description from a category header.
 * Examples:
 *   "Legendary Pokémon, All Sets: Articuno 1-4, Zapdos 1-4, ..."
 *   "Ice Type, All Sets: Jynx 1-4, Dawgong 1-4, ..."
 *   "Set 4 – Group 1: Venusaur 4, Charizard 4, ..."
 *   "Fighting, Electric, Dark, Ghost & Psychic Type, Set 4, 21 IVs"
 */
function parsePoolFromHeader(header: string): PoolEntry[] {
  // Find the pool section after a colon
  const colonIdx = header.indexOf(":");
  if (colonIdx === -1) return [];

  const poolStr = header.substring(colonIdx + 1);
  const entries = poolStr.split(",").map((s) => s.trim()).filter(Boolean);

  const pool: PoolEntry[] = [];
  for (const entry of entries) {
    const parsed = parsePoolEntry(entry);
    if (parsed) pool.push(parsed);
  }
  return pool;
}

/**
 * Parse trainer row: "- Ace Trainer (F) Loda"
 * → { class: "Ace Trainer", gender: "F", name: "Loda" }
 */
function parseTrainer(raw: string): TrainerEntry | null {
  const trimmed = raw.replace(/^-\s*/, "").trim();
  if (!trimmed) return null;

  // Try with gender: "Ace Trainer (F) Loda"
  const withGender = trimmed.match(/^(.+?)\s+\(([MF])\)\s+(.+)$/);
  if (withGender) {
    return {
      class: withGender[1].trim(),
      gender: withGender[2] as "M" | "F",
      name: withGender[3].trim(),
    };
  }

  // No gender: "Gentleman Joachim" — class is everything before the last word
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return {
      class: parts.slice(0, -1).join(" "),
      gender: null,
      name: parts[parts.length - 1],
    };
  }

  return null;
}

function parseTrainers(rows: string[][]): TrainerCategory[] {
  const categories: TrainerCategory[] = [];
  let current: TrainerCategory | null = null;

  for (const row of rows) {
    const cell = row[0] ?? "";
    if (!cell) continue;

    // IV tier row
    const ivMatch = cell.match(/^(\d+)\s*IVs?$/i);
    if (ivMatch) {
      if (current) current.ivTier = parseInt(ivMatch[1], 10) as 21 | 31;
      continue;
    }

    // Trainer row (starts with "-")
    if (cell.startsWith("-")) {
      if (current) {
        const trainer = parseTrainer(cell);
        if (trainer) current.trainers.push(trainer);
      }
      continue;
    }

    // Category header — anything else that isn't blank
    // Determine round from IV tier hint in header (if present)
    const hasOpenHint = /21\s*IVs?/i.test(cell);
    const hasSuperHint = /31\s*IVs?/i.test(cell);

    const pool = parsePoolFromHeader(cell);
    const slug = slugify(cell.replace(/,.*$/, "")); // slug from first segment only

    current = {
      id: slug,
      description: cell,
      ivTier: hasOpenHint ? 21 : hasSuperHint ? 31 : 31, // default 31, updated by IV row
      game: "both",
      round: hasOpenHint ? "open" : hasSuperHint ? "super" : "both",
      pokemonPool: pool,
      trainers: [],
    };
    categories.push(current);
  }

  // Post-process: update round based on ivTier if not already set from header
  for (const cat of categories) {
    if (cat.round === "both") {
      cat.round = cat.ivTier === 21 ? "open" : "super";
    }
  }

  return categories;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Battle Tower data fetch starting...\n");

  // Ensure output directory exists
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  // Ensure local data dir exists for manual CSV fallback
  const localDataDir = path.join(__dirname, "data");
  if (!fs.existsSync(localDataDir)) fs.mkdirSync(localDataDir, { recursive: true });

  // ── Frontier Sets ──
  console.log("Fetching Frontier Sets...");
  const setsRows = await fetchCSV(
    csvUrl(GID_SETS),
    path.join(localDataDir, "sets.csv")
  );
  const sets = parseSets(setsRows);
  const setsOut = path.join(DATA_DIR, "battle-tower-sets.json");
  fs.writeFileSync(setsOut, JSON.stringify(sets, null, 2));
  console.log(`  ✓ Wrote ${sets.length} sets → ${setsOut}\n`);

  // ── Battle Frontier Trainers ──
  console.log("Fetching Battle Frontier Trainers...");
  const trainerRows = await fetchCSV(
    csvUrl(GID_TRAINERS),
    path.join(localDataDir, "trainers.csv")
  );
  const trainers = parseTrainers(trainerRows);
  const trainersOut = path.join(DATA_DIR, "battle-tower-trainers.json");
  fs.writeFileSync(trainersOut, JSON.stringify(trainers, null, 2));

  const totalTrainers = trainers.reduce((s, c) => s + c.trainers.length, 0);
  console.log(`  ✓ Wrote ${trainers.length} categories, ${totalTrainers} trainers → ${trainersOut}\n`);

  console.log("Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
