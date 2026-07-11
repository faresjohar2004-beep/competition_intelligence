import AppLayout from "@/components/layout/AppLayout";
import { useGetTodayActions, useLogAction, useGetActionImpact, getGetTodayActionsQueryKey, getGetActionImpactQueryKey, getGetFutureSelfQueryKey, getGetUserStatsQueryKey, getGetActionsQueryKey } from "@workspace/api-client-react";
import { useMissions, useCompleteMission } from "@/hooks/useMissions";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Dumbbell, BookOpen, Brain, Video, Leaf, DollarSign, Laptop, Moon, Droplets, CheckCircle2, Zap, Flame, Sparkles, ArrowRight, CheckCircle } from "lucide-react";

const ACTION_CONFIG = [
  { type: "workout",          label: "Workout",          icon: Dumbbell,   color: "emerald", impact: "+2% Health, +1% Discipline",      identity: "You are someone who refuses to let their body fail them." },
  { type: "reading",          label: "Reading",          icon: BookOpen,   color: "violet",  impact: "+1.5% Knowledge",                  identity: "You are someone who never stops growing." },
  { type: "learning",         label: "Learning",         icon: Brain,      color: "blue",    impact: "+2% Knowledge, +1% Wealth",        identity: "You are someone who invests in their future every single day." },
  { type: "content_creation", label: "Content Creation", icon: Video,      color: "orange",  impact: "+2% Confidence, +1.5% Wealth",     identity: "You are someone who creates value in the world." },
  { type: "meditation",       label: "Meditation",       icon: Leaf,       color: "teal",    impact: "+1.5% Discipline",                 identity: "You are someone who masters their own mind." },
  { type: "saving",           label: "Saving Money",     icon: DollarSign, color: "amber",   impact: "+2% Wealth, +1% Discipline",       identity: "You are someone who builds wealth with intention." },
  { type: "deep_work",        label: "Deep Work",        icon: Laptop,     color: "indigo",  impact: "+2% Discipline, +1.5% Wealth",     identity: "You are someone who does the real work." },
  { type: "sleep",            label: "Sleep",            icon: Moon,       color: "sky",     impact: "+1.5% Health",                     identity: "You are someone who plays the long game." },
  { type: "water",            label: "Water Intake",     icon: Droplets,   color: "cyan",    impact: "+1% Health",                       identity: "You are someone who takes care of their body." },
];

const COLOR_MAP: Record<string, { text: string; bg: string; glow: string; ring: string; hover: string; border: string }> = {
  emerald: { text: "text-emerald-400", bg: "bg-emerald-500/10", glow: "shadow-emerald-500/40", ring: "from-emerald-500 to-teal-400",   hover: "hover:border-emerald-500/40 hover:bg-emerald-500/5", border: "border-emerald-500/30" },
  violet:  { text: "text-violet-400",  bg: "bg-violet-500/10",  glow: "shadow-violet-500/40",  ring: "from-violet-500 to-purple-400",  hover: "hover:border-violet-500/40 hover:bg-violet-500/5",  border: "border-violet-500/30" },
  blue:    { text: "text-blue-400",    bg: "bg-blue-500/10",    glow: "shadow-blue-500/40",    ring: "from-blue-500 to-cyan-400",      hover: "hover:border-blue-500/40 hover:bg-blue-500/5",      border: "border-blue-500/30" },
  orange:  { text: "text-orange-400",  bg: "bg-orange-500/10",  glow: "shadow-orange-500/40",  ring: "from-orange-500 to-amber-400",   hover: "hover:border-orange-500/40 hover:bg-orange-500/5",  border: "border-orange-500/30" },
  teal:    { text: "text-teal-400",    bg: "bg-teal-500/10",    glow: "shadow-teal-500/40",    ring: "from-teal-500 to-emerald-400",   hover: "hover:border-teal-500/40 hover:bg-teal-500/5",      border: "border-teal-500/30" },
  amber:   { text: "text-amber-400",   bg: "bg-amber-500/10",   glow: "shadow-amber-500/40",   ring: "from-amber-500 to-yellow-400",   hover: "hover:border-amber-500/40 hover:bg-amber-500/5",    border: "border-amber-500/30" },
  indigo:  { text: "text-indigo-400",  bg: "bg-indigo-500/10",  glow: "shadow-indigo-500/40",  ring: "from-indigo-500 to-violet-400",  hover: "hover:border-indigo-500/40 hover:bg-indigo-500/5",  border: "border-indigo-500/30" },
  sky:     { text: "text-sky-400",     bg: "bg-sky-500/10",     glow: "shadow-sky-500/40",     ring: "from-sky-500 to-blue-400",       hover: "hover:border-sky-500/40 hover:bg-sky-500/5",        border: "border-sky-500/30" },
  cyan:    { text: "text-cyan-400",    bg: "bg-cyan-500/10",    glow: "shadow-cyan-500/40",    ring: "from-cyan-500 to-sky-400",       hover: "hover:border-cyan-500/40 hover:bg-cyan-500/5",      border: "border-cyan-500/30" },
};

