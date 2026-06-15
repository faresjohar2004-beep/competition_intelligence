import { motion } from "framer-motion";
import { useState } from "react";
import { useLocation } from "wouter";
import { Crown, Zap, BookOpen, Brain, TrendingUp, Star, Check, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStripeProducts, useCreateCheckout } from "@/hooks/useSubscription";

const PRO_FEATURES = [
  { icon: BookOpen, label: "Full AI Letters from Future Self", desc: "Long-form, deeply personal letters with full context" },
  { icon: Brain, label: "Unlimited AI Coach conversations", desc: "No daily limits — coach as much as you need" },
  { icon: TrendingUp, label: "Advanced future projections", desc: "Detailed 1-year and 5-year trajectory modeling" },
  { icon: Star, label: "AI-generated Biography entries", desc: "Auto-written milestone stories from your actions" },
  { icon: Zap, label: "Priority coaching responses", desc: "Faster, longer, more detailed AI responses" },
];

export default function Upgrade() {
  const [, navigate] = useLocation();
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const { data: productsData, isLoading: productsLoading } = useStripeProducts();
  const createCheckout = useCreateCheckout();

  const products = (productsData?.data ?? []) as any[];
  const proProduct = products.find((p: any) =>
    p.name?.toLowerCase().includes("pro") || p.name?.toLowerCase().includes("astra")
  ) ?? products[0];

  const prices = proProduct?.prices ?? [];
  const monthlyPrice = prices.find((p: any) => p.recurring?.interval === "month");
  const yearlyPrice = prices.find((p: any) => p.recurring?.interval === "year");
  const selectedPrice = billingInterval === "month" ? monthlyPrice : yearlyPrice;

  const monthlyAmount = monthlyPrice ? (monthlyPrice.unitAmount / 100).toFixed(2) : "9.99";
  const yearlyAmount = yearlyPrice ? (yearlyPrice.unitAmount / 100).toFixed(2) : "79.99";
  const yearlyMonthly = yearlyPrice ? (yearlyPrice.unitAmount / 100 / 12).toFixed(2) : "6.67";

  const handleUpgrade = async () => {
    if (!selectedPrice?.id) return;
    try {
      const { url } = await createCheckout.mutateAsync(selectedPrice.id);
      if (url) window.location.href = url;
    } catch (err) {
      console.error("Checkout error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start px-4 py-8">
      <div className="w-full max-w-2xl">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
            <Crown className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Astra OS Pro</span>
          </div>
          <h1 className="text-3xl font-bold mb-3">
            Your free trial has ended.
            <br />
            <span className="text-primary">Keep building your future self.</span>
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            You've spent 5 days building evidence that you're serious. Pro unlocks everything you need to go deeper.
          </p>
        </motion.div>

        {/* Billing toggle */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center gap-3 mb-8"
        >
          <button
            onClick={() => setBillingInterval("month")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              billingInterval === "month"
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval("year")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              billingInterval === "year"
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              billingInterval === "year" ? "bg-white/20" : "bg-emerald-500/20 text-emerald-400"
            }`}>
              Save 33%
            </span>
          </button>
        </motion.div>

        {/* Pricing card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-primary/30 rounded-2xl p-8 mb-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

          <div className="relative">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-bold">
                ${billingInterval === "month" ? monthlyAmount : yearlyMonthly}
              </span>
              <span className="text-muted-foreground">/month</span>
            </div>
            {billingInterval === "year" && (
              <p className="text-sm text-emerald-400 mb-4">
                Billed ${yearlyAmount}/year — saves you ${(Number(monthlyAmount) * 12 - Number(yearlyAmount)).toFixed(2)}
              </p>
            )}

            {/* Features */}
            <div className="space-y-3 my-6">
              {PRO_FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={handleUpgrade}
              disabled={createCheckout.isPending || productsLoading || !selectedPrice}
              className="w-full h-12 text-base font-semibold"
            >
              {createCheckout.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Redirecting to checkout…</>
              ) : productsLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading…</>
              ) : (
                <><Crown className="h-4 w-4 mr-2" />Upgrade to Pro — ${billingInterval === "month" ? monthlyAmount : yearlyAmount}/{billingInterval === "month" ? "mo" : "yr"}</>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground/60 mt-3">
              Secure checkout via Stripe · Cancel anytime · No hidden fees
            </p>
          </div>
        </motion.div>

        {/* Social proof */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-sm text-muted-foreground"
        >
          Join thousands building their future selves with Astra OS Pro
        </motion.p>
      </div>
    </div>
  );
}
