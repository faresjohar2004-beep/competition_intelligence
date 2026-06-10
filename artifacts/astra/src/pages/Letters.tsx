import AppLayout from "@/components/layout/AppLayout";
import { useGetLetters, useGenerateLetter, getGetLettersQueryKey, getGetLatestLetterQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useLocation } from "wouter";
import { Sparkles, Mail, Clock, Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsPaywalled } from "@/hooks/useSubscription";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function Letters() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { data: letters = [], isLoading } = useGetLetters();
  const generateLetter = useGenerateLetter();
  const [selected, setSelected] = useState<any>(null);
  const isPaywalled = useIsPaywalled();

  const handleGenerate = () => {
    if (isPaywalled) {
      navigate("/upgrade");
      return;
    }
    generateLetter.mutate(undefined, {
      onSuccess: (letter: any) => {
        qc.invalidateQueries({ queryKey: getGetLettersQueryKey() });
        qc.invalidateQueries({ queryKey: getGetLatestLetterQueryKey() });
        setSelected(letter);
      },
    });
  };

  const displayLetter = selected ?? (letters as any[])[0];

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Letters from Future Self</h1>
            <p className="text-muted-foreground mt-1">Receive a message from the person you're becoming.</p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generateLetter.isPending}
            className="gap-2"
            variant={isPaywalled ? "outline" : "default"}
          >
            {isPaywalled ? (
              <><Crown className="h-4 w-4 text-primary" />Unlock Letters</>
            ) : (
              <><Sparkles className="h-4 w-4" />{generateLetter.isPending ? "Writing..." : "Generate Letter"}</>
            )}
          </Button>
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
                <span className="font-semibold">Letters from Future Self is a Pro feature.</span>{" "}
                <span className="text-muted-foreground">Your 5-day trial has ended. Upgrade to generate new letters.</span>
              </p>
            </div>
            <Button onClick={() => navigate("/upgrade")} size="sm" className="shrink-0 text-xs h-8 gap-1.5">
              <Crown className="h-3 w-3" />Upgrade
            </Button>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Letter list */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">All Letters</h2>
            {isLoading && (
              <div className="space-y-3">
                {[0,1,2].map(i => <div key={i} className="h-16 rounded-xl bg-card animate-pulse" />)}
              </div>
            )}
            {(letters as any[]).length === 0 && !isLoading && (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">No letters yet.</p>
                {isPaywalled ? (
                  <Button size="sm" onClick={() => navigate("/upgrade")} className="gap-1.5 text-xs">
                    <Crown className="h-3 w-3" />Upgrade to generate
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground/60">Generate your first one above.</p>
                )}
              </div>
            )}
            {(letters as any[]).map((letter: any) => (
              <motion.button
                key={letter.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelected(letter)}
                className={`w-full text-left rounded-xl border p-4 transition-all ${
                  (selected ?? (letters as any[])[0])?.id === letter.id
                    ? "border-primary/50 bg-primary/5"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium capitalize text-primary">{letter.emotionalTone}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{letter.content?.slice(0, 80)}...</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground/60">
                  <Clock className="h-3 w-3" />
                  {formatDate(letter.createdAt)}
                </div>
              </motion.button>
            ))}

            {/* Locked preview cards for paywalled users with no letters */}
            {isPaywalled && (letters as any[]).length === 0 && (
              <div className="space-y-2 mt-2">
                {[0,1].map(i => (
                  <div key={i} className="rounded-xl border border-dashed border-border/50 p-4 opacity-40">
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Locked</span>
                    </div>
                    <div className="h-2 bg-border rounded w-3/4 mb-1" />
                    <div className="h-2 bg-border rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Letter display */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {displayLetter ? (
                <motion.div
                  key={displayLetter.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border border-primary/20 bg-card relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
                  <div className="p-8 relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider">Letter from Your Future Self</span>
                      <span className="ml-auto text-xs text-muted-foreground">{formatDate(displayLetter.createdAt)}</span>
                    </div>
                    <div className="font-serif text-base leading-loose text-foreground/90 whitespace-pre-wrap">
                      {displayLetter.content}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-2xl border border-dashed border-border bg-card p-12 flex flex-col items-center justify-center text-center min-h-[400px]"
                >
                  {isPaywalled ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                        <Crown className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Your future self has things to say</h3>
                      <p className="text-muted-foreground text-sm mb-6 max-w-xs">Upgrade to Pro to receive deeply personal AI-written letters from the person you're becoming.</p>
                      <Button onClick={() => navigate("/upgrade")} className="gap-2">
                        <Crown className="h-4 w-4" />Unlock Letters from Future Self
                      </Button>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Your future self is waiting</h3>
                      <p className="text-muted-foreground text-sm mb-6 max-w-xs">Generate a letter to receive a powerful message from the person you're becoming.</p>
                      <Button onClick={handleGenerate} disabled={generateLetter.isPending}>
                        {generateLetter.isPending ? "Writing your letter..." : "Generate First Letter"}
                      </Button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
