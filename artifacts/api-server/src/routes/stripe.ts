import { Router } from "express";
import { stripeStorage } from "../lib/stripeStorage";
import { getUncachableStripeClient } from "../lib/stripeClient";
import { requireAuthWithUser } from "../lib/auth";

const router = Router();

// GET /api/stripe/subscription — current user's subscription status
router.get("/subscription", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  try {
    if (!user.stripeCustomerId) {
      return res.json({ isPro: false, subscription: null });
    }
    const subscription = await stripeStorage.getActiveSubscriptionForCustomer(user.stripeCustomerId);
    const isPro = !!subscription && ["active", "trialing"].includes(subscription.status as string);
    res.json({ isPro, subscription });
  } catch (err: any) {
    res.json({ isPro: user.isPro ?? false, subscription: null });
  }
});

// GET /api/stripe/products — list plans with prices
router.get("/products", async (_req, res) => {
  try {
    const rows = await stripeStorage.listProductsWithPrices();
    const productsMap = new Map<string, any>();
    for (const row of rows as any[]) {
      if (!productsMap.has(row.product_id)) {
        productsMap.set(row.product_id, {
          id: row.product_id,
          name: row.product_name,
          description: row.product_description,
          active: row.product_active,
          prices: [],
        });
      }
      if (row.price_id) {
        productsMap.get(row.product_id).prices.push({
          id: row.price_id,
          unitAmount: row.unit_amount,
          currency: row.currency,
          recurring: row.recurring,
        });
      }
    }
    res.json({ data: Array.from(productsMap.values()) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stripe/checkout — create Stripe Checkout session
router.post("/checkout", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const { priceId } = req.body;
  if (!priceId) return res.status(400).json({ error: "priceId required" });

  try {
    const stripe = await getUncachableStripeClient();

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: String(user.id) },
      });
      await stripeStorage.updateUserStripeInfo(user.id, { stripeCustomerId: customer.id });
      customerId = customer.id;
    }

    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/upgrade`,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stripe/portal — customer billing portal
router.post("/portal", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  if (!user.stripeCustomerId) {
    return res.status(400).json({ error: "No billing account found" });
  }
  try {
    const stripe = await getUncachableStripeClient();
    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/settings`,
    });
    res.json({ url: portalSession.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
