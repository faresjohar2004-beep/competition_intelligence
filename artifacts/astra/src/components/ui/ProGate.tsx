import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsPaywalled } from "@/hooks/useSubscription";
import type { ReactNode } from "react";

interface ProGateProps {
  feature: string;
  description?: string;
  children: ReactNode;
}

export function ProGate({ feature, description, children }: ProGateProps) {
  const [, navigate] = useLocation();
  const isPaywalled = useIsPaywalled();

  if (!isPaywalled) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-30 blur-[2px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card/95 backdrop-blur-sm border border-primary/20 rounded-2xl px-8 py-6 text-center max-w-sm shadow-2xl"
        >
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-bold mb-1">{feature}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mb-4">{description}</p>
          )}
          <Button onClick={() => navigate("/upgrade")} size="sm" className="gap-2">
            <Crown className="h-3.5 w-3.5" />
            Unlock with Pro
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

interface ProBannerProps {
  feature?: string;
}

export function ProBanner({ feature }: ProBannerProps) {
  const [, navigate] = useLocation();
  const isPaywalled = useIsPaywalled();

  if (!isPaywalled) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl px-4 py-3 flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3">
        <Crown className="h-4 w-4 text-primary shrink-0" />
        <p className="text-sm">
          <span className="font-semibold text-foreground">
            {feature ? `${feature} is a Pro feature.` : "Upgrade to Pro"}
          </span>{" "}
          <span className="text-muted-foreground">Your 5-day trial has ended.</span>
        </p>
      </div>
      <Button
        onClick={() => navigate("/upgrade")}
        size="sm"
        variant="default"
        className="shrink-0 text-xs h-8"
      >
        Upgrade
      </Button>
    </motion.div>
  );
}