type CompletedAction = { label: string; impact: string; identity: string; color: string; Icon: React.ComponentType<{ className?: string }> };

function CompletionCelebration({ action, streak, completedCount, promiseJustKept, onDismiss }: {
  action: CompletedAction;
  streak: number;
  completedCount: number;
  promiseJustKept: boolean;
  onDismiss: () => void;
}) {
  const c = COLOR_MAP[action.color];
  const progress = Math.min((completedCount / 9) * 100, 100);

  useEffect(() => {
    const t = setTimeout(onDismiss, 2800);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: -10 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative mx-4 w-full max-w-sm rounded-3xl border border-white/10 bg-[#0d1017] p-8 text-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[80px] opacity-20 bg-gradient-to-br ${c.ring} pointer-events-none`} />

        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            animate={{ opacity: 0, scale: 0, x: (i % 2 === 0 ? 1 : -1) * (30 + i * 15), y: -60 - i * 12 }}
            transition={{ duration: 1.2, delay: i * 0.08, ease: "easeOut" }}
            className={`absolute top-16 left-1/2 w-2 h-2 rounded-full bg-gradient-to-br ${c.ring} pointer-events-none`}
          />
        ))}

        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
          className={`relative z-10 inline-flex items-center justify-center w-20 h-20 rounded-2xl ${c.bg} mb-5 shadow-2xl ${c.glow}`}
        >
          <action.Icon className={`w-9 h-9 ${c.text}`} />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-xs font-bold tracking-[0.3em] text-primary/70 uppercase mb-2"
        >
          Action Logged
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-black text-white mb-1"
        >
          {action.label}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className={`text-sm font-bold mb-4 ${c.text}`}
        >
          {action.impact}
        </motion.p>

        {/* Promise-kept callout — shows if this action sealed the day's promise */}
        {promiseJustKept && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.28, type: "spring" }}
            className="flex items-center gap-2 justify-center px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 mb-4"
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <p className="text-xs font-bold text-emerald-400">Today's Promise — Kept</p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          className="rounded-2xl border border-white/8 bg-white/4 px-5 py-4 mb-6"
        >
          <p className="text-base font-semibold text-white leading-snug">
            "{action.identity}"
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-between"
        >
          {streak > 0 && (
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-bold text-white">{streak}</span>
              <span className="text-xs text-muted-foreground">day streak</span>
            </div>
          )}
          <div className="flex-1 mx-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Today</span>
              <span className="font-bold text-white">{completedCount}/9</span>
            </div>
            <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.45 }}
                className={`h-full rounded-full bg-gradient-to-r ${c.ring}`}
              />
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1.2 }}
          className="text-xs text-muted-foreground mt-5"
        >
          Tap anywhere to continue
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

