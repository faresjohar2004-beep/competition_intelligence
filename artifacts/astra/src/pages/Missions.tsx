import AppLayout from "@/components/layout/AppLayout";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useMissions, useCompleteMission, useMilestones, useRegret, useAlignment } from "@/hooks/useMissions";
import { useGetUserStats, useGetMe } from "@workspace/api-client-react";
import { Link } from "wouter";
import {
  Zap, Target, Shield, Flame, Trophy, AlertTriangle, CheckCircle2, Circle,
  Skull, Star, ArrowRight, ChevronDown, ChevronUp,
} from "lucide-react";

// ─── Mission Complete Overlay ─────────────────────────────────────────────────
function MissionCompleteCard({
  firstName,
  streakDays,
  alignScore,
}: {
  firstName: string;
  streakDays: number;
  alignScore: number;
}) {
  const [showList, setShowList] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-2xl border border-amber-400/30 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(168,85,247,0.08) 100%)" }}
    >
      {/* Ambient glows */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/6 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 p-6 sm:p-8">
        {/* Header chip */}
        <div className="flex items-center gap-2 mb-5">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center"
          >
            <Star className="w-4 h-4 text-amber-400 fill-amber-400/60" />
          </motion.div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
            Perfect Mission Day — 5/5
          </p>
        </div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-2xl sm:text-3xl font-black text-white mb-2 leading-tight"
        >
          You went 5 for 5, {firstName}.
        </motion.h2>

        {/* Identity line */}
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="text-sm text-amber-200/70 font-medium italic mb-6 leading-relaxed"
        >
          "Most people finish 0. Some finish 1. You finished all of them.
          That gap — between intention and execution — is who you actually are."
        </motion.p>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="flex gap-3 mb-7"
        >
          <div className="flex-1 rounded-xl border border-amber-400/15 bg-amber-500/8 px-4 py-3 text-center">
            <p className="text-2xl font-black text-amber-400">{streakDays}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Day Streak</p>
          </div>
          <div className="flex-1 rounded-xl border border-violet-500/15 bg-violet-500/8 px-4 py-3 text-center">
            <p className="text-2xl font-black text-violet-400">{alignScore}%</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Alignment</p>
          </div>
          <div className="flex-1 rounded-xl border border-emerald-500/15 bg-emerald-500/8 px-4 py-3 text-center">
            <p className="text-2xl font-black text-emerald-400">5</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Missions Done</p>
          </div>
        </motion.div>

        {/* Checkmark row — visual proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex gap-2 mb-7"
        >
          {["Critical", "Mission 2", "Mission 3", "Mission 4", "Courage"].map((label, i) => (
            <motion.div
              key={label}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.38 + i * 0.07, type: "spring", stiffness: 400 }}
              className="flex-1 flex flex-col items-center gap-1.5"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              </div>
              <p className="text-[8px] text-muted-foreground/40 text-center hidden sm:block leading-tight">{label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <Link
            href="/evidence"
            className="flex-1 h-11 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-300 font-bold text-sm hover:bg-amber-400/25 transition-all flex items-center justify-center gap-2"
          >
            See Your Evidence <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 h-11 rounded-xl border border-white/8 bg-white/4 text-white/60 font-medium text-sm hover:bg-white/8 transition-all flex items-center justify-center gap-2"
          >
            Back to Dashboard
          </Link>
        </motion.div>

        {/* Toggle missions list */}
        <button
          onClick={() => setShowList(v => !v)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors mt-4 mx-auto"
        >
          {showList ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {showList ? "Hide completed missions" : "Review completed missions"}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Loading State — shown when missions are being generated (first load of day) ─
function MissionsLoadingState() {
  const steps = [
    "Analysing your recent activity...",
    "Calibrating challenge level...",
    "Generating your critical mission...",
    "Building your courage challenge...",
  ];
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, steps.length - 1));
    }, 900);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 to-transparent p-8 text-center"
    >
      {/* Pulsing icon */}
      <div className="flex justify-center mb-5">
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center"
        >
          <Zap className="w-6 h-6 text-primary" />
        </motion.div>
      </div>

      <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary/60 mb-2">Mission Control</p>
      <h3 className="text-lg font-bold text-white mb-1">Generating your daily briefing</h3>
      <p className="text-sm text-muted-foreground mb-6">
        ASTRA is crafting personalised missions based on your history and streak.
      </p>

      {/* Step indicators */}
      <div className="space-y-2 max-w-xs mx-auto text-left">
        {steps.map((step, i) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: i <= stepIdx ? 1 : 0.25, x: 0 }}
            transition={{ delay: i * 0.2 }}
            className="flex items-center gap-2.5"
          >
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-500 ${
              i < stepIdx ? "bg-emerald-400" : i === stepIdx ? "bg-primary animate-pulse" : "bg-white/15"
            }`} />
            <span className={`text-xs transition-colors duration-500 ${
              i < stepIdx ? "text-emerald-400/70 line-through" : i === stepIdx ? "text-foreground/80" : "text-muted-foreground/30"
            }`}>
              {step}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Ghost skeleton below for layout continuity */}
      <div className="mt-8 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-white/3 animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Missions() {
  const { data: missions, isLoading: missionsLoading } = useMissions();
  const { data: alignment } = useAlignment();
  const { data: milestones = [] } = useMilestones();
  const { data: regrets = [] } = useRegret();
  const { data: stats } = useGetUserStats();
  const { data: user } = useGetMe();
  const completeMission = useCompleteMission();
  const [tab, setTab] = useState<"missions" | "legends" | "regret">("missions");
  const [showCelebration, setShowCelebration] = useState(false);
  const [showMissionList, setShowMissionList] = useState(false);
  const prevComplete = useRef(false);

  const firstName = (user as any)?.name?.split(" ")[0] ?? "Explorer";
  const streakDays = stats?.streakDays ?? 0;
  const alignScore = alignment?.alignmentScore ?? 0;

  const allComplete = !!(
    missions &&
    missions.criticalCompleted &&
    missions.secondary1Completed &&
    missions.secondary2Completed &&
    missions.secondary3Completed &&
    missions.courageCompleted
  );

  // Fire celebration the first time all missions become complete this session
  useEffect(() => {
    if (allComplete && !prevComplete.current) {
      setShowCelebration(true);
      setShowMissionList(false);
    }
    prevComplete.current = allComplete;
  }, [allComplete]);

  // If page is opened when already complete, show celebration immediately (no animation delay)
  useEffect(() => {
    if (allComplete && !showCelebration) {
      setShowCelebration(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missions]);

  const handleComplete = (slot: string) => {
    completeMission.mutate(slot as any);
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Mission Control</h1>
          <p className="text-muted-foreground">Your AI-generated daily missions. Complete them to raise your alignment.</p>
        </motion.div>

        {/* Tab bar */}
        <div className="flex gap-2 mb-8 border-b border-border">
          {[
            { id: "missions", label: "Today's Missions", icon: Target },
            { id: "legends", label: "Hall of Legends", icon: Trophy },
            { id: "regret", label: "Hall of Regret", icon: Skull },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {/* Badge for complete state */}
              {t.id === "missions" && allComplete && (
                <span className="ml-1 w-4 h-4 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center">
                  <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400/80" />
                </span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "missions" && (
            <motion.div key="missions" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
              {missionsLoading ? (
                <MissionsLoadingState />
              ) : missions ? (
                <>
                  {/* ── Mission Complete Celebration ── */}
                  <AnimatePresence>
                    {showCelebration && allComplete && (
                      <MissionCompleteCard
                        firstName={firstName}
                        streakDays={streakDays}
                        alignScore={alignScore}
                      />
                    )}
                  </AnimatePresence>

                  {/* Toggle to show missions below celebration */}
                  {allComplete && showCelebration && (
                    <button
                      onClick={() => setShowMissionList(v => !v)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
                    >
                      {showMissionList ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {showMissionList ? "Hide completed missions" : "Review completed missions"}
                    </button>
                  )}

                  {/* Mission list — always shown if not complete; toggleable if complete */}
                  <AnimatePresence>
                    {(!allComplete || showMissionList) && (
                      <motion.div
                        initial={allComplete ? { opacity: 0, height: 0 } : false}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-6 overflow-hidden"
                      >
                        {/* Critical Mission */}
                        <div className={`rounded-2xl border p-6 relative overflow-hidden transition-all ${
                          missions.criticalCompleted
                            ? "border-emerald-500/20 bg-emerald-500/5"
                            : "border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-500/5"
                        }`}>
                          <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/10 rounded-full blur-[60px]" />
                          <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                              <Flame className={`w-4 h-4 ${missions.criticalCompleted ? "text-emerald-400" : "text-red-400"}`} />
                              <span className={`text-xs font-bold uppercase tracking-widest ${missions.criticalCompleted ? "text-emerald-400" : "text-red-400"}`}>
                                Critical Mission {missions.criticalCompleted ? "✓" : ""}
                              </span>
                            </div>
                            <p className={`text-lg font-semibold mb-4 ${missions.criticalCompleted ? "line-through text-muted-foreground" : "text-white"}`}>
                              {missions.criticalMission}
                            </p>
                            <button
                              onClick={() => handleComplete("critical")}
                              disabled={missions.criticalCompleted || completeMission.isPending}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                missions.criticalCompleted
                                  ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                                  : "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
                              }`}
                            >
                              {missions.criticalCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                              {missions.criticalCompleted ? "Completed" : "Mark Complete"}
                            </button>
                          </div>
                        </div>

                        {/* Secondary Missions */}
                        <div className="space-y-3">
                          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <Target className="w-4 h-4" /> Secondary Missions
                          </h3>
                          {[
                            { text: missions.secondaryMission1, slot: "secondary1", done: missions.secondary1Completed },
                            { text: missions.secondaryMission2, slot: "secondary2", done: missions.secondary2Completed },
                            { text: missions.secondaryMission3, slot: "secondary3", done: missions.secondary3Completed },
                          ].map((m, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.08 }}
                              className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
                                m.done ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-card"
                              }`}
                            >
                              <button
                                onClick={() => handleComplete(m.slot)}
                                disabled={m.done || completeMission.isPending}
                                className="shrink-0"
                              >
                                {m.done ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                ) : (
                                  <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                                )}
                              </button>
                              <span className={`text-sm font-medium ${m.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                {m.text}
                              </span>
                            </motion.div>
                          ))}
                        </div>

                        {/* Courage Challenge */}
                        <div className={`rounded-2xl border p-6 relative overflow-hidden transition-all ${
                          missions.courageCompleted
                            ? "border-emerald-500/20 bg-emerald-500/5"
                            : "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-500/5"
                        }`}>
                          <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-[60px]" />
                          <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                              <Shield className={`w-4 h-4 ${missions.courageCompleted ? "text-emerald-400" : "text-amber-400"}`} />
                              <span className={`text-xs font-bold uppercase tracking-widest ${missions.courageCompleted ? "text-emerald-400" : "text-amber-400"}`}>
                                Courage Challenge {missions.courageCompleted ? "✓" : ""}
                              </span>
                            </div>
                            <p className={`text-lg font-semibold mb-4 ${missions.courageCompleted ? "line-through text-muted-foreground" : "text-white"}`}>
                              {missions.courageChallenge}
                            </p>
                            <button
                              onClick={() => handleComplete("courage")}
                              disabled={missions.courageCompleted || completeMission.isPending}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                missions.courageCompleted
                                  ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                                  : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30"
                              }`}
                            >
                              {missions.courageCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                              {missions.courageCompleted ? "Courage Demonstrated" : "I Accept This Challenge"}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Your missions are being generated...</p>
                </div>
              )}
            </motion.div>
          )}

          {tab === "legends" && (
            <motion.div key="legends" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
              {(milestones as any[]).length === 0 ? (
                <div className="text-center py-16">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-amber-500/30" />
                  <h3 className="text-xl font-semibold mb-2 text-white">Your legend begins now</h3>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">Log actions, maintain streaks, and complete missions to earn legendary milestones here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(milestones as any[]).map((m: any, i: number) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-center gap-4 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-card p-5"
                    >
                      <div className="text-4xl">{m.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white">{m.title}</p>
                        <p className="text-sm text-muted-foreground">{m.description}</p>
                        <p className="text-xs text-amber-500/70 mt-1">{new Date(m.earnedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === "regret" && (
            <motion.div key="regret" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
              <div className="rounded-2xl border border-white/5 bg-card/50 p-4 mb-6">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  The Hall of Regret shows what you <em>could have</em> achieved in the last 30 days. Use it as fuel — not guilt.
                </p>
              </div>

              {(regrets as any[]).length === 0 ? (
                <div className="text-center py-16">
                  <Skull className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
                  <h3 className="text-xl font-semibold mb-2 text-white">No regrets yet</h3>
                  <p className="text-muted-foreground text-sm">Keep building consistent habits to stay ahead of your potential.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(regrets as any[]).map((r: any, i: number) => (
                    <motion.div
                      key={r.type}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="rounded-2xl border border-border bg-card p-5"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-white">{r.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{r.doneCount}/30 completed this month</p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black text-red-400">-{r.potentialScoreGain}%</span>
                          <p className="text-xs text-muted-foreground">{r.impact} potential</p>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-3">
                        <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${(r.doneCount / 30) * 100}%` }} />
                      </div>
                      <p className="text-sm text-muted-foreground italic">"{r.message}"</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
