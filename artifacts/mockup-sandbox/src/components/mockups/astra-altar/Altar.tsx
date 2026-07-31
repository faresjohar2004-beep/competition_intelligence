import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Dumbbell, Brain, BookOpen, Laptop, DollarSign, Leaf, Moon, Droplets, Video, Sparkles, ChevronRight, Check } from "lucide-react";

// ─── Seed data ────────────────────────────────────────────────────────────────
const USER = {
  firstName: "Marcus",
  streakDays: 7,
  identityStatement: "You are becoming a Disciplined Builder.",
  mission: {
    label: "Deep Work",
    type: "deep_work",
    description: "90 minutes of uninterrupted focus on your most important task.",
    identity: "The person you're becoming does the real work — even when it's hard.",
  },
};

const ACTION_ICONS: Record<string, any> = {
  workout: Dumbbell,
  deep_work: Laptop,
  learning: Brain,
  content_creation: Video,
  saving: DollarSign,
  reading: BookOpen,
  meditation: Leaf,
  sleep: Moon,
  water: Droplets,
  promise: Sparkles,
};

const ACTION_COLORS: Record<string, { primary: string; glow: string; ring: string; text: string; orb: string }> = {
  workout:          { primary: "#10b981", glow: "rgba(16,185,129,0.18)", ring: "rgba(16,185,129,0.55)", text: "#6ee7b7", orb: "from-emerald-500/20 to-teal-600/20" },
  deep_work:        { primary: "#6366f1", glow: "rgba(99,102,241,0.18)", ring: "rgba(99,102,241,0.55)", text: "#a5b4fc", orb: "from-indigo-500/20 to-violet-600/20" },
  learning:         { primary: "#3b82f6", glow: "rgba(59,130,246,0.18)", ring: "rgba(59,130,246,0.55)", text: "#93c5fd", orb: "from-blue-500/20 to-cyan-600/20" },
  content_creation: { primary: "#f97316", glow: "rgba(249,115,22,0.18)",  ring: "rgba(249,115,22,0.55)",  text: "#fdba74", orb: "from-orange-500/20 to-amber-600/20" },
  saving:           { primary: "#f59e0b", glow: "rgba(245,158,11,0.18)",  ring: "rgba(245,158,11,0.55)",  text: "#fcd34d", orb: "from-amber-500/20 to-yellow-600/20" },
  reading:          { primary: "#8b5cf6", glow: "rgba(139,92,246,0.18)",  ring: "rgba(139,92,246,0.55)",  text: "#c4b5fd", orb: "from-violet-500/20 to-purple-600/20" },
  meditation:       { primary: "#14b8a6", glow: "rgba(20,184,166,0.18)",  ring: "rgba(20,184,166,0.55)",  text: "#5eead4", orb: "from-teal-500/20 to-emerald-600/20" },
  sleep:            { primary: "#0ea5e9", glow: "rgba(14,165,233,0.18)",  ring: "rgba(14,165,233,0.55)",  text: "#7dd3fc", orb: "from-sky-500/20 to-blue-600/20" },
  water:            { primary: "#06b6d4", glow: "rgba(6,182,212,0.18)",   ring: "rgba(6,182,212,0.55)",   text: "#67e8f9", orb: "from-cyan-500/20 to-sky-600/20" },
  promise:          { primary: "#8b5cf6", glow: "rgba(139,92,246,0.18)",  ring: "rgba(139,92,246,0.55)",  text: "#c4b5fd", orb: "from-violet-500/20 to-purple-600/20" },
};

// ─── Particle burst ───────────────────────────────────────────────────────────
function Particles({ color, active }: { color: string; active: boolean }) {
  const particles = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    angle: (i / 16) * 360,
    distance: 120 + Math.random() * 80,
    size: 3 + Math.random() * 5,
    duration: 0.6 + Math.random() * 0.4,
  }));

  return (
    <AnimatePresence>
      {active && particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: color,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            boxShadow: `0 0 ${p.size * 2}px ${color}`,
          }}
          initial={{ opacity: 1, x: 0, y: 0 }}
          animate={{
            opacity: 0,
            x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
            y: Math.sin((p.angle * Math.PI) / 180) * p.distance,
          }}
          transition={{ duration: p.duration, ease: "easeOut" }}
        />
      ))}
    </AnimatePresence>
  );
}

