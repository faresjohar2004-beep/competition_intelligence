import AppLayout from "@/components/layout/AppLayout";
import { useGetShareCard } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Check, Flame, Trophy } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

export default function Share() {
  const { data: card, isLoading } = useGetShareCard();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`I'm on day ${card?.streakDays} of my journey on ASTRA — the AI Future Self Simulator. My overall score is ${card?.overallScore}%. Meet the person you're becoming → astra.app`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Share Progress</h1>
          <p className="text-muted-foreground mt-1">Show the world who you're becoming.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Card preview */}
          <div className="flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-[300px] h-[500px] rounded-3xl relative overflow-hidden border border-white/10 shadow-2xl"
              style={{ background: "linear-gradient(135deg, #0d0f1a 0%, #1a1033 50%, #0a0c14 100%)" }}
            >
              {/* Glow orbs */}
              <div className="absolute top-10 left-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
              <div className="absolute bottom-10 right-5 w-32 h-32 bg-blue-600/15 rounded-full blur-3xl" />

              <div className="relative z-10 h-full flex flex-col p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-auto">
                  <span className="text-xs font-black tracking-[0.3em] text-primary">ASTRA</span>
                  <span className="text-xs text-white/40">Future Self</span>
                </div>

                {/* Score */}
                <div className="text-center mb-6">
                  <div className="text-7xl font-black text-white leading-none">
                    {card?.overallScore ?? "—"}
                  </div>
                  <div className="text-sm text-white/50 mt-1">Overall Score</div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Flame className="h-3 w-3 text-orange-400" />
                      <span className="text-lg font-bold text-white">{card?.streakDays ?? 0}</span>
                    </div>
                    <span className="text-xs text-white/40">Day Streak</span>
                  </div>
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Trophy className="h-3 w-3 text-amber-400" />
                      <span className="text-lg font-bold text-white">{card?.currentChapterTitle?.split(" ")[0] ?? "—"}</span>
                    </div>
                    <span className="text-xs text-white/40">Chapter</span>
                  </div>
                </div>

                {/* Name */}
                <div className="border-t border-white/10 pt-4">
                  <div className="text-sm font-semibold text-white">{card?.userName ?? "—"}</div>
                  <div className="text-xs text-white/40">is becoming their future self</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-semibold mb-1">Share your journey</h2>
              <p className="text-sm text-muted-foreground mb-4">Inspire others by sharing your progress on ASTRA.</p>
              <div className="rounded-xl bg-secondary p-4 text-sm text-foreground/70 italic mb-4 leading-relaxed">
                "I'm on day {card?.streakDays ?? 0} of my journey on ASTRA — the AI Future Self Simulator. My overall score is {card?.overallScore ?? 0}%. Meet the person you're becoming."
              </div>
              <Button onClick={handleCopy} className="w-full gap-2" disabled={isLoading}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy Share Text"}
              </Button>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-semibold mb-3">Your Stats</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Overall Score</span>
                  <span className="font-bold text-primary">{card?.overallScore ?? 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Streak</span>
                  <span className="font-bold text-orange-400">{card?.streakDays ?? 0} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chapter</span>
                  <span className="font-bold">{card?.currentChapterTitle ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Top Area</span>
                  <span className="font-bold capitalize">{card?.topArea ?? "—"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
