/**
 * Creates AstraVita Pro products and prices in Stripe.
 * Idempotent — safe to run multiple times.
 *
 * Run with:
 *   pnpm --filter @workspace/scripts exec tsx src/seed-stripe-products.ts
 */

async function getStripeCredentials(): Promise<{ secretKey: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error("Missing Replit env vars. Ensure Stripe integration is connected.");
  }

  const resp = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    {
      headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken },
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!resp.ok) throw new Error(`Failed to fetch Stripe credentials: ${resp.status}`);

  const data = await resp.json();
  const settings = data.items?.[0]?.settings;
  const secretKey = settings?.secret_key ?? settings?.secret;
  if (!secretKey) throw new Error("Stripe secret key not found in integration settings.");
  return { secretKey };
}

async function createProducts() {
  const { secretKey } = await getStripeCredentials();

  // Use Stripe API directly (no SDK needed in scripts)
  const headers = {
    "Authorization": `Bearer ${secretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const stripePost = async (path: string, body: Record<string, string>) => {
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
      method: "POST",
      headers,
      body: new URLSearchParams(body).toString(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Stripe error: ${err.error?.message}`);
    }
    return res.json();
  };

  const stripeGet = async (path: string, params?: Record<string, string>) => {
    const url = new URL(`https://api.stripe.com/v1/${path}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${secretKey}` } });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Stripe error: ${err.error?.message}`);
    }
    return res.json();
  };

  // Check if AstraVita Pro already exists
  const existing = await stripeGet("products/search", { query: "name:'AstraVita Pro' AND active:'true'" });

  if (existing.data?.length > 0) {
    const product = existing.data[0];
    console.log(`✓ AstraVita Pro already exists (${product.id}) — skipping creation.`);

    // Show existing prices
    const prices = await stripeGet("prices", { product: product.id, active: "true", limit: "10" });
    console.log("Existing prices:");
    for (const price of prices.data) {
      const interval = price.recurring?.interval;
      console.log(`  ${price.id}  $${price.unit_amount / 100}/${interval ?? "one-time"}`);
    }
    return;
  }

  console.log("Creating AstraVita Pro product...");
  const product = await stripePost("products", {
    name: "AstraVita Pro",
    description: "Unlock the full ASTRA experience — unlimited AI coaching, long-form future letters, advanced projections, and biography AI.",
    "metadata[app]": "astravita",
  });
  console.log(`✓ Created product: ${product.id}`);

  const monthly = await stripePost("prices", {
    product: product.id,
    unit_amount: "999",   // $9.99/month
    currency: "usd",
    "recurring[interval]": "month",
  });
  console.log(`✓ Monthly price: $9.99/mo  (${monthly.id})`);

  const yearly = await stripePost("prices", {
    product: product.id,
    unit_amount: "7900",  // $79.00/year (~33% off)
    currency: "usd",
    "recurring[interval]": "year",
  });
  console.log(`✓ Yearly price:  $79.00/yr (${yearly.id})`);

  console.log("\n✅ Products created! Webhooks will sync them to your database automatically.");
  console.log("   Monthly price ID:", monthly.id);
  console.log("   Yearly price ID: ", yearly.id);
}

createProducts().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
