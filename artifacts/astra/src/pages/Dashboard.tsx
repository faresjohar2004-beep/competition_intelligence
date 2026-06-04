import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useGetMe, useGetFutureSelf, useGetTodayActions, useGetCurrentChapter, useGetUserStats } from "@workspace/api-client-react";
import { useAlignment, useMissions } from "@/hooks/useMissions";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Zap, ChevronRight, Target, Trophy, Flame, Shield, Skull, ArrowRight } from "lucide-react";

const SCORE_COLORS = [
  { from: 0, to: 40, color: "text-red-400", glow: "shadow-red-500/30", ring: "from-red-500 to-red-600" },
  { from: 40, to: 65, color: "text-amber-400", glow: "shadow-amber-500/30", ring: "from-amber-500 to-orange-500" },
  { from: 65, to: 80, color: "text-blue-400", glow: "shadow-blue-500/30", ring: "from-blue-500 to-cyan-500" },
  { from: 80, to: 101, color: "text-emerald-400", glow: "shadow-emerald-500/30", ring: "from-emerald-500 to-teal-500" },
];

function getScoreColor(score: number) {
  return SCORE_COLORS.find((c) => score >= c.from && score < c.to) ?? SCORE_COLORS[SCORE_COLORS.length - 1];
}

function AlignmentOrb({ score }: { score: number }) {
  const c = getScoreColor(score);
  const circumference = 2 * Math.PI * 72;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center relative">
      <svg className="w-52 h-52 -rotate-90" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="72" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/5" />
        <circle
          cx="80" cy="80" r="72"
          fill="none"
          stroke="url(#alignGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`transition-all duration-1000 drop-shadow-[0_0_12px_rgba(124,58,237,0.6)]`}
        />
        <defs>
          <linearGradient id="alignGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-black text-white leading-none">{score}%</span>
        <span className="text-xs font-bold text-primary/80 uppercase tracking-widest mt-1">Aligned</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: user } = useGetMe();
  const { data: stats } = useGetUserStats();
  const { data: futureSelves } = useGetFutureSelf();
  const { data: todayActions } = useGetTodayActions();
  const { data: currentChapter } = useGetCurrentChapter();
  const { data: alignment, isLoading: alignLoading } = useAlignment();
  const { data: missions } = useMissions();

  const currentSelf = futureSelves?.find((f) => f.timeframe === "current");
  const alignScore = alignment?.alignmentScore ?? 0;
  const topAction = alignment?.topAction ?? "Log your first action of the day";

  const firstName = user?.name?.split(" ")[0] ?? "Explorer";

  const completedMissions = missions
    ? [missions.criticalCompleted, missions.secondary1Completed, missions.secondary2Completed, missions.secondary3Completed, missions.courageCompleted].filter(Boolean).length
    : 0;

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-muted-foreground text-sm uppercase tracking-widest font-semibold mb-1">Welcome back</p>
          <h1 className="text-4xl font-black text-white tracking-tight">{firstName}</h1>
        </motion.div>

        {/* SIGNATURE FEATURE — Alignment Score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-white/5 bg-gradient-to-br from-[#0f0f1a] via-[#0d1017] to-[#0a0c14] p-8 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(124,58,237,0.12),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(59,130,246,0.08),transparent_60%)]" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10">
            {/* Orb */}
            <div className="shrink-0">
              {alignLoading ? (
                <div className="w-52 h-52 rounded-full bg-white/5 animate-pulse" />
              ) : (
                <AlignmentOrb score={alignScore} />
              )}
            </div>

            {/* Right content */}
            <div className="flex-1 text-center lg:text-left">
              <p className="text-xs uppercase tracking-[0.3em] font-bold text-primary/70 mb-3">Future Alignment Score</p>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-2 leading-tight">
                YOUR FUTURE IS CURRENTLY{" "}
                <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                  {alignScore}% ALIGNED.
                </span>
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                Every action you take today shifts this number. Your future self is watching.
              </p>

              {/* Top action */}
              <div className="inline-flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-5 py-3.5 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <div className="text-left">
                  <p className="text-xs font-bold text-primary/70 uppercase tracking-wider mb-0.5">Highest-Leverage Action Now</p>
                  <p className="text-sm font-semibold text-white capitalize">{topAction.replace(/_/g, " ")}</p>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-6 mt-6 justify-center lg:justify-start">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary fill-primary" />
                  <span className="text-sm font-bold text-white">{stats?.streakDays ?? 0}</span>
                  <span className="text-xs text-muted-foreground">day streak</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-bold text-white">{todayActions?.actions?.length ?? 0}</span>
                  <span className="text-xs text-muted-foreground">actions today</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold text-white">Ch. {currentChapter?.number ?? 1}</span>
                  <span className="text-xs text-muted-foreground">{currentChapter?.name ?? "Awakening"}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick cards row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Mission Control card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Link href="/missions" className="block h-full rounded-2xl border border-white/5 bg-card/80 p-5 hover:border-primary/30 hover:bg-primary/5 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-xl bg-primary/10 p-2">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <h3 className="font-bold text-white mb-1">Mission Control</h3>
              <p className="text-sm text-muted-foreground mb-3">Your AI-generated daily missions</p>
              {missions ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(completedMissions / 5) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-primary">{completedMissions}/5</span>
                </div>
              ) : (
                <p className="text-xs text-primary font-medium">Generate today's missions →</p>
              )}
            </Link>
          </motion.div>

          {/* Score breakdown card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Link href="/future-self" className="block h-full rounded-2xl border border-white/5 bg-card/80 p-5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-xl bg-blue-500/10 p-2">
                  <Zap className="w-5 h-5 text-blue-400" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-400 transition-colors" />
              </div>
              <h3 className="font-bold text-white mb-3">Life Scores</h3>
              <div className="space-y-2">
                {[
                  { label: "Health", score: currentSelf?.healthScore ?? 0, color: "bg-emerald-500" },
                  { label: "Wealth", score: currentSelf?.wealthScore ?? 0, color: "bg-amber-500" },
                  { label: "Discipline", score: currentSelf?.disciplineScore ?? 0, color: "bg-blue-500" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16">{s.label}</span>
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.score}%` }} />
                    </div>
                    <span className="text-xs font-bold text-white w-6 text-right">{s.score}</span>
                  </div>
                ))}
              </div>
            </Link>
          </motion.div>

          {/* Hall of Legends card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Link href="/missions" className="block h-full rounded-2xl border border-white/5 bg-card/80 p-5 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-xl bg-amber-500/10 p-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-400 transition-colors" />
              </div>
              <h3 className="font-bold text-white mb-1">Hall of Legends</h3>
              <p className="text-sm text-muted-foreground mb-3">Your earned milestones</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-amber-400">{alignment?.newMilestonesEarned?.length ?? 0}</span>
                <span className="text-xs text-muted-foreground">new milestones available</span>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Log Actions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Link href="/actions" className="block rounded-2xl border border-white/5 bg-card/80 p-5 hover:border-orange-500/30 transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <Flame className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-white">Log Today's Actions</h3>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-bold text-white">{todayActions?.actions?.length ?? 0}/9 types</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${todayActions?.completionPercentage ?? 0}%` }} />
              </div>
              <p className="text-xs text-orange-400 font-medium mt-3 group-hover:text-orange-300">
                {(todayActions?.completionPercentage ?? 0) >= 100 ? "All done today! 🔥" : "Add more actions →"}
              </p>
            </Link>
          </motion.div>

          {/* Hall of Regret teaser */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Link href="/missions" className="block rounded-2xl border border-white/5 bg-card/80 p-5 hover:border-red-500/20 transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <Skull className="w-5 h-5 text-red-400/60" />
                <h3 className="font-bold text-white">Hall of Regret</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Potential opportunities you've missed in the last 30 days. Face them.
              </p>
              <p className="text-xs text-red-400/70 font-medium group-hover:text-red-400">
                View missed potential →
              </p>
            </Link>
          </motion.div>
        </div>

      </div>
    </AppLayout>
  );
}
