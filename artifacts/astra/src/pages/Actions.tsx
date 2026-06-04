import AppLayout from "@/components/layout/AppLayout";
import { useGetTodayActions, useLogAction, useGetActionImpact, getGetTodayActionsQueryKey, getGetActionImpactQueryKey, getGetFutureSelfQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Dumbbell, BookOpen, Brain, Video, Leaf, DollarSign, Laptop, Moon, Droplets, CheckCircle2, Zap } from "lucide-react";

const ACTION_CONFIG = [
  { type: "workout", label: "Workout", icon: Dumbbell, color: "emerald", impact: "+2% Health, +1% Discipline" },
  { type: "reading", label: "Reading", icon: BookOpen, color: "violet", impact: "+1.5% Knowledge" },
  { type: "learning", label: "Learning", icon: Brain, color: "blue", impact: "+2% Knowledge, +1% Wealth" },
  { type: "content_creation", label: "Content Creation", icon: Video, color: "orange", impact: "+2% Confidence, +1.5% Wealth" },
  { type: "meditation", label: "Meditation", icon: Leaf, color: "teal", impact: "+1.5% Discipline" },
  { type: "saving", label: "Saving Money", icon: DollarSign, color: "amber", impact: "+2% Wealth, +1% Discipline" },
  { type: "deep_work", label: "Deep Work", icon: Laptop, color: "indigo", impact: "+2% Discipline, +1.5% Wealth" },
  { type: "sleep", label: "Sleep", icon: Moon, color: "sky", impact: "+1.5% Health" },
  { type: "water", label: "Water Intake", icon: Droplets, color: "cyan", impact: "+1% Health" },
];

const ICON_COLOR: Record<string, string> = {
  emerald: "text-emerald-400", violet: "text-violet-400", blue: "text-blue-400",
  orange: "text-orange-400", teal: "text-teal-400", amber: "text-amber-400",
  indigo: "text-indigo-400", sky: "text-sky-400", cyan: "text-cyan-400",
};
const ICON_BG: Record<string, string> = {
  emerald: "bg-emerald-500/10", violet: "bg-violet-500/10", blue: "bg-blue-500/10",
  orange: "bg-orange-500/10", teal: "bg-teal-500/10", amber: "bg-amber-500/10",
  indigo: "bg-indigo-500/10", sky: "bg-sky-500/10", cyan: "bg-cyan-500/10",
};
const CARD_HOVER: Record<string, string> = {
  emerald: "hover:border-emerald-500/40 hover:bg-emerald-500/5",
  violet: "hover:border-violet-500/40 hover:bg-violet-500/5",
  blue: "hover:border-blue-500/40 hover:bg-blue-500/5",
  orange: "hover:border-orange-500/40 hover:bg-orange-500/5",
  teal: "hover:border-teal-500/40 hover:bg-teal-500/5",
  amber: "hover:border-amber-500/40 hover:bg-amber-500/5",
  indigo: "hover:border-indigo-500/40 hover:bg-indigo-500/5",
  sky: "hover:border-sky-500/40 hover:bg-sky-500/5",
  cyan: "hover:border-cyan-500/40 hover:bg-cyan-500/5",
};

export default function Actions() {
  const qc = useQueryClient();
  const { data: todaySummary } = useGetTodayActions();
  const { data: impacts } = useGetActionImpact();
  const logAction = useLogAction();
  const [feedback, setFeedback] = useState<string | null>(null);

  const completedTypes = new Set((todaySummary?.actions ?? []).map((a: any) => a.type));
  const completion = todaySummary?.completionPercentage ?? 0;

  const handleLog = (type: string, label: string) => {
    logAction.mutate({ data: { type: type as any } }, {
      onSuccess: (result: any) => {
        qc.invalidateQueries({ queryKey: getGetTodayActionsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetActionImpactQueryKey() });
        qc.invalidateQueries({ queryKey: getGetFutureSelfQueryKey() });
        setFeedback(result.scoreImpact?.message ?? `${label} logged`);
        setTimeout(() => setFeedback(null), 3000);
      },
    });
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Daily Actions</h1>
          <p className="text-muted-foreground mt-1">Every action changes your future. Log what you did today.</p>
        </div>

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
        </div>

        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-5 py-3"
            >
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">{feedback}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACTION_CONFIG.map((action, i) => {
            const Icon = action.icon;
            const done = completedTypes.has(action.type);
            return (
              <motion.button
                key={action.type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => !done && !logAction.isPending && handleLog(action.type, action.label)}
                disabled={done || logAction.isPending}
                className={`relative rounded-2xl border p-5 text-left transition-all duration-200 ${
                  done
                    ? "border-primary/30 bg-primary/5 cursor-default"
                    : `border-white/10 bg-card cursor-pointer ${CARD_HOVER[action.color]}`
                }`}
              >
                {done && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className={`mb-3 inline-flex rounded-xl p-2.5 ${done ? "bg-primary/10" : ICON_BG[action.color]}`}>
                  <Icon className={`h-5 w-5 ${done ? "text-primary" : ICON_COLOR[action.color]}`} />
                </div>
                <h3 className={`font-semibold ${done ? "text-primary" : "text-foreground"}`}>{action.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">{action.impact}</p>
                {done && <p className="text-xs text-primary mt-2 font-medium">Completed today ✓</p>}
              </motion.button>
            );
          })}
        </div>

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
