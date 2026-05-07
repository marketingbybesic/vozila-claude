#!/usr/bin/env node
/**
 * Vozila.hr — Migration runner.
 *
 * Reads DATABASE_URL from server/.env (same pattern as seed-db.mjs) and
 * executes each *.sql file in server/db/migrations/ in lexical order via
 * the `pg` driver.
 *
 * Idempotent: every migration in this repo uses CREATE OR REPLACE,
 * IF NOT EXISTS, DROP TRIGGER IF EXISTS, etc. Safe to re-run any time.
 *
 * Usage:
 *   node scripts/run-migrations.mjs              # run all 001..NNN in order
 *   node scripts/run-migrations.mjs 012 013 014  # run specific files (numeric prefix or full name)
 *   node scripts/run-migrations.mjs --dry        # parse + list files, don't execute
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = resolve(__dirname, '..');
const MIG_DIR    = resolve(ROOT, 'server/db/migrations');
const DRY        = process.argv.includes('--dry');

// ---------------------------------------------------------------------------
// 1. Read .env files (same loader as seed-db.mjs)
// ---------------------------------------------------------------------------
function readEnvFile(p) {
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}
const serverEnv = readEnvFile(resolve(ROOT, 'server/.env'));
let DATABASE_URL = serverEnv.DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('✖ DATABASE_URL not set (server/.env or env). Cannot run migrations.');
  process.exit(1);
}

// Build pooler URL fallback (IPv6 → IPv4 via aws-1-eu-central-1 pooler).
// Same logic as seed-db.mjs.
function buildPoolerUrl(url) {
  const m = url.match(/postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^/:]+):?(\d+)?\/([^?]+)/);
  if (!m) return null;
  const [, , pass, host, , db] = m;
  const refMatch = host.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
  if (!refMatch) return null;
  const ref = refMatch[1];
  return `postgresql://postgres.${ref}:${pass}@aws-1-eu-central-1.pooler.supabase.com:6543/${db}`;
}

// ---------------------------------------------------------------------------
// 2. Resolve which migrations to run
// ---------------------------------------------------------------------------
function pickMigrations() {
  const all = readdirSync(MIG_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (args.length === 0) return all;

  const picked = [];
  for (const a of args) {
    const match = all.find((f) => f === a || f.startsWith(`${a}_`));
    if (!match) {
      console.error(`✖ Migration not found: ${a}`);
      process.exit(1);
    }
    picked.push(match);
  }
  return picked;
}

const targets = pickMigrations();
console.log(`→ Migrations dir: ${MIG_DIR}`);
console.log(`→ Will run ${targets.length} file${targets.length === 1 ? '' : 's'}:`);
for (const t of targets) console.log(`    • ${t}`);

if (DRY) {
  console.log('\n(dry run — exiting before connect)');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 3. Connect to Postgres + run each file in a transaction
// ---------------------------------------------------------------------------
const { Client } = require(resolve(ROOT, 'scripts/node_modules/pg'));

async function tryConnect(url, label) {
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 60_000,
    query_timeout: 60_000,
  });
  await client.connect();
  console.log(`✓ Connected via ${label}`);
  return client;
}

let client;
try {
  client = await tryConnect(DATABASE_URL, 'DATABASE_URL');
} catch (e) {
  console.warn(`! Direct DATABASE_URL failed: ${e.code || e.message}`);
  const pooler = buildPoolerUrl(DATABASE_URL);
  if (!pooler) {
    console.error('✖ No pooler URL derivable from DATABASE_URL. Aborting.');
    process.exit(1);
  }
  console.log('→ Falling back to EU pooler...');
  client = await tryConnect(pooler, 'pooler');
}

// ---------------------------------------------------------------------------
// 4. Execute migrations
// ---------------------------------------------------------------------------
let okCount = 0;
let failCount = 0;

for (const file of targets) {
  const path = resolve(MIG_DIR, file);
  const sql = readFileSync(path, 'utf8');
  process.stdout.write(`\n──── ${file} ────────────────────────────────\n`);
  const t0 = Date.now();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    const ms = Date.now() - t0;
    console.log(`✓ ${file} applied in ${ms}ms`);
    okCount++;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error(`✖ ${file} FAILED:`);
    console.error(`  ${e.message}`);
    if (e.detail) console.error(`  detail: ${e.detail}`);
    if (e.hint)   console.error(`  hint:   ${e.hint}`);
    if (e.position) console.error(`  position: ${e.position}`);
    failCount++;
    // Continue with subsequent migrations — user can decide whether to retry.
  }
}

await client.end();

console.log('\n══════════════════════════════════════════════');
console.log(`  ${okCount} succeeded · ${failCount} failed`);
console.log('══════════════════════════════════════════════');
process.exit(failCount > 0 ? 2 : 0);
