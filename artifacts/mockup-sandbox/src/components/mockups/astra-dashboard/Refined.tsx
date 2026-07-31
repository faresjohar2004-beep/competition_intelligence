import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, Target, Shield, Brain, Dumbbell, Laptop, BookOpen, DollarSign,
  Leaf, Moon, Droplets, Video, Sparkles, CheckCircle2, ArrowRight,
  Zap, TrendingUp, Star,
} from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
// Canonical palette — every colour in this file comes from here.
const T = {
  bg:      "#070710",
  surface: "rgba(255,255,255,0.03)",
  border:  "rgba(255,255,255,0.07)",
  borderStrong: "rgba(255,255,255,0.11)",
  text:    "rgba(255,255,255,0.88)",
  muted:   "rgba(255,255,255,0.38)",
  faint:   "rgba(255,255,255,0.15)",
  primary: "#7c3aed",
  primaryMid: "rgba(124,58,237,0.18)",
  primaryFaint: "rgba(124,58,237,0.08)",
};

// ─── Seed data ────────────────────────────────────────────────────────────────
const USER = {
  firstName: "Marcus",
  streakDays: 14,
  identityScore: 68,
  alignScore: 82,
  tomorrowPromise: "Complete a 90-min deep work block before checking Slack",
  promiseKept: false,
  actionsToday: 2,
  dominantType: "deep_work",
  weeklyCount: 5,
  todayGains: { health: 0, wealth: 1.5, discipline: 3.5, knowledge: 2, confidence: 0 },
};

const ACTIONS = [
  { type: "workout",          label: "Workout",     icon: Dumbbell,   color: "#10b981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.2)" },
  { type: "deep_work",        label: "Deep Work",   icon: Laptop,     color: "#6366f1", bg: "rgba(99,102,241,0.1)",  border: "rgba(99,102,241,0.2)" },
  { type: "learning",         label: "Learning",    icon: Brain,      color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.2)" },
  { type: "content_creation", label: "Content",     icon: Video,      color: "#f97316", bg: "rgba(249,115,22,0.1)",  border: "rgba(249,115,22,0.2)" },
  { type: "saving",           label: "Saving",      icon: DollarSign, color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.2)" },
  { type: "reading",          label: "Reading",     icon: BookOpen,   color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",  border: "rgba(139,92,246,0.2)" },
  { type: "meditation",       label: "Meditation",  icon: Leaf,       color: "#14b8a6", bg: "rgba(20,184,166,0.1)",  border: "rgba(20,184,166,0.2)" },
  { type: "sleep",            label: "Sleep",       icon: Moon,       color: "#0ea5e9", bg: "rgba(14,165,233,0.1)",  border: "rgba(14,165,233,0.2)" },
  { type: "water",            label: "Water",       icon: Droplets,   color: "#06b6d4", bg: "rgba(6,182,212,0.1)",   border: "rgba(6,182,212,0.2)" },
];

const GAINS_CONFIG = [
  { key: "health",     label: "Health",     color: "#10b981", icon: Dumbbell  },
  { key: "wealth",     label: "Wealth",     color: "#f59e0b", icon: DollarSign },
  { key: "discipline", label: "Discipline", color: "#6366f1", icon: Shield    },
  { key: "knowledge",  label: "Knowledge",  color: "#8b5cf6", icon: Brain     },
  { key: "confidence", label: "Confidence", color: "#f97316", icon: Zap       },
] as const;

// ─── Micro components ─────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: T.muted, fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" }}>
      {children}
    </p>
  );
}

