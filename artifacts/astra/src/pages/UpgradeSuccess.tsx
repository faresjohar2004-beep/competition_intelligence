import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Crown, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function UpgradeSuccess() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  useEffect(() => {
    qc.invalidateQueries({ queryKey: ["stripe", "subscription"] });
  }, [qc]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-20 h-20 bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <Crown className="h-10 w-10 text-primary" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Welcome to Pro</span>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-3">You're now ASTRA Pro.</h1>
          <p className="text-muted-foreground mb-8">
            Every feature is unlocked. Your future self is waiting. Let's get back to building.
          </p>
          <Button onClick={() => navigate("/dashboard")} className="gap-2">
            Continue building <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
