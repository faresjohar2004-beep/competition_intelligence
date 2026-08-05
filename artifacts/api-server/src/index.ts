import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./lib/stripeClient";
import { pool } from "@workspace/db";
import cron from "node-cron";
import { scheduleCronJobs, drainPendingDeletions } from "./lib/cronJobs";

// ─── Application schema migrations ────────────────────────────────────────────
// Ensures tables added after the initial deploy exist before the server starts.
// Uses CREATE TABLE IF NOT EXISTS so it is safe to run on every startup.
async function runAppMigrations() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token      TEXT    NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Durable deletion queue. Each row represents a deletion that started but
    // may not have fully completed:
    //   clerk_deleted_at NULL  → Clerk deletion not yet confirmed
    //   clerk_deleted_at SET   → Clerk identity gone; DB cleanup still needed
    // FK ON DELETE CASCADE means the row auto-disappears when the user row
    // is successfully deleted, so no explicit cleanup call is needed.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pending_deletions (
        id                SERIAL PRIMARY KEY,
        user_id           INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        clerk_id          TEXT    NOT NULL,
        clerk_deleted_at  TIMESTAMPTZ,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // Add clerk_deleted_at and FK constraint to existing installs that lack them.
    await pool.query(`
      ALTER TABLE pending_deletions
        ADD COLUMN IF NOT EXISTS clerk_deleted_at TIMESTAMPTZ
    `);
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'pending_deletions_user_id_fkey'
            AND conrelid = 'pending_deletions'::regclass
        ) THEN
          ALTER TABLE pending_deletions
            ADD CONSTRAINT pending_deletions_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$
    `);

    logger.info("App schema migrations applied (push_tokens, pending_deletions)");
  } catch (err) {
    logger.error({ err }, "App schema migration failed");
    throw err;
  }
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL not set — skipping Stripe init");
    return;
  }
  try {
    logger.info("Initializing Stripe schema...");
    await runMigrations({ databaseUrl });
    logger.info("Stripe schema ready");

    const stripeSync = await getStripeSync();
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    await stripeSync.findOrCreateManagedWebhook(`${webhookBaseUrl}/api/stripe/webhook`);
    logger.info("Stripe webhook configured");

    stripeSync.syncBackfill()
      .then(() => logger.info("Stripe data synced"))
      .catch((err) => logger.error({ err }, "Stripe backfill error"));
  } catch (err) {
    logger.error({ err }, "Stripe init failed — continuing without Stripe");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

await runAppMigrations();
await initStripe();

// ─── Drain any pending account deletions from previous failed attempts ────────
drainPendingDeletions().catch((err) =>
  logger.error({ err }, "Startup pending deletion drain failed"),
);

// ─── Cron jobs ────────────────────────────────────────────────────────────────
scheduleCronJobs(cron);

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