// ─── Pulsing orb ─────────────────────────────────────────────────────────────
function ActionOrb({
  type, colors, state, onClick,
}: {
  type: string; colors: typeof ACTION_COLORS[string]; state: "idle" | "completing" | "done"; onClick: () => void;
}) {
  const Icon = ACTION_ICONS[type] ?? Sparkles;

  return (
    <div className="relative flex items-center justify-center cursor-pointer" onClick={state === "idle" ? onClick : undefined}>
      {/* Outermost ambient glow */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 320, height: 320, background: colors.glow, filter: "blur(48px)" }}
        animate={state === "completing"
          ? { scale: [1, 2.5, 0], opacity: [0.6, 1, 0] }
          : { scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }
        }
        transition={state === "completing"
          ? { duration: 0.7, ease: "easeOut" }
          : { duration: 3, repeat: Infinity, ease: "easeInOut" }
        }
      />

      {/* Outer ring */}
      <motion.div
        className="absolute rounded-full border-2"
        style={{ width: 240, height: 240, borderColor: colors.ring }}
        animate={state === "completing"
          ? { scale: [1, 1.8], opacity: [0.8, 0] }
          : { scale: [1, 1.03, 1], opacity: [0.4, 0.7, 0.4] }
        }
        transition={state === "completing"
          ? { duration: 0.5, ease: "easeOut" }
          : { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.3 }
        }
      />

      {/* Middle ring */}
      <motion.div
        className="absolute rounded-full border"
        style={{ width: 192, height: 192, borderColor: colors.ring, opacity: 0.5 }}
        animate={state === "idle" ? { scale: [1, 1.04, 1], opacity: [0.3, 0.6, 0.3] } : {}}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      />

      {/* Core orb */}
      <motion.div
        className={`relative flex items-center justify-center rounded-full bg-gradient-to-br ${colors.orb}`}
        style={{
          width: 152, height: 152,
          backdropFilter: "blur(8px)",
          boxShadow: `0 0 60px ${colors.glow}, inset 0 1px 0 rgba(255,255,255,0.08)`,
          border: `1px solid ${colors.ring}`,
        }}
        animate={state === "completing"
          ? { scale: [1, 1.3, 0.6, 1], rotate: [0, 15, -10, 0] }
          : state === "done"
          ? { scale: 1, opacity: 0.5 }
          : { scale: [1, 1.02, 1] }
        }
        transition={state === "completing"
          ? { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }
          : { duration: 4, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <AnimatePresence mode="wait">
          {state !== "done" ? (
            <motion.div
              key="icon"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 2 }}
              transition={{ duration: 0.3 }}
            >
              <Icon style={{ color: colors.text, width: 52, height: 52 }} strokeWidth={1.5} />
            </motion.div>
          ) : (
            <motion.div
              key="check"
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <Check style={{ color: colors.text, width: 52, height: 52 }} strokeWidth={2} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Particle burst on completion */}
      <Particles color={colors.primary} active={state === "completing"} />
    </div>
  );
}

