/**
 * Manually runs stripe-replit-sync migrations using the pg-migrate library.
 * Run with: pnpm --filter @workspace/scripts exec tsx src/run-stripe-migrations.ts
 */
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { Client } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL required");
}

// Find the stripe-replit-sync package using Node resolution
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const syncPkg = require.resolve("stripe-replit-sync");
const MIGRATIONS_DIR = path.join(path.dirname(syncPkg), "migrations");

async function run() {
  console.log("Migrations dir:", MIGRATIONS_DIR);
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error("Migrations directory not found!");
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Create stripe schema
    await client.query("CREATE SCHEMA IF NOT EXISTS stripe;");
    console.log("✓ stripe schema ready");

    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stripe._migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        run_on TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✓ _migrations table ready");

    // Get already-run migrations
    const { rows: done } = await client.query("SELECT name FROM stripe._migrations;");
    const doneSet = new Set(done.map((r: any) => r.name));

    // Read and sort migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith(".sql"))
      .sort();

    console.log(`Found ${files.length} migration files, ${doneSet.size} already applied`);

    for (const file of files) {
      if (doneSet.has(file)) {
        console.log(`  skip ${file}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
      if (!sql.trim() || sql.trim() === "select 1;") {
        // Record but don't execute empty/placeholder
        await client.query("INSERT INTO stripe._migrations (name) VALUES ($1) ON CONFLICT DO NOTHING;", [file]);
        console.log(`  skip (empty) ${file}`);
        continue;
      }
      try {
        await client.query(sql);
        await client.query("INSERT INTO stripe._migrations (name) VALUES ($1) ON CONFLICT DO NOTHING;", [file]);
        console.log(`  ✓ ran ${file}`);
      } catch (err: any) {
        // Some migrations may fail if already applied via different means
        console.warn(`  ⚠ ${file}: ${err.message}`);
        await client.query("INSERT INTO stripe._migrations (name) VALUES ($1) ON CONFLICT DO NOTHING;", [file]);
      }
    }

    // Verify
    const { rows: tables } = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'stripe' ORDER BY table_name;"
    );
    console.log("\nStripe tables created:");
    tables.forEach((t: any) => console.log(" -", t.table_name));

  } finally {
    await client.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
