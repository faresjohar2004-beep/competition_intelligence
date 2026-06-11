import AppLayout from "@/components/layout/AppLayout";
import { useGetActions, useGetUserStats, useGetTodayActions } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import {
  Shield, Flame, CheckCircle2, Dumbbell, BookOpen, Brain, Video,
  Leaf, DollarSign, Laptop, Moon, Droplets, TrendingUp, Calendar,
} from "lucide-react";

// Action config for display
const ACTION_DISPLAY: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  identity: string;
}> = {
  workout:          { label: "Workout",          icon: Dumbbell,   color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", identity: "You are someone who refuses to let their body fail them." },
  reading:          { label: "Reading",          icon: BookOpen,   color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/20",  identity: "You are someone who never stops growing." },
  learning:         { label: "Learning",         icon: Brain,      color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20",    identity: "You are someone who invests in their future every single day." },
  content_creation: { label: "Content Creation", icon: Video,      color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/20",  identity: "You are someone who creates value in the world." },
  meditation:       { label: "Meditation",       icon: Leaf,       color: "text-teal-400",    bg: "bg-teal-500/10",    border: "border-teal-500/20",    identity: "You are someone who masters their own mind." },
  saving:           { label: "Saving Money",     icon: DollarSign, color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   identity: "You are someone who builds wealth with intention." },
  deep_work:        { label: "Deep Work",        icon: Laptop,     color: "text-indigo-400",  bg: "bg-indigo-500/10",  border: "border-indigo-500/20",  identity: "You are someone who does the real work." },
  sleep:            { label: "Sleep",            icon: Moon,       color: "text-sky-400",     bg: "bg-sky-500/10",     border: "border-sky-500/20",     identity: "You are someone who plays the long game." },
  water:            { label: "Water Intake",     icon: Droplets,   color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20",    identity: "You are someone who takes care of their body." },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.setDate(now.getDate() - 1)).toDateString();
  if (d.toDateString() === today) return "Today";
  if (d.toDateString() === yesterday) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function EvidenceCard({ action, index }: { action: any; index: number }) {
  const display = ACTION_DISPLAY[action.type] ?? ACTION_DISPLAY["deep_work"];
  const Icon = display.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      className={`flex items-start gap-4 p-4 rounded-2xl border ${display.border} ${display.bg} hover:brightness-105 transition-all`}
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

export default function Evidence() {
  const { data: allActions = [], isLoading } = useGetActions({ limit: 200 });
  const { data: todayActions } = useGetTodayActions();
  const { data: stats } = useGetUserStats();

  const actions = allActions as any[];
  const todayList = (todayActions?.actions ?? []) as any[];

  // Group past actions by date (excluding today)
  const today = new Date().toISOString().split("T")[0];
  const pastActions = actions.filter((a: any) => {
    const d = new Date(a.completedAt).toISOString().split("T")[0];
    return d !== today;
  });

  // Group by date
  const grouped = pastActions.reduce((acc: Record<string, any[]>, a: any) => {
    const d = new Date(a.completedAt).toISOString().split("T")[0];
    if (!acc[d]) acc[d] = [];
    acc[d].push(a);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const totalProof = actions.length;
  const streakDays = stats?.streakDays ?? 0;
  const activeDays = sortedDates.length + (todayList.length > 0 ? 1 : 0);

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">Evidence Vault</h1>
              <p className="text-muted-foreground text-sm">Every completed action is proof you are who you say you are.</p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Proof Items", value: totalProof, icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
            { label: "Current Streak",    value: `${streakDays}d`, icon: Flame, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
            { label: "Active Days",       value: activeDays, icon: Calendar, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
          ].map(({ label, value, icon: Icon, color, bg, border }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border ${border} ${bg} p-4 text-center`}
            >
              <Icon className={`w-5 h-5 ${color} mx-auto mb-2`} />
              <p className="text-2xl font-black text-white">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[0,1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-card animate-pulse" />)}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && totalProof === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-16 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Your vault is empty</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Log your first action to start building evidence that you are who you say you are.
            </p>
          </div>
        )}

        {/* Today's evidence */}
        {todayList.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Today's Evidence</h2>
              <span className="text-xs text-muted-foreground">{todayList.length} proof item{todayList.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-3">
              {todayList.map((action: any, i: number) => (
                <EvidenceCard key={action.id ?? i} action={action} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Historical evidence by date */}
        {sortedDates.length > 0 && (
          <div className="space-y-8">
            {sortedDates.map((date, di) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                    {formatDate(new Date(date + "T12:00:00").toISOString())}
                  </h2>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">{grouped[date].length} action{grouped[date].length !== 1 ? "s" : ""}</span>
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

        {/* Vault integrity footer */}
        {totalProof > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center"
          >
            <TrendingUp className="w-6 h-6 text-primary mx-auto mb-3" />
            <p className="text-sm font-bold text-white mb-1">{totalProof} promises kept.</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Each one is permanent proof of who you are becoming. This vault never lies.
            </p>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