// ─── Streak badge ─────────────────────────────────────────────────────────────
function StreakBadge({ days, visible }: { days: number; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            background: "rgba(249,115,22,0.12)",
            border: "1px solid rgba(249,115,22,0.3)",
          }}
        >
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-semibold text-orange-300">{days + 1}-day streak</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function Altar() {
  const { firstName, streakDays, identityStatement, mission } = USER;
  const colors = ACTION_COLORS[mission.type] ?? ACTION_COLORS.deep_work;
  const [orbState, setOrbState] = useState<"idle" | "completing" | "done">("idle");
  const [showStreak, setShowStreak] = useState(false);
  const [showTomorrow, setShowTomorrow] = useState(false);
  const [promise, setPromise] = useState("");

  function handleComplete() {
    setOrbState("completing");
    setTimeout(() => {
      setOrbState("done");
      setShowStreak(true);
    }, 700);
    setTimeout(() => setShowTomorrow(true), 1800);
  }

  function handleReset() {
    setOrbState("idle");
    setShowStreak(false);
    setShowTomorrow(false);
    setPromise("");
  }

  return (
    <div
      className="flex flex-col min-h-screen w-full overflow-hidden select-none"
      style={{ background: "#07070d", fontFamily: "'Inter', sans-serif" }}
    >
      {/* Subtle background radial gradient tied to action color */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 30%, ${colors.glow} 0%, transparent 70%)`,
        }}
      />

      {/* ── Header: identity ─────────────────────────────────────────── */}
      <motion.div
        className="relative z-10 flex flex-col items-center pt-12 pb-4 px-6"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <AnimatePresence mode="wait">
          {orbState !== "done" ? (
            <motion.h1
              key="identity"
              className="text-lg font-semibold text-center leading-snug max-w-xs"
              style={{ color: "rgba(255,255,255,0.75)" }}
              exit={{ opacity: 0, y: -8 }}
            >
              {identityStatement}
            </motion.h1>
          ) : (
            <motion.h1
              key="done"
              className="text-lg font-semibold text-center leading-snug max-w-xs"
              style={{ color: colors.text }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Today's chapter is written, {firstName}.
            </motion.h1>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Central orb ──────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 px-6">
        <ActionOrb type={mission.type} colors={colors} state={orbState} onClick={handleComplete} />

        {/* Mission label + description */}
        <AnimatePresence mode="wait">
          {orbState !== "done" ? (
            <motion.div
              key="mission"
              className="flex flex-col items-center gap-2 text-center max-w-sm"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: "rgba(255,255,255,0.92)" }}>
                {mission.label}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                {mission.description}
              </p>
              <p className="text-xs mt-1 italic" style={{ color: colors.text, opacity: 0.8 }}>
                "{mission.identity}"
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="done-msg"
              className="flex flex-col items-center gap-3 text-center max-w-sm"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                You showed up. That's the whole game.
              </p>
              <StreakBadge days={streakDays} visible={showStreak} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom CTA area ───────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center gap-4 pb-12 px-6">
        <AnimatePresence mode="wait">
          {orbState === "idle" && (
            <motion.button
              key="cta"
              onClick={handleComplete}
              className="relative w-full max-w-sm py-4 rounded-2xl font-semibold text-base tracking-wide overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}cc, ${colors.primary}88)`,
                boxShadow: `0 0 32px ${colors.glow}, 0 4px 24px rgba(0,0,0,0.4)`,
                border: `1px solid ${colors.ring}`,
                color: "#fff",
              }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.5, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              whileHover={{ scale: 1.02, boxShadow: `0 0 48px ${colors.glow}, 0 8px 32px rgba(0,0,0,0.5)` }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="relative z-10">I did this today</span>
            </motion.button>
          )}

          {orbState === "completing" && (
            <motion.div
              key="loading"
              className="flex items-center gap-2"
              style={{ color: colors.text }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: colors.primary }}
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 0.4, repeat: Infinity }}
              />
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: colors.primary }}
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 0.4, repeat: Infinity, delay: 0.15 }}
              />
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: colors.primary }}
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 0.4, repeat: Infinity, delay: 0.3 }}
              />
            </motion.div>
          )}

          {orbState === "done" && showTomorrow && (
            <motion.div
              key="tomorrow"
              className="flex flex-col items-center gap-3 w-full max-w-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <p className="text-xs text-center tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>
                TOMORROW'S COMMITMENT
              </p>
              <div
                className="flex items-center w-full rounded-xl overflow-hidden"
                style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
              >
                <input
                  type="text"
                  placeholder="What will you do tomorrow?"
                  value={promise}
                  onChange={(e) => setPromise(e.target.value)}
                  className="flex-1 bg-transparent text-sm px-4 py-3 outline-none placeholder:opacity-30"
                  style={{ color: "rgba(255,255,255,0.75)" }}
                />
                <button
                  className="px-4 py-3 flex items-center"
                  style={{ color: colors.text }}
                  disabled={!promise.trim()}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleReset}
                className="text-xs mt-1"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                reset demo
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ghost nav — minimized, only visible on scroll-up gesture (implied) */}
        {orbState === "idle" && (
          <motion.div
            className="flex items-center gap-6 mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            {["Evidence", "Coach", "Scores"].map((label) => (
              <button
                key={label}
                className="text-xs font-medium"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
