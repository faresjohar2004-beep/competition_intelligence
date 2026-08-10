import AppLayout from "@/components/layout/AppLayout";
import {
  useGetFutureSelfScores,
  useGetBiography,
  useGetUserStats,
  useGetTimeline,
} from "@workspace/api-client-react";
import { motion } from "framer-motion";
import {
  TrendingUp, Zap, Star, BookOpen,
  Activity, Flame, Target,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

const CHAPTER_COLORS: Record<number, string> = {
  1: "#8B5CF6", 2: "#3B82F6", 3: "#6366F1",
  4: "#10B981", 5: "#F59E0B", 6: "#F97316",
};
const CHAPTER_NAMES: Record<number, string> = {
  1: "The Awakening",  2: "The Foundation", 3: "The Momentum",
  4: "The Discipline", 5: "The Mastery",    6: "The Legacy",
};
const SCORE_COLORS = {
  health:     "#10B981",
  wealth:     "#F59E0B",
  discipline: "#6366F1",
  confidence: "#F97316",
  knowledge:  "#3B82F6",
};
const PATH_CONFIG = [
  {
    key: "current",
    label: "Current Path",
    icon: TrendingUp,
    accent: "#6B7280",
    border: "border-border",
    bg: "bg-card",
  },
  {
    key: "improved",
    label: "Improved Path",
    icon: Zap,
    accent: "hsl(var(--primary))",
    border: "border-primary/40",
    bg: "bg-primary/5",
  },
  {
    key: "peak",
    label: "Peak Potential",
    icon: Star,
    accent: "#60A5FA",
    border: "border-blue-500/40",
    bg: "bg-blue-500/5",
  },
];

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ScoreTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-xs shadow-xl">
      <p className="text-muted-foreground font-medium mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-foreground/70 capitalize">{p.dataKey}</span>
          <span className="ml-auto font-semibold text-foreground">{p.value}%</span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Timeline() {
  const { data: scoreHistory, isLoading: scoresLoading } = useGetFutureSelfScores();
  const { data: biography } = useGetBiography();
  const { data: stats } = useGetUserStats();
  const { data: timelines, isLoading: timelinesLoading } = useGetTimeline();

  // Oldest → newest for the earned-milestone timeline
  const entries = Array.isArray(biography)
    ? [...(biography as any[])].reverse()
    : [];

  const rawScores = Array.isArray(scoreHistory) ? (scoreHistory as any[]) : [];

  // Build chart data — one point per day, 5 dimensions + overall
  const chartData = rawScores.map((s) => ({
    date:       fmtDate(s.date),
    health:     Math.round(s.healthScore     ?? 50),
    wealth:     Math.round(s.wealthScore     ?? 50),
    discipline: Math.round(s.disciplineScore ?? 50),
    confidence: Math.round(s.confidenceScore ?? 50),
    knowledge:  Math.round(s.knowledgeScore  ?? 50),
  }));

  const hasHistory = chartData.length > 1;
  const latest = rawScores[rawScores.length - 1];
  const first  = rawScores[0];
  const currentOverall = stats?.overallScore ?? 50;

  // Score gained over the charted window
  const gained = latest && first
    ? Math.round(
        (((latest.healthScore + latest.wealthScore + latest.disciplineScore + latest.confidenceScore + latest.knowledgeScore) / 5) -
         ((first.healthScore  + first.wealthScore  + first.disciplineScore  + first.confidenceScore  + first.knowledgeScore)  / 5))
      )
    : 0;

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 pb-16">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Your Trajectory
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Real progress. Real proof. Real becoming.
          </p>
        </motion.div>

        {/* ── Key Stats ───────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {[
            {
              icon: Activity,
              label: "Actions Logged",
              value: stats?.totalActions ?? 0,
              color: "#8B5CF6",
            },
            {
              icon: Flame,
              label: "Day Streak",
              value: `${stats?.streakDays ?? 0}d`,
              color: "#F97316",
            },
            {
              icon: BookOpen,
              label: "Chapters Written",
              value: entries.length,
              color: "#3B82F6",
            },
            {
              icon: Target,
              label: `Score Gained${rawScores.length > 1 ? ` (${rawScores.length}d)` : ""}`,
              value: gained >= 0 ? `+${gained}%` : `${gained}%`,
              color: gained >= 0 ? "#10B981" : "#6B7280",
            },
          ].map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="rounded-xl border border-border bg-card p-4 flex items-center gap-3"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${color}20` }}
              >
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground leading-none mb-1 truncate">{label}</p>
                <p className="text-lg font-bold text-foreground leading-none">{value}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── Score History Chart ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <div className="flex items-start justify-between mb-6 gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Score History</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {hasHistory ? `Your last ${chartData.length} days of real growth` : "Your growth chart starts with your first action"}
              </p>
            </div>
            {hasHistory && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 justify-end shrink-0">
                {(Object.entries(SCORE_COLORS) as [string, string][]).map(([key, color]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[10px] text-muted-foreground capitalize">{key}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {scoresLoading && (
            <div className="h-48 rounded-xl bg-white/5 animate-pulse" />
          )}

          {!scoresLoading && !hasHistory && (
            <div className="h-48 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                <Activity className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">No history yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Log your first action — every entry shifts your score and builds this record permanently.
                </p>
              </div>
            </div>
          )}

          {hasHistory && (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<ScoreTooltip />} />
                {(Object.entries(SCORE_COLORS) as [string, string][]).map(([key, color]) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* ── Earned Chapter Milestones ────────────────────────────────────── */}
        {entries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold text-foreground">Chapters Earned</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanent proof of who you became on each day
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {entries.length} chapter{entries.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="relative">
              {/* Vertical spine */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

              <div className="space-y-6">
                {entries.map((entry: any, i: number) => {
                  const color  = CHAPTER_COLORS[entry.chapterNumber] ?? "#8B5CF6";
                  const isLatest = i === entries.length - 1;
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.04 }}
                      className="flex gap-4 relative"
                    >
                      {/* Timeline dot */}
                      <div
                        className="shrink-0 w-4 h-4 rounded-full border-2 relative z-10 mt-0.5"
                        style={{
                          backgroundColor: isLatest ? color : `${color}30`,
                          borderColor: color,
                        }}
                      />
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-xs font-semibold" style={{ color }}>
                            {CHAPTER_NAMES[entry.chapterNumber] ?? `Chapter ${entry.chapterNumber}`}
                          </span>
                          {isLatest && (
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded-full font-bold tracking-wide"
                              style={{ backgroundColor: `${color}20`, color }}
                            >
                              LATEST
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mb-1.5">{fmtDate(entry.date)}</p>
                        <p className="text-xs text-foreground/65 leading-relaxed line-clamp-2">
                          {entry.content}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Where You're Headed (three paths) ───────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="mb-4">
            <h2 className="text-base font-semibold text-foreground">Where You're Headed</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Projected from your current score of{" "}
              <span className="text-foreground font-medium">{Math.round(currentOverall)}%</span>
              {" "}— based on your daily action rate
            </p>
          </div>

          {timelinesLoading && (
            <div className="grid md:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-card animate-pulse" />
              ))}
            </div>
          )}

          {timelines && (
            <div className="grid md:grid-cols-3 gap-4">
              {PATH_CONFIG.map((path, pi) => {
                const data = (timelines as any)[path.key];
                const Icon = path.icon;
                if (!data) return null;
                return (
                  <motion.div
                    key={path.key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + pi * 0.08 }}
                    className={`rounded-2xl border p-5 relative overflow-hidden ${path.border} ${path.bg}`}
                  >
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 border border-white/10">
                          <Icon className="h-4 w-4" style={{ color: path.accent }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: path.accent }}>
                          {data.name}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
                        {data.description}
                      </p>

                      {/* Projected score bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-muted-foreground">Score in 1 year</span>
                          <span className="text-xl font-bold" style={{ color: path.accent }}>
                            {data.projectedScore}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: path.accent }}
                            initial={{ width: 0 }}
                            animate={{ width: `${data.projectedScore}%` }}
                            transition={{ duration: 0.8, delay: 0.2 + pi * 0.08 + 0.2 }}
                          />
                        </div>
                      </div>

                      {/* Milestones */}
                      <div className="space-y-2.5">
                        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                          Milestones
                        </p>
                        {data.milestones.map((m: any, mi: number) => (
                          <div key={mi} className="flex gap-2 items-start">
                            <div
                              className="shrink-0 text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center border mt-0.5"
                              style={{ color: path.accent, borderColor: `${path.accent}50` }}
                            >
                              {m.month < 12 ? `${m.month}M` : "1Y"}
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-foreground leading-snug">
                                {m.event}
                              </p>
                              <p className="text-[10px]" style={{ color: path.accent }}>
                                → {m.scoreProjection}%
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="rounded-2xl border border-border bg-card/40 p-5 text-center"
        >
          <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
            The gap between these paths isn't talent or luck.
            It's the decisions you make today, repeated.
            Every action logged moves you toward the peak — permanently.
          </p>
        </motion.div>

      </div>
    </AppLayout>
  );
}