function Card({
  children, style = {}, className = "",
}: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div
      className={className}
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 20,
        padding: "20px 22px",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Streak Hero — the single dominant number ─────────────────────────────────
function StreakHero({ days, actionsToday }: { days: number; actionsToday: number }) {
  const done = actionsToday > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: `linear-gradient(135deg, rgba(249,115,22,0.11) 0%, rgba(124,58,237,0.06) 100%)`,
        border: `1px solid ${done ? "rgba(249,115,22,0.28)" : T.border}`,
        borderRadius: 24,
        padding: "24px 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: "absolute", right: -40, top: -40,
        width: 200, height: 200,
        background: "rgba(249,115,22,0.07)",
        borderRadius: "50%",
        filter: "blur(40px)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <Label>Current Streak</Label>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
          <span style={{ fontSize: 56, fontWeight: 900, color: "#fb923c", lineHeight: 1, letterSpacing: "-0.03em" }}>
            {days}
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, color: "rgba(249,115,22,0.55)", marginBottom: 4 }}>
            {days === 1 ? "day" : "days"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          <div style={{
            width: 120, height: 3, background: T.border, borderRadius: 99, overflow: "hidden"
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(days / 30) * 100}%` }}
              transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
              style={{ height: "100%", background: "linear-gradient(90deg, #f97316, #fb923c)", borderRadius: 99 }}
            />
          </div>
          <span style={{ fontSize: 11, color: T.muted, whiteSpace: "nowrap" }}>{days}/30 → 30-day streak</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, position: "relative", zIndex: 1 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: done ? "rgba(249,115,22,0.18)" : "rgba(249,115,22,0.08)",
          border: `1px solid ${done ? "rgba(249,115,22,0.4)" : "rgba(249,115,22,0.15)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Flame style={{ width: 26, height: 26, color: done ? "#fb923c" : "rgba(249,115,22,0.4)" }} />
        </div>
        {done && (
          <motion.span
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              fontSize: 9, fontWeight: 800, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "#fb923c",
            }}
          >
            Protected
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Stats Row — 3 supporting metrics, visually subordinate ──────────────────
function StatsRow({ identityScore, alignScore, actionsToday }: {
  identityScore: number; alignScore: number; actionsToday: number;
}) {
  const stats = [
    { label: "Identity Score", value: `${identityScore}%`, icon: Shield, color: "#6366f1" },
    { label: "Future Alignment", value: `${alignScore}%`, icon: Target,  color: "#7c3aed" },
    { label: "Actions Today",   value: `${actionsToday}`,  icon: Star,   color: "#10b981" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}
    >
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 + i * 0.06 }}
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            padding: "14px 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <s.icon style={{ width: 12, height: 12, color: s.color, flexShrink: 0 }} />
            <Label>{s.label}</Label>
          </div>
          <p style={{ fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── Daily Briefing — tighter, word integrated into headline ─────────────────
function DailyBriefing({ firstName, streakDays, dominantType, weeklyCount, actionsToday }: {
  firstName: string; streakDays: number; dominantType: string; weeklyCount: number; actionsToday: number;
}) {
  const tier = streakDays >= 14 ? { word: "IDENTITY", color: "#a78bfa" }
    : streakDays >= 7  ? { word: "MOMENTUM", color: T.primary }
    : streakDays >= 3  ? { word: "COMMIT",   color: "#60a5fa" }
    : { word: "BEGIN", color: T.text };

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "This afternoon" : "This evening";

  const body = `${weeklyCount} deep work session${weeklyCount > 1 ? "s" : ""} this week. Focus is your compound interest — every session widens the gap between you and the distracted majority.`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      style={{
        background: `linear-gradient(135deg, rgba(124,58,237,0.07), transparent)`,
        border: `1px solid ${T.border}`,
        borderRadius: 20,
        padding: "22px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Faint watermark word — integrated, not floating */}
      <div style={{
        position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)",
        fontSize: 80, fontWeight: 900, color: tier.color, opacity: 0.04,
        lineHeight: 1, pointerEvents: "none", letterSpacing: "-0.04em",
        userSelect: "none",
      }}>
        {tier.word}
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Sparkles style={{ width: 12, height: 12, color: tier.color, opacity: 0.7 }} />
          <Label>Daily Briefing · {now.toLocaleDateString("en-US", { weekday: "long" })}</Label>
          {actionsToday > 0 && (
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase",
              padding: "2px 8px", borderRadius: 99,
              background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.22)",
              color: "#34d399",
            }}>
              ✓ Protected
            </span>
          )}
        </div>

        <p style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>{greeting}, {firstName}.</p>

        <h2 style={{ fontSize: 19, fontWeight: 900, color: T.text, lineHeight: 1.25, marginBottom: 10 }}>
          <span style={{ color: tier.color }}>{streakDays} days</span> of unbroken commitment.{" "}
          <span style={{ color: T.faint }}>Your identity is shifting.</span>
        </h2>

        <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.65, maxWidth: 500 }}>{body}</p>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
          <div style={{ flex: 1, maxWidth: 180, height: 2, background: T.border, borderRadius: 99, overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(streakDays / 30) * 100}%` }}
              transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
              style={{ height: "100%", background: `linear-gradient(90deg, ${T.primary}, #a78bfa)`, borderRadius: 99 }}
            />
          </div>
          <span style={{ fontSize: 11, color: T.muted, whiteSpace: "nowrap" }}>
            {streakDays}/30 → 30-day streak
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Promise Card — primary CTA, most visual weight on screen ────────────────
function PromiseCard({ text, kept, onKeep }: { text: string; kept: boolean; onKeep: () => void }) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(kept);

  function handleKeep() {
    setPending(true);
    setTimeout(() => { setDone(true); setPending(false); }, 900);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.12 }}
      style={{
        background: done
          ? "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(7,7,16,1) 60%)"
          : "linear-gradient(135deg, rgba(124,58,237,0.14) 0%, rgba(7,7,16,1) 60%)",
        border: `1px solid ${done ? "rgba(16,185,129,0.3)" : "rgba(124,58,237,0.3)"}`,
        borderRadius: 24,
        padding: "26px 28px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Radial glow — stronger than before */}
      <div style={{
        position: "absolute", top: -60, right: -60, width: 240, height: 240,
        background: done ? "rgba(16,185,129,0.1)" : "rgba(124,58,237,0.12)",
        borderRadius: "50%", filter: "blur(50px)", pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 10,
            background: done ? "rgba(16,185,129,0.18)" : T.primaryMid,
            border: `1px solid ${done ? "rgba(16,185,129,0.35)" : "rgba(124,58,237,0.35)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {done
              ? <CheckCircle2 style={{ width: 14, height: 14, color: "#34d399" }} />
              : <Sparkles style={{ width: 14, height: 14, color: "#a78bfa" }} />}
          </div>
          <Label>{done ? "Promise Kept" : "Today's Promise"}</Label>
        </div>

        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="kept" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: T.text, lineHeight: 1.25, marginBottom: 8 }}>
                Promise kept. You are who you said you'd be.
              </h2>
              <p style={{ fontSize: 13, color: "rgba(52,211,153,0.7)", fontStyle: "italic", marginBottom: 16 }}>"{text}"</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {["+1.5% Discipline", "+1.5% Confidence", "Identity Strengthened"].map((tag) => (
                  <span key={tag} style={{
                    fontSize: 11, fontWeight: 700,
                    padding: "5px 12px", borderRadius: 8,
                    background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.22)",
                    color: "#34d399",
                  }}>{tag}</span>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="pending" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: T.text, lineHeight: 1.25, marginBottom: 6 }}>
                {text}
              </h2>
              <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 18 }}>
                One commitment. Total focus. Keep it and prove who you're becoming.
              </p>
              <button
                onClick={handleKeep}
                disabled={pending}
                style={{
                  height: 46, padding: "0 24px", borderRadius: 12,
                  background: pending ? T.primaryMid : T.primary,
                  border: "none", color: "#fff", fontWeight: 700, fontSize: 14,
                  cursor: pending ? "default" : "pointer",
                  display: "flex", alignItems: "center", gap: 8,
                  transition: "background 0.2s",
                }}
              >
                {pending ? "Sealing…" : <><span>Keep My Promise</span><ArrowRight style={{ width: 16, height: 16 }} /></>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Today's Gains — chips with legible opacity ───────────────────────────────
function TodayGains({ gains }: { gains: Record<string, number> }) {
  const active = GAINS_CONFIG.filter(d => (gains[d.key] ?? 0) > 0);
  if (active.length === 0) return null;

  const total = active.reduce((s, d) => s + (gains[d.key] ?? 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 18, padding: "16px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Label>Today's Gains</Label>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.faint }}>
          +{total % 1 === 0 ? total : total.toFixed(1)}% total
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {active.map((d, i) => {
          const val = gains[d.key] ?? 0;
          return (
            <motion.div
              key={d.key}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.07, type: "spring", stiffness: 380, damping: 22 }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 10,
                // Fixed: /15 instead of /8 — actually legible
                background: `${d.color}20`, border: `1px solid ${d.color}35`,
              }}
            >
              <d.icon style={{ width: 12, height: 12, color: d.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 900, color: d.color }}>
                +{val % 1 === 0 ? val : val.toFixed(1)}%
              </span>
              <span style={{ fontSize: 12, color: T.muted }}>{d.label}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Quick Log — action grid ──────────────────────────────────────────────────
function QuickLog() {
  const [logged, setLogged] = useState<Set<string>>(new Set(["deep_work", "learning"]));
  const [logging, setLogging] = useState<string | null>(null);

  function handleLog(type: string) {
    if (logged.has(type)) return;
    setLogging(type);
    setTimeout(() => {
      setLogged(prev => new Set([...prev, type]));
      setLogging(null);
    }, 700);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 20, padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <Label>Log an Action</Label>
        <span style={{ fontSize: 11, color: T.faint }}>
          {logged.size}/{ACTIONS.length} today
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {ACTIONS.map((a, i) => {
          const done = logged.has(a.type);
          const busy = logging === a.type;
          return (
            <motion.button
              key={a.type}
              onClick={() => handleLog(a.type)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 + i * 0.04 }}
              whileHover={!done ? { scale: 1.03 } : {}}
              whileTap={!done ? { scale: 0.96 } : {}}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 7, padding: "12px 8px", borderRadius: 14,
                background: done ? `${a.color}16` : T.surface,
                border: `1px solid ${done ? a.border : T.border}`,
                cursor: done ? "default" : "pointer",
                transition: "background 0.2s, border-color 0.2s",
                position: "relative", overflow: "hidden",
              }}
            >
              {done && (
                <div style={{
                  position: "absolute", top: 6, right: 6,
                  width: 14, height: 14, borderRadius: "50%",
                  background: a.color, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <CheckCircle2 style={{ width: 10, height: 10, color: "#fff" }} />
                </div>
              )}
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: done ? `${a.color}22` : `${a.color}12`,
                border: `1px solid ${done ? a.border : "transparent"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.2s",
              }}>
                {busy
                  ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}>
                      <Sparkles style={{ width: 16, height: 16, color: a.color }} />
                    </motion.div>
                  : <a.icon style={{ width: 16, height: 16, color: done ? a.color : T.muted }} />}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.02em",
                color: done ? a.color : T.muted,
                textAlign: "center",
              }}>
                {a.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function Refined() {
  const { firstName, streakDays, identityScore, alignScore, tomorrowPromise,
    promiseKept, actionsToday, dominantType, weeklyCount, todayGains } = USER;

  return (
    <div style={{
      minHeight: "100vh", background: T.bg,
      fontFamily: "'Inter', sans-serif",
      overflowY: "auto",
    }}>
      {/* Ambient background glow */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124,58,237,0.07) 0%, transparent 60%)",
      }} />

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px 48px", position: "relative", zIndex: 1 }}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}
        >
          <div>
            <p style={{ fontSize: 11, color: T.muted, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 2 }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: T.text, lineHeight: 1, letterSpacing: "-0.02em" }}>
              ASTRA
            </h1>
          </div>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: T.primaryFaint, border: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <TrendingUp style={{ width: 18, height: 18, color: "#a78bfa" }} />
          </div>
        </motion.div>

        {/* ── Streak hero (dominant) ──────────────────────────────────── */}
        <div style={{ marginBottom: 10 }}>
          <StreakHero days={streakDays} actionsToday={actionsToday} />
        </div>

        {/* ── Supporting stats row ────────────────────────────────────── */}
        <div style={{ marginBottom: 14 }}>
          <StatsRow identityScore={identityScore} alignScore={alignScore} actionsToday={actionsToday} />
        </div>

        {/* ── Daily Briefing ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 14 }}>
          <DailyBriefing
            firstName={firstName} streakDays={streakDays}
            dominantType={dominantType} weeklyCount={weeklyCount}
            actionsToday={actionsToday}
          />
        </div>

        {/* ── Promise card (primary CTA) ──────────────────────────────── */}
        <div style={{ marginBottom: 14 }}>
          <PromiseCard text={tomorrowPromise} kept={promiseKept} onKeep={() => {}} />
        </div>

        {/* ── Today's gains ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 14 }}>
          <TodayGains gains={todayGains} />
        </div>

        {/* ── Quick log ───────────────────────────────────────────────── */}
        <QuickLog />

      </div>
    </div>
  );
}
