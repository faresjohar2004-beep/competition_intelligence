import AppLayout from "@/components/layout/AppLayout";
import { useGetBiography, useGenerateBiographyEntry, getGetBiographyQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { BookOpen, Sparkles, Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsPaywalled } from "@/hooks/useSubscription";

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

const CHAPTER_COLORS: Record<number, string> = {
  1: "bg-violet-500 shadow-violet-500/40",
  2: "bg-blue-500 shadow-blue-500/40",
  3: "bg-indigo-500 shadow-indigo-500/40",
  4: "bg-emerald-500 shadow-emerald-500/40",
  5: "bg-amber-500 shadow-amber-500/40",
  6: "bg-rose-500 shadow-rose-500/40",
};

export default function Biography() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { data: entries = [], isLoading } = useGetBiography();
  const generateToday = useGenerateBiographyEntry();
  const isPaywalled = useIsPaywalled();

  const handleGenerate = () => {
    if (isPaywalled) {
      navigate("/upgrade");
      return;
    }
    generateToday.mutate(undefined, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetBiographyQueryKey() });
      },
    });
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const hasTodayEntry = (entries as any[]).some((e: any) => e.date === todayStr);

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Your Biography</h1>
            <p className="text-muted-foreground mt-1">The story of who you're becoming — written one day at a time.</p>
          </div>
          {(!hasTodayEntry || isPaywalled) && (
            <Button
              onClick={handleGenerate}
              disabled={generateToday.isPending}
              className="gap-2"
              variant={isPaywalled ? "outline" : "default"}
            >
              {isPaywalled ? (
                <><Crown className="h-4 w-4 text-primary" />Unlock Biography AI</>
              ) : (
                <><Sparkles className="h-4 w-4" />{generateToday.isPending ? "Writing..." : "Write Today's Chapter"}</>
              )}
            </Button>
          )}
        </div>

        {/* Pro banner */}
        {isPaywalled && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl px-4 py-3 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <Crown className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm">
                <span className="font-semibold">Biography AI is a Pro feature.</span>{" "}
                <span className="text-muted-foreground">Upgrade to auto-generate your story from daily actions.</span>
              </p>
            </div>
            <Button onClick={() => navigate("/upgrade")} size="sm" className="shrink-0 text-xs h-8 gap-1.5">
              <Crown className="h-3 w-3" />Upgrade
            </Button>
          </motion.div>
        )}

        {isLoading && (
          <div className="space-y-8">
            {[0,1,2].map(i => <div key={i} className="h-28 rounded-2xl bg-card animate-pulse" />)}
          </div>
        )}

        {!isLoading && (entries as any[]).length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-16 text-center">
            {isPaywalled ? (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  <Crown className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Your story is waiting to be written</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-xs">
                  Upgrade to Pro to unlock AI-generated biography entries that capture your growth story from your daily actions.
                </p>
                <Button onClick={() => navigate("/upgrade")} className="gap-2">
                  <Crown className="h-4 w-4" />Unlock Biography AI
                </Button>
              </>
            ) : (
              <>
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Your story starts today</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-xs">Log some actions, then generate your first biography entry to see your story unfold.</p>
                <Button onClick={handleGenerate} disabled={generateToday.isPending}>
                  {generateToday.isPending ? "Writing..." : "Write First Entry"}
                </Button>
              </>
            )}
          </div>
        )}

        {(entries as any[]).length > 0 && (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-border to-transparent" />
            <div className="space-y-8">
              {(entries as any[]).map((entry: any, i: number) => {
                const dotColor = CHAPTER_COLORS[entry.chapterNumber] ?? "bg-primary shadow-primary/40";
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="relative pl-12"
                  >
                    <div className={`absolute left-[11px] top-2 w-3 h-3 rounded-full shadow-lg ${dotColor}`} />
                    <div className="rounded-2xl border border-border bg-card p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary" />
                          <span className="text-xs font-semibold text-primary">Chapter {entry.chapterNumber}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(entry.date)}</span>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground/90 font-medium">{entry.content}</p>
                    </div>
                  </motion.div>
                );
              })}

              {/* Locked future entries teaser */}
              {isPaywalled && (
                <div className="relative pl-12 opacity-40">
                  <div className="absolute left-[11px] top-2 w-3 h-3 rounded-full bg-border" />
                  <div className="rounded-2xl border border-dashed border-border bg-card/50 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Next chapter locked</span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2.5 bg-border rounded w-full" />
                      <div className="h-2.5 bg-border rounded w-4/5" />
                      <div className="h-2.5 bg-border rounded w-3/5" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
