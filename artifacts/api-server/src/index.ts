import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./lib/stripeClient";
import { pool } from "@workspace/db";
import cron from "node-cron";
import { sendDailyReminders, preGenerateTomorrowMissions } from "./routes/push";

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
    logger.info("App schema migrations applied (push_tokens)");
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

// ─── Hourly jobs ──────────────────────────────────────────────────────────────
// Push reminders: runs every hour, but sendDailyReminders() only sends to users
// whose local clock reads 7PM — so each user gets their reminder at the right
// time regardless of timezone (replaces the old fixed 8PM UTC blast).
// Pre-generate missions: still fires once daily at 8PM UTC for active users.
cron.schedule("0 * * * *", () => {
  logger.info("Running hourly push reminder check (timezone-aware 7PM local)");
  sendDailyReminders().catch((err) => logger.error({ err }, "Push reminder job failed"));
});

cron.schedule("0 20 * * *", () => {
  logger.info("Running nightly mission pre-generation (8pm UTC)");
  preGenerateTomorrowMissions().catch((err) => logger.error({ err }, "Mission pre-generation failed"));
});

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
