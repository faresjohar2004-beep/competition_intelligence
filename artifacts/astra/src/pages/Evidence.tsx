import AppLayout from "@/components/layout/AppLayout";
import { useGetActions, useGetUserStats, useGetTodayActions, useGetMe } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import React, { useMemo } from "react";
import {
  Shield, Flame, CheckCircle2, Dumbbell, BookOpen, Brain, Video,
  Leaf, DollarSign, Laptop, Moon, Droplets, Zap, TrendingUp, Calendar, Clock, Star, ArrowRight,
} from "lucide-react";
import { Link } from "wouter";

// ─── Action display config ───────────────────────────────────────────────────
const ACTION_DISPLAY: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  identity: string;
  verb: string;
  hours: number;
}> = {
  workout:          { label: "Workout",          icon: Dumbbell,   color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", identity: "You are someone who refuses to let their body fail them.",          verb: "physically unbreakable", hours: 1 },
  reading:          { label: "Reading",          icon: BookOpen,   color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/20",  identity: "You are someone who never stops growing.",                         verb: "intellectually alive",    hours: 0.5 },
  learning:         { label: "Learning",         icon: Brain,      color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20",    identity: "You are someone who invests in their future every single day.",    verb: "always learning",         hours: 0.75 },
  content_creation: { label: "Content Creation", icon: Video,      color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/20",  identity: "You are someone who creates value in the world.",                 verb: "a creator",               hours: 1.5 },
  meditation:       { label: "Meditation",       icon: Leaf,       color: "text-teal-400",    bg: "bg-teal-500/10",    border: "border-teal-500/20",    identity: "You are someone who masters their own mind.",                     verb: "mentally sovereign",      hours: 0.33 },
  saving:           { label: "Saving Money",     icon: DollarSign, color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   identity: "You are someone who builds wealth with intention.",               verb: "financially intentional", hours: 0.25 },
  deep_work:        { label: "Deep Work",        icon: Laptop,     color: "text-indigo-400",  bg: "bg-indigo-500/10",  border: "border-indigo-500/20",  identity: "You are someone who does the real work.",                        verb: "ruthlessly focused",      hours: 2 },
  sleep:            { label: "Quality Sleep",    icon: Moon,       color: "text-sky-400",     bg: "bg-sky-500/10",     border: "border-sky-500/20",     identity: "You are someone who plays the long game.",                       verb: "playing the long game",   hours: 0 },
  water:            { label: "Water Intake",     icon: Droplets,   color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20",    identity: "You are someone who takes care of their body.",                  verb: "physically disciplined",  hours: 0 },
  reflection:       { label: "Reflection",       icon: BookOpen,   color: "text-primary/80",  bg: "bg-primary/10",     border: "border-primary/20",    identity: "You are someone who knows themselves deeply enough to grow.",     verb: "deeply self-aware",       hours: 0.33 },
  promise:          { label: "Promise Kept",     icon: Star,       color: "text-violet-400",  bg: "bg-violet-500/10", border: "border-violet-500/20", identity: "You are someone who keeps their word to themselves.",             verb: "someone who keeps their word", hours: 0.25 },
};
const FALLBACK = ACTION_DISPLAY["deep_work"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const todayStr = now.toDateString();
  const yest = new Date(now); yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === todayStr) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

// ─── Evidence Card ────────────────────────────────────────────────────────────
function EvidenceCard({ action, index }: { action: any; index: number }) {
  if (action.type === "streak_freeze") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.04, 0.4) }}
        className="flex items-center gap-4 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/6"
      >
        <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-base">
          🧊
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold uppercase tracking-wide text-amber-400">Streak Protected</span>
            <span className="text-xs text-muted-foreground/50 ml-auto">{formatTime(action.completedAt)}</span>
          </div>
          <p className="text-sm font-bold text-white">Streak Freeze Applied</p>
          <p className="text-xs text-muted-foreground/60 italic mt-0.5">"Even on hard days, I protect what I've built."</p>
        </div>
      </motion.div>
    );
  }

  const display = ACTION_DISPLAY[action.type] ?? FALLBACK;
  const Icon = display.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      className={`flex items-start gap-4 p-4 rounded-2xl border ${display.border} ${display.bg}`}
    >
      <div className={`shrink-0 w-10 h-10 rounded-xl ${display.bg} border ${display.border} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${display.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className={`w-3.5 h-3.5 ${display.color} shrink-0`} />
          <span className={`text-xs font-bold uppercase tracking-wide ${display.color}`}>Promise Kept</span>
          <span className="text-xs text-muted-foreground/50 ml-auto">{formatTime(action.completedAt)}</span>
        </div>
        <p className="font-bold text-white text-sm">{display.label} Completed</p>
        <p className="text-xs text-muted-foreground/70 italic mt-1">"{display.identity}"</p>
      </div>
    </motion.div>
  );
}

// ─── 90-Day Activity Heatmap ──────────────────────────────────────────────────
function ActivityHeatmap({ actionsByDay }: { actionsByDay: Record<string, number> }) {
  const cells = useMemo(() => {
    const result: { date: string; count: number; dayOfWeek: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = toDateStr(d);
      result.push({ date: ds, count: actionsByDay[ds] ?? 0, dayOfWeek: d.getDay() });
    }
    return result;
  }, [actionsByDay]);

  // Group into weeks (columns)
  const weeks: typeof cells[] = [];
  let currentWeek: typeof cells = [];
  cells.forEach((cell, i) => {
    currentWeek.push(cell);
    if (currentWeek.length === 7 || i === cells.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const getColor = (count: number) => {
    if (count === 0) return "bg-white/5";
    if (count === 1) return "bg-primary/25";
    if (count === 2) return "bg-primary/50";
    return "bg-primary/90";
  };

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div>
      <div className="flex items-start gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 mr-1">
          {dayLabels.map((d, i) => (
            <div key={i} className="w-3 h-3 flex items-center justify-center text-[8px] text-muted-foreground/30 font-medium">
              {i % 2 === 0 ? d : ""}
            </div>
          ))}
        </div>
        {/* Grid */}
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((cell, di) => (
                <div
                  key={di}
                  title={`${cell.date}: ${cell.count} action${cell.count !== 1 ? "s" : ""}`}
                  className={`w-3 h-3 rounded-[2px] ${getColor(cell.count)} transition-colors`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-[10px] text-muted-foreground/40">Less</span>
        {[0, 1, 2, 3].map(v => (
          <div key={v} className={`w-3 h-3 rounded-[2px] ${getColor(v)}`} />
        ))}
        <span className="text-[10px] text-muted-foreground/40">More</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Evidence() {
  const { data: allActionsRaw = [], isLoading } = useGetActions({ limit: 500 });
  const { data: todayActionsData } = useGetTodayActions();
  const { data: stats } = useGetUserStats();
  const { data: user } = useGetMe();

  const allActions = allActionsRaw as any[];
  const todayList = (todayActionsData?.actions ?? []) as any[];
  const firstName = (user as any)?.name?.split(" ")[0] ?? "Explorer";

  // ── Core stats ──────────────────────────────────────────────────────────────
  const realActions = useMemo(
    () => allActions.filter((a: any) => a.type !== "streak_freeze"),
    [allActions]
  );

  const actionsByDay = useMemo(() => {
    const map: Record<string, number> = {};
    realActions.forEach((a: any) => {
      const d = new Date(a.completedAt).toISOString().split("T")[0];
      map[d] = (map[d] ?? 0) + 1;
    });
    return map;
  }, [realActions]);

  const activeDays = Object.keys(actionsByDay).length;
  const totalActions = realActions.length;
  const streakDays = stats?.streakDays ?? 0;

  // ── Category breakdown ──────────────────────────────────────────────────────
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    realActions.forEach((a: any) => {
      counts[a.type] = (counts[a.type] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        type,
        count,
        pct: totalActions > 0 ? Math.round((count / totalActions) * 100) : 0,
        display: ACTION_DISPLAY[type] ?? FALLBACK,
      }));
  }, [realActions, totalActions]);

  const topCategory = categoryBreakdown[0];

  // ── Personal records ────────────────────────────────────────────────────────
  const { longestStreak, mostActiveDay, bestWeekCount, estHours } = useMemo(() => {
    if (realActions.length === 0) return { longestStreak: 0, mostActiveDay: 0, bestWeekCount: 0, estHours: 0 };

    // Longest streak from action history
    const sortedDays = Object.keys(actionsByDay).sort();
    let maxStreak = 1, cur = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i - 1]);
      const curr = new Date(sortedDays[i]);
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      if (diff === 1) { cur++; maxStreak = Math.max(maxStreak, cur); }
      else cur = 1;
    }

    // Most actions in a single day
    const mostActiveDay = Math.max(...Object.values(actionsByDay));

    // Best week (Sun-Sat buckets)
    const weekCounts: Record<string, number> = {};
    realActions.forEach((a: any) => {
      const d = new Date(a.completedAt);
      const dow = d.getDay();
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - dow);
      const ws = toDateStr(weekStart);
      weekCounts[ws] = (weekCounts[ws] ?? 0) + 1;
    });
    const bestWeekCount = Math.max(...Object.values(weekCounts), 0);

    // Estimated hours invested
    const estHours = realActions.reduce((sum: number, a: any) => {
      return sum + (ACTION_DISPLAY[a.type]?.hours ?? 0.5);
    }, 0);

    return { longestStreak: Math.max(maxStreak, streakDays), mostActiveDay, bestWeekCount, estHours };
  }, [realActions, actionsByDay, streakDays]);

  // ── Identity synthesis ──────────────────────────────────────────────────────
  const identityHeadline = useMemo(() => {
    if (totalActions === 0) return null;
    if (!topCategory) return null;
    const verb = topCategory.display.verb;
    if (categoryBreakdown.length >= 2 && categoryBreakdown[1].pct >= 20) {
      const verb2 = categoryBreakdown[1].display.verb;
      return `${firstName}, you are becoming ${verb} — and ${verb2}.`;
    }
    return `${firstName}, you are becoming ${verb}.`;
  }, [firstName, topCategory, categoryBreakdown, totalActions]);

  // ── Date grouping for timeline ──────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const pastActions = allActions.filter((a: any) => {
    return new Date(a.completedAt).toISOString().split("T")[0] !== today;
  });
  const grouped = pastActions.reduce((acc: Record<string, any[]>, a: any) => {
    const d = new Date(a.completedAt).toISOString().split("T")[0];
    if (!acc[d]) acc[d] = [];
    acc[d].push(a);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!isLoading && totalActions === 0) {
    return (
      <AppLayout>
        <div className="p-6 md:p-8 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">Evidence Vault</h1>
              <p className="text-muted-foreground text-sm">Every action becomes proof of who you are.</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-16 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Your vault is empty</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Log your first action on the dashboard to start building evidence that you are who you say you are.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">

        {/* ── Identity Mirror Header ─────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">Evidence Vault</h1>
              <p className="text-sm text-muted-foreground">This is permanent proof of who you are becoming.</p>
            </div>
          </div>

          {identityHeadline && (
            <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 to-primary/5 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/60 mb-2">Identity Analysis</p>
                <h2 className="text-xl sm:text-2xl font-black text-white leading-snug mb-2">
                  {identityHeadline}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {totalActions} actions logged across {activeDays} active day{activeDays !== 1 ? "s" : ""}.
                  {estHours > 0 && ` That's ~${Math.round(estHours)} hours invested in your future self.`}
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Personal Records ──────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 mb-3">Personal Records</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Best Streak",     value: `${longestStreak}d`,                    icon: Flame,       color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
              { label: "Most in One Day", value: mostActiveDay,                           icon: Zap,         color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
              { label: "Best Week",       value: bestWeekCount,                           icon: Calendar,    color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20"   },
              { label: "Hours Invested",  value: `~${Math.round(estHours)}h`,             icon: Clock,       color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
            ].map(({ label, value, icon: Icon, color, bg, border }) => (
              <div key={label} className={`rounded-2xl border ${border} ${bg} p-4 text-center`}>
                <Icon className={`w-4 h-4 ${color} mx-auto mb-2`} />
                <p className="text-2xl font-black text-white">{value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Identity Distribution ─────────────────────────────────────────── */}
        {categoryBreakdown.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 mb-3">What You're Building</p>
            <div className="rounded-2xl border border-border bg-card/50 p-5 space-y-4">
              {categoryBreakdown.slice(0, 6).map(({ type, count, pct, display }) => {
                const Icon = display.icon;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className={`shrink-0 w-8 h-8 rounded-lg ${display.bg} border ${display.border} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${display.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-sm font-semibold text-white">{display.label}</span>
                        <span className={`text-xs font-bold ${display.color}`}>{count} × · {pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                          className={`h-full rounded-full ${display.bg.replace("/10", "/60")}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {topCategory && (
                <p className="text-xs text-muted-foreground/50 italic pt-1 border-t border-border">
                  Your dominant identity: <span className="text-white/70 not-italic font-semibold">{topCategory.display.identity}</span>
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* ── 90-Day Heatmap ────────────────────────────────────────────────── */}
        {totalActions > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 mb-3">90-Day Activity</p>
            <div className="rounded-2xl border border-border bg-card/50 p-5">
              <ActivityHeatmap actionsByDay={actionsByDay} />
            </div>
          </motion.div>
        )}

        {/* ── Proof Timeline ────────────────────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 mb-3">Proof Timeline</p>

          {/* Today */}
          {todayList.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Today</h2>
                <span className="text-xs text-muted-foreground">{todayList.length} proof item{todayList.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="space-y-3">
                {todayList.map((action: any, i: number) => (
                  <EvidenceCard key={action.id ?? i} action={action} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Historical */}
          {isLoading && (
            <div className="space-y-3">
              {[0, 1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-card animate-pulse" />)}
            </div>
          )}
          {sortedDates.length > 0 && (
            <div className="space-y-8">
              {sortedDates.map((date, di) => (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                      {formatDate(new Date(date + "T12:00:00").toISOString())}
                    </h2>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {grouped[date].filter((a: any) => a.type !== "streak_freeze").length} action{grouped[date].filter((a: any) => a.type !== "streak_freeze").length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {grouped[date].map((action: any, i: number) => (
                      <EvidenceCard key={action.id ?? i} action={action} index={di * 4 + i} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Vault integrity footer ────────────────────────────────────────── */}
        {totalActions > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center"
          >
            <Star className="w-5 h-5 text-primary mx-auto mb-3 fill-primary/30" />
            <p className="text-sm font-bold text-white mb-1">{totalActions} promises kept. Every one is permanent.</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-6">
              This vault is your uneditable record. The person in here is who you actually are — not who you say you'll be.
            </p>
            {/* Loop close — keep building momentum */}
            <div className="flex flex-col sm:flex-row gap-2 max-w-xs mx-auto">
              <Link
                href="/actions"
                className="flex-1 h-10 rounded-xl bg-primary/15 border border-primary/25 text-primary font-bold text-sm hover:bg-primary/25 transition-all flex items-center justify-center gap-1.5"
              >
                Add to Your Vault <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/dashboard"
                className="flex-1 h-10 rounded-xl border border-white/8 bg-white/3 text-white/40 font-medium text-sm hover:bg-white/6 hover:text-white/60 transition-all flex items-center justify-center"
              >
                Dashboard
              </Link>
            </div>
          </motion.div>
        )}

      </div>
    </AppLayout>
  );
}
