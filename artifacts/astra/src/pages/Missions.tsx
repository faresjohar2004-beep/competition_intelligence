import AppLayout from "@/components/layout/AppLayout";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useMissions, useCompleteMission, useMilestones, useRegret, useAlignment } from "@/hooks/useMissions";
import { Zap, Target, Shield, Flame, Trophy, AlertTriangle, CheckCircle2, Circle, ChevronRight, Skull } from "lucide-react";

export default function Missions() {
  const { data: missions, isLoading: missionsLoading } = useMissions();
  const { data: alignment } = useAlignment();
  const { data: milestones = [] } = useMilestones();
  const { data: regrets = [] } = useRegret();
  const completeMission = useCompleteMission();
  const [tab, setTab] = useState<"missions" | "legends" | "regret">("missions");

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
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "missions" && (
            <motion.div key="missions" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
              {missionsLoading ? (
                <div className="space-y-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-24 rounded-2xl bg-card animate-pulse border border-border" />
                  ))}
                </div>
              ) : missions ? (
                <>
                  {/* Critical Mission */}
                  <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-500/5 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/10 rounded-full blur-[60px]" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <Flame className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Critical Mission</span>
                      </div>
                      <p className="text-lg font-semibold text-white mb-4">{missions.criticalMission}</p>
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
                  <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-[60px]" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Courage Challenge</span>
                      </div>
                      <p className="text-lg font-semibold text-white mb-4">{missions.courageChallenge}</p>
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
