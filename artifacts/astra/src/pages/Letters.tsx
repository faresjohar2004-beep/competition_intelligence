import AppLayout from "@/components/layout/AppLayout";
import { useGetLetters, useGenerateLetter, getGetLettersQueryKey, getGetLatestLetterQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useLocation } from "wouter";
import { Sparkles, Mail, Clock, Crown, Lock, Flame, BarChart2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsPaywalled } from "@/hooks/useSubscription";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

const SAMPLE_LETTER_LINES = [
  "I've been watching you.",
  "Every morning you chose discipline over comfort. Every promise you kept — even the quiet ones no one else saw — I felt that. That's what built me.",
  "You don't see the compound effect yet. The version of you reading this is still in the middle of it. But from where I stand, looking back at these exact days you're living now…",
  "What's coming will change how you see yourself. Not because something happened to you — but because of who you decided to become.",
];

const WRITING_FRAMES = [
  "Scanning your streak...",
  "Reading your life scores...",
  "Tracing your patterns...",
  "Your future self is writing...",
];

function FreeEmptyState({ onGenerate, isPending }: { onGenerate: () => void; isPending: boolean }) {
  const [frame, setFrame] = useState(0);

  const handleClick = () => {
    onGenerate();
    if (!isPending) {
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setFrame(i % WRITING_FRAMES.length);
        if (i >= WRITING_FRAMES.length * 3) clearInterval(interval);
      }, 800);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[420px] px-4">
      {/* Blurred sample letter preview */}
      <div className="relative w-full max-w-md mb-7 rounded-2xl border border-violet-500/20 bg-white/[0.02] overflow-hidden">
        <div
          className="p-6 select-none pointer-events-none font-serif text-sm leading-relaxed text-foreground/70 space-y-3"
          style={{ filter: "blur(3.5px)", WebkitFilter: "blur(3.5px)" }}
        >
          {SAMPLE_LETTER_LINES.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/30 to-card/95 flex flex-col items-center justify-end pb-5 gap-1.5">
          <div className="flex items-center gap-1.5">
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Lock className="w-3.5 h-3.5 text-violet-400/70" />
            </motion.div>
            <span className="text-xs font-bold text-violet-400/80 uppercase tracking-widest">Your letter is waiting</span>
          </div>
          <p className="text-[10px] text-muted-foreground/50">Written using your streak, scores &amp; identity</p>
        </div>
      </div>

      {/* Personalization chips */}
      <div className="flex items-center gap-2 mb-5 flex-wrap justify-center">
        {[
          { icon: <Flame className="w-3 h-3 text-orange-400" />, label: "Your streak" },
          { icon: <BarChart2 className="w-3 h-3 text-blue-400" />, label: "Life scores" },
          { icon: <Target className="w-3 h-3 text-emerald-400" />, label: "Your identity" },
        ].map(chip => (
          <span
            key={chip.label}
            className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-muted-foreground"
          >
            {chip.icon}{chip.label}
          </span>
        ))}
      </div>

      <h3 className="text-2xl font-bold text-white mb-2 leading-tight">
        Your future self has been watching.
      </h3>
      <p className="text-muted-foreground text-sm mb-7 max-w-xs leading-relaxed">
        Every promise you kept. Every early morning. Every time you showed up when you didn't want to — they noticed. Now they have something to tell you.
      </p>

      <motion.div
        animate={{
          boxShadow: isPending
            ? ["0 0 16px rgba(139,92,246,0.5)", "0 0 32px rgba(139,92,246,0.2)", "0 0 16px rgba(139,92,246,0.5)"]
            : ["0 0 0px rgba(139,92,246,0)", "0 0 20px rgba(139,92,246,0.45)", "0 0 0px rgba(139,92,246,0)"],
        }}
        transition={{ duration: isPending ? 1.2 : 2.8, repeat: Infinity, ease: "easeInOut" }}
        className="rounded-xl"
      >
        <Button
          onClick={handleClick}
          disabled={isPending}
          className="gap-2 px-7 h-11 text-sm font-semibold"
        >
          <Sparkles className="h-4 w-4" />
          {isPending ? WRITING_FRAMES[frame] : "Receive Your First Letter"}
        </Button>
      </motion.div>
    </div>
  );
}

function PaywalledEmptyState({ onUpgrade }: { onUpgrade: () => void }) {
  const TEASER_TONES = ["encouraging", "reflective", "urgent", "proud"];
  const TEASER_DATES = ["December 3, 2025", "November 18, 2025", "October 29, 2025"];

  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[420px] px-4">
      {/* Locked letters preview */}
      <div className="w-full max-w-md mb-7 space-y-2.5">
        {TEASER_DATES.map((date, i) => (
          <div
            key={date}
            className="rounded-xl border border-border/40 bg-white/[0.025] p-4 flex items-center gap-3 opacity-60"
            style={{ opacity: 0.7 - i * 0.18 }}
          >
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Lock className="w-3.5 h-3.5 text-violet-400/70" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-violet-400/80 capitalize">{TEASER_TONES[i]}</span>
                <span className="text-xs text-muted-foreground/50">{date}</span>
              </div>
              <div className="space-y-1">
                <div className="h-1.5 bg-border/50 rounded-full" style={{ width: `${75 - i * 12}%` }} />
                <div className="h-1.5 bg-border/30 rounded-full" style={{ width: `${55 - i * 10}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
        <Crown className="h-5 w-5 text-primary" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">Your future self has things to say.</h3>
      <p className="text-muted-foreground text-sm mb-7 max-w-xs leading-relaxed">
        Upgrade to Pro to unlock deeply personal letters written from the person you're becoming — using your actual streak, scores, and identity.
      </p>
      <Button onClick={onUpgrade} className="gap-2 px-7 h-11">
        <Crown className="h-4 w-4" />Unlock Letters from Future Self
      </Button>
    </div>
  );
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
          {(letters as any[]).length > 0 && (
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
          )}
        </div>

        {/* Pro banner */}
        {isPaywalled && (letters as any[]).length > 0 && (
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

        {/* Empty state — full-width when no letters */}
        {!isLoading && (letters as any[]).length === 0 && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/5 bg-card/60"
            >
              {isPaywalled ? (
                <PaywalledEmptyState onUpgrade={() => navigate("/upgrade")} />
              ) : (
                <FreeEmptyState onGenerate={handleGenerate} isPending={generateLetter.isPending} />
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Letter layout — only when letters exist */}
        {(isLoading || (letters as any[]).length > 0) && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Letter list */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">All Letters</h2>
              {isLoading && (
                <div className="space-y-3">
                  {[0, 1, 2].map(i => <div key={i} className="h-16 rounded-xl bg-card animate-pulse" />)}
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

              {/* Locked preview cards for paywalled users with existing letters */}
              {isPaywalled && (letters as any[]).length > 0 && (
                <div className="space-y-2 mt-2">
                  {[0, 1].map(i => (
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
                  !isPaywalled && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-2xl border border-dashed border-border bg-card p-12 flex items-center justify-center text-center min-h-[400px]"
                    >
                      <div className="text-muted-foreground text-sm">Select a letter to read it</div>
                    </motion.div>
                  )
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