// ─── Today's Promise Banner ───────────────────────────────────────────────────
function TodaysPromiseBanner({
  promiseText,
  isCompleted,
}: {
  promiseText: string | null;
  isCompleted: boolean;
}) {
  if (!promiseText) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`rounded-2xl border px-5 py-4 flex items-start gap-4 relative overflow-hidden ${
        isCompleted
          ? "border-emerald-500/30 bg-emerald-500/6"
          : "border-primary/25 bg-primary/5"
      }`}
    >
      <div className={`absolute top-0 right-0 w-36 h-36 rounded-full blur-3xl pointer-events-none ${
        isCompleted ? "bg-emerald-500/8" : "bg-primary/8"
      }`} />

      <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border ${
        isCompleted
          ? "bg-emerald-500/15 border-emerald-500/30"
          : "bg-primary/15 border-primary/25"
      }`}>
        {isCompleted
          ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          : <Sparkles className="w-4 h-4 text-primary" />}
      </div>

      <div className="relative z-10 flex-1 min-w-0">
        <p className={`text-[10px] font-bold uppercase tracking-[0.25em] mb-0.5 ${
          isCompleted ? "text-emerald-400/70" : "text-primary/70"
        }`}>
          Today's Promise
        </p>
        <p className={`text-sm font-bold leading-snug ${isCompleted ? "text-emerald-300" : "text-white"}`}>
          {isCompleted ? `✓ ${promiseText}` : promiseText}
        </p>
        {isCompleted && (
          <p className="text-xs text-emerald-400/60 mt-1 font-medium">
            Promise kept. Identity strengthened.
          </p>
        )}
        {!isCompleted && (
          <p className="text-xs text-muted-foreground mt-1">
            Log any action below — every action counts toward keeping this promise.
          </p>
        )}
      </div>

      {!isCompleted && (
        <div className="shrink-0 flex items-center gap-1 text-primary/50 self-center">
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      )}
    </motion.div>
  );
}

export default function Actions() {
  const qc = useQueryClient();
  const { data: todaySummary } = useGetTodayActions();
  const { data: impacts } = useGetActionImpact();
  const { data: missions } = useMissions();
  const logAction = useLogAction();
  const completeMission = useCompleteMission();
  const [celebration, setCelebration] = useState<(CompletedAction & { promiseJustKept: boolean }) | null>(null);

  const completedTypes = new Set((todaySummary?.actions ?? []).map((a: any) => a.type));
  const completedCount = completedTypes.size;
  const completion = todaySummary?.completionPercentage ?? 0;
  const streakDays = (todaySummary as any)?.streakDays ?? 0;

  const promiseText: string | null = missions?.criticalMission ?? null;
  const promiseCompleted: boolean = missions?.criticalCompleted ?? false;

  const handleLog = (action: typeof ACTION_CONFIG[0]) => {
    const wasPromiseCompleted = missions?.criticalCompleted ?? false;

    logAction.mutate({ data: { type: action.type as any } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetTodayActionsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetActionImpactQueryKey() });
        qc.invalidateQueries({ queryKey: getGetFutureSelfQueryKey() });
        qc.invalidateQueries({ queryKey: getGetUserStatsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetActionsQueryKey() });

        // ── Reconcile with daily promise ──────────────────────────────────
        // Mirror the Dashboard QuickLog behavior: logging any action on this
        // page also seals the critical mission so "Today's Promise" is never
        // left on "Pending" after the user clearly showed up and did the work.
        if (!wasPromiseCompleted && missions?.criticalMission) {
          completeMission.mutate("critical", {
            onSuccess: () => qc.invalidateQueries({ queryKey: ["missions"] }),
          });
        }

        const promiseJustKept = !wasPromiseCompleted && !!missions?.criticalMission;
        setCelebration({
          label: action.label,
          impact: action.impact,
          identity: action.identity,
          color: action.color,
          Icon: action.icon,
          promiseJustKept,
        });
      },
    });
  };

  return (
    <AppLayout>
      <AnimatePresence>
        {celebration && (
          <CompletionCelebration
            action={celebration}
            streak={streakDays}
            completedCount={completedCount + 1}
            promiseJustKept={celebration.promiseJustKept}
            onDismiss={() => setCelebration(null)}
          />
        )}
      </AnimatePresence>

      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Daily Actions</h1>
          <p className="text-muted-foreground mt-1">Every action is a vote for who you're becoming. What did you do today?</p>
        </div>

        {/* Today's Promise — context for why they're here */}
        <div className="mb-5">
          <TodaysPromiseBanner promiseText={promiseText} isCompleted={promiseCompleted} />
        </div>

        {/* Progress bar */}
        <div className="mb-8 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Today's Progress</span>
            <span className="text-sm font-bold text-primary">{todaySummary?.completedTypes ?? 0} / 9 actions</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${completion}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          {completion >= 100 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-emerald-400 font-bold mt-3">
              🔥 All actions logged — you showed up fully today.
            </motion.p>
          )}
        </div>

        {/* Action grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACTION_CONFIG.map((action, i) => {
            const Icon = action.icon;
            const done = completedTypes.has(action.type);
            const c = COLOR_MAP[action.color];
            return (
              <motion.button
                key={action.type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => !done && !logAction.isPending && handleLog(action)}
                disabled={done || logAction.isPending}
                className={`relative rounded-2xl border p-5 text-left transition-all duration-200 ${
                  done
                    ? "border-primary/20 bg-primary/5 cursor-default"
                    : `border-white/8 bg-card cursor-pointer ${c.hover}`
                }`}
              >
                {done && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="absolute top-3 right-3"
                  >
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </motion.div>
                )}
                <div className={`mb-3 inline-flex rounded-xl p-2.5 ${done ? "bg-primary/10" : c.bg}`}>
                  <Icon className={`h-5 w-5 ${done ? "text-primary" : c.text}`} />
                </div>
                <h3 className={`font-semibold ${done ? "text-primary" : "text-foreground"}`}>{action.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">{action.impact}</p>
                {done ? (
                  <p className="text-xs text-primary/70 mt-2 font-medium italic truncate">"{action.identity}"</p>
                ) : (
                  <p className="text-xs text-muted-foreground/50 mt-2">Tap to log</p>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* All-time impact table */}
        {impacts && impacts.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-semibold mb-4">Your All-Time Impact</h2>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left px-5 py-3">Action</th>
                    <th className="text-right px-5 py-3">Count</th>
                    <th className="text-right px-5 py-3">Health+</th>
                    <th className="text-right px-5 py-3">Wealth+</th>
                    <th className="text-right px-5 py-3">Discipline+</th>
                  </tr>
                </thead>
                <tbody>
                  {impacts.map((imp: any) => (
                    <tr key={imp.actionType} className="border-b border-border/50 last:border-0">
                      <td className="px-5 py-3 capitalize font-medium">{imp.actionType.replace(/_/g, " ")}</td>
                      <td className="px-5 py-3 text-right text-muted-foreground">{imp.count}x</td>
                      <td className="px-5 py-3 text-right text-emerald-400">+{(imp.totalHealthImpact ?? 0).toFixed(1)}</td>
                      <td className="px-5 py-3 text-right text-amber-400">+{(imp.totalWealthImpact ?? 0).toFixed(1)}</td>
                      <td className="px-5 py-3 text-right text-blue-400">+{(imp.totalDisciplineImpact ?? 0).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
