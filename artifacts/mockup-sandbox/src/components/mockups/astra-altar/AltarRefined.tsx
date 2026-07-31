import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, Dumbbell, Brain, BookOpen, Laptop, DollarSign,
  Leaf, Moon, Droplets, Video, Sparkles, ArrowRight, Check,
  BarChart2, MessageCircle, Shield,
} from "lucide-react";

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

const ACTION_ICONS: Record<string, React.ElementType> = {
  workout: Dumbbell, deep_work: Laptop, learning: Brain,
  content_creation: Video, saving: DollarSign, reading: BookOpen,
  meditation: Leaf, sleep: Moon, water: Droplets, promise: Sparkles,
};

const ACTION_COLORS: Record<string, {
  primary: string; glowRgb: string; ringAlpha: string; text: string;
}> = {
  workout:          { primary: "#10b981", glowRgb: "16,185,129",  ringAlpha: "rgba(16,185,129,",   text: "#6ee7b7" },
  deep_work:        { primary: "#6366f1", glowRgb: "99,102,241",  ringAlpha: "rgba(99,102,241,",   text: "#a5b4fc" },
  learning:         { primary: "#3b82f6", glowRgb: "59,130,246",  ringAlpha: "rgba(59,130,246,",   text: "#93c5fd" },
  content_creation: { primary: "#f97316", glowRgb: "249,115,22",  ringAlpha: "rgba(249,115,22,",   text: "#fdba74" },
  saving:           { primary: "#f59e0b", glowRgb: "245,158,11",  ringAlpha: "rgba(245,158,11,",   text: "#fcd34d" },
  reading:          { primary: "#8b5cf6", glowRgb: "139,92,246",  ringAlpha: "rgba(139,92,246,",   text: "#c4b5fd" },
  meditation:       { primary: "#14b8a6", glowRgb: "20,184,166",  ringAlpha: "rgba(20,184,166,",   text: "#5eead4" },
  sleep:            { primary: "#0ea5e9", glowRgb: "14,165,233",  ringAlpha: "rgba(14,165,233,",   text: "#7dd3fc" },
  water:            { primary: "#06b6d4", glowRgb: "6,182,212",   ringAlpha: "rgba(6,182,212,",    text: "#67e8f9" },
  promise:          { primary: "#8b5cf6", glowRgb: "139,92,246",  ringAlpha: "rgba(139,92,246,",   text: "#c4b5fd" },
};

// ─── Particles — memoized so they don't regenerate on re-render ───────────────
function useParticles(count = 14) {
  return useMemo(() => Array.from({ length: count }, (_, i) => {
    // Evenly distributed angles with a small jitter
    const baseAngle = (i / count) * 360;
    const jitter = (Math.sin(i * 127.1) * 0.5 + 0.5) * 24 - 12; // deterministic pseudo-random
    return {
      id: i,
      angle: baseAngle + jitter,
      distance: 100 + (Math.sin(i * 91.3) * 0.5 + 0.5) * 70,
      size: 2.5 + (Math.sin(i * 43.7) * 0.5 + 0.5) * 3.5,
      duration: 0.55 + (Math.sin(i * 61.1) * 0.5 + 0.5) * 0.35,
    };
  }), [count]);
}

function Particles({ color, active }: { color: string; active: boolean }) {
  const particles = useParticles();
  return (
    <AnimatePresence>
      {active && particles.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: "absolute",
            width: p.size, height: p.size,
            borderRadius: "50%",
            background: color,
            top: "50%", left: "50%",
            boxShadow: `0 0 ${p.size * 3}px ${color}88`,
            pointerEvents: "none",
          }}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{
            opacity: 0,
            x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
            y: Math.sin((p.angle * Math.PI) / 180) * p.distance,
            scale: 0.3,
          }}
          transition={{ duration: p.duration, ease: [0.2, 0, 0.6, 1] }}
        />
      ))}
    </AnimatePresence>
  );
}

// ─── Action Orb — cleaner pulse, two rings only ───────────────────────────────
function ActionOrb({
  type, colors, state, onClick,
}: {
  type: string;
  colors: typeof ACTION_COLORS[string];
  state: "idle" | "completing" | "done";
  onClick: () => void;
}) {
  const Icon = ACTION_ICONS[type] ?? Sparkles;
  const glow = `rgba(${colors.glowRgb},`;
  const ring = colors.ringAlpha;

  // Single unified breathe animation — one easing drives all rings
  const breathe = state === "idle"
    ? { scale: [1, 1.05, 1], opacity: [0.45, 0.75, 0.45] }
    : {};
  const breatheTrans = {
    duration: 5, repeat: Infinity, ease: "easeInOut" as const,
  };

  return (
    <div
      style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={state === "idle" ? onClick : undefined}
      role="button"
      aria-label="Complete today's mission"
    >
      {/* Ambient pool — wide, very diffuse */}
      <motion.div
        style={{
          position: "absolute",
          width: 360, height: 360,
          borderRadius: "50%",
          background: `${glow}0.12)`,
          filter: "blur(64px)",
          pointerEvents: "none",
        }}
        animate={state === "completing"
          ? { scale: [1, 2.8, 0.1], opacity: [0.5, 1, 0] }
          : { ...breathe, opacity: [0.3, 0.55, 0.3] }
        }
        transition={state === "completing"
          ? { duration: 0.75, ease: "easeOut" }
          : breatheTrans
        }
      />

      {/* Outer ring — atmospheric, single breath */}
      <motion.div
        style={{
          position: "absolute",
          width: 244, height: 244,
          borderRadius: "50%",
          border: `1px solid ${ring}0.35)`,
          pointerEvents: "none",
        }}
        animate={state === "completing"
          ? { scale: [1, 1.9], opacity: [0.7, 0] }
          : breathe
        }
        transition={state === "completing"
          ? { duration: 0.5, ease: "easeOut" }
          : breatheTrans
        }
      />

      {/* Core orb */}
      <motion.div
        style={{
          position: "relative",
          width: 148, height: 148,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 35%, ${glow}0.22), ${glow}0.06))`,
          border: `1px solid ${ring}0.5)`,
          boxShadow: `0 0 48px ${glow}0.2), 0 0 16px ${glow}0.12), inset 0 1px 0 rgba(255,255,255,0.09)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: state === "idle" ? "pointer" : "default",
        }}
        animate={state === "completing"
          ? { scale: [1, 1.22, 0.7, 1.04, 1], rotate: [0, 8, -6, 2, 0] }
          : state === "done"
          ? { scale: 1, opacity: 0.65 }
          : { scale: [1, 1.025, 1] }
        }
        transition={state === "completing"
          ? { duration: 0.65, ease: [0.34, 1.56, 0.64, 1] }
          : { duration: 5, repeat: Infinity, ease: "easeInOut" }
        }
        whileHover={state === "idle" ? { scale: 1.04 } : {}}
        whileTap={state === "idle" ? { scale: 0.97 } : {}}
      >
        <AnimatePresence mode="wait">
          {state !== "done" ? (
            <motion.div
              key="icon"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.8 }}
              transition={{ duration: 0.25 }}
            >
              <Icon
                style={{ color: colors.text, width: 52, height: 52 }}
                strokeWidth={1.3}
              />
            </motion.div>
          ) : (
            <motion.div
              key="check"
              initial={{ opacity: 0, scale: 0.2 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <Check style={{ color: colors.text, width: 52, height: 52 }} strokeWidth={1.8} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Particles */}
      <Particles color={colors.primary} active={state === "completing"} />
    </div>
  );
}

// ─── Ghost nav — three icon+label pairs, properly weighted ───────────────────
function GhostNav() {
  const items = [
    { icon: BarChart2, label: "Scores" },
    { icon: MessageCircle, label: "Coach" },
    { icon: Shield, label: "Evidence" },
  ];
  return (
    <motion.div
      style={{ display: "flex", alignItems: "center", gap: 32, marginTop: 8 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.4, duration: 0.6 }}
    >
      {items.map(({ icon: Icon, label }) => (
        <button
          key={label}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            background: "none", border: "none", cursor: "pointer", padding: 0,
          }}
        >
          <Icon style={{ width: 14, height: 14, color: "rgba(255,255,255,0.16)" }} strokeWidth={1.5} />
          <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.16em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.16)" }}>
            {label}
          </span>
        </button>
      ))}
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function AltarRefined() {
  const { firstName, streakDays, identityStatement, mission } = USER;
  const colors = ACTION_COLORS[mission.type] ?? ACTION_COLORS.deep_work;

  const [orbState, setOrbState] = useState<"idle" | "completing" | "done">("idle");
  const [showPost, setShowPost] = useState(false);
  const [promise, setPromise] = useState("");
  const [promiseSubmitted, setPromiseSubmitted] = useState(false);

  function handleComplete() {
    setOrbState("completing");
    setTimeout(() => setOrbState("done"), 720);
    setTimeout(() => setShowPost(true), 1900);
  }

  function handleReset() {
    setOrbState("idle");
    setShowPost(false);
    setPromise("");
    setPromiseSubmitted(false);
  }

  const glow = `rgba(${colors.glowRgb},`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        width: "100%",
        overflow: "hidden",
        background: "#07070c",
        fontFamily: "'Inter', -apple-system, sans-serif",
        position: "relative",
        userSelect: "none",
      }}
    >
      {/* Background — fixed so it never scrolls */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 55% 45% at 50% 25%, ${glow}0.14) 0%, transparent 70%)`,
        transition: "background 0.8s ease",
      }} />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <motion.header
        style={{
          position: "relative", zIndex: 10,
          display: "flex", flexDirection: "column", alignItems: "center",
          paddingTop: 48, paddingBottom: 16, paddingLeft: 24, paddingRight: 24,
        }}
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: "easeOut" }}
      >
        {/* Date */}
        <p style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.22em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.25)",
          marginBottom: 10,
        }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>

        {/* Identity statement — the thesis of this screen */}
        <AnimatePresence mode="wait">
          {orbState !== "done" ? (
            <motion.h1
              key="identity"
              style={{
                fontSize: 18, fontWeight: 700, textAlign: "center",
                lineHeight: 1.4, maxWidth: 280,
                color: "rgba(255,255,255,0.78)",
                margin: 0,
              }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.25 } }}
            >
              {identityStatement}
            </motion.h1>
          ) : (
            <motion.h1
              key="done-header"
              style={{
                fontSize: 18, fontWeight: 700, textAlign: "center",
                lineHeight: 1.4, maxWidth: 300,
                color: colors.text, margin: 0,
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              Today's chapter is written, {firstName}.
            </motion.h1>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ── Orb + mission text ─────────────────────────────────────── */}
      <div style={{
        position: "relative", zIndex: 10, flex: 1,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 36, paddingLeft: 24, paddingRight: 24,
      }}>
        <ActionOrb
          type={mission.type}
          colors={colors}
          state={orbState}
          onClick={handleComplete}
        />

        {/* Mission info or completion message */}
        <AnimatePresence mode="wait">
          {orbState !== "done" ? (
            <motion.div
              key="mission-info"
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 0, textAlign: "center",
                maxWidth: 320,
              }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.45, delay: 0.15 }}
            >
              {/* Action label — dominant */}
              <h2 style={{
                fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em",
                color: "rgba(255,255,255,0.93)", margin: 0, marginBottom: 8,
              }}>
                {mission.label}
              </h2>

              {/* Description — subordinate */}
              <p style={{
                fontSize: 13, lineHeight: 1.65,
                color: "rgba(255,255,255,0.38)", margin: 0, marginBottom: 12,
              }}>
                {mission.description}
              </p>

              {/* Identity hook — smallest, most distinctive */}
              <p style={{
                fontSize: 11, fontStyle: "italic",
                color: colors.text, opacity: 0.75,
                margin: 0, letterSpacing: "0.01em",
              }}>
                "{mission.identity}"
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="done-info"
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 12, textAlign: "center",
              }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
            >
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", margin: 0 }}>
                You showed up. That's the whole game.
              </p>

              {/* Streak badge — inherits action color, not always orange */}
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, delay: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "8px 18px", borderRadius: 99,
                  background: `${glow}0.14)`,
                  border: `1px solid ${glow}0.32)`,
                }}
              >
                <Flame style={{ width: 14, height: 14, color: colors.text }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                  {streakDays + 1}-day streak
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom area ──────────────────────────────────────────────── */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 16,
        paddingBottom: 44, paddingLeft: 24, paddingRight: 24,
      }}>
        <AnimatePresence mode="wait">
          {/* CTA button */}
          {orbState === "idle" && (
            <motion.button
              key="cta"
              onClick={handleComplete}
              style={{
                width: "100%", maxWidth: 340, height: 52,
                borderRadius: 16, fontWeight: 700, fontSize: 15,
                letterSpacing: "0.01em",
                background: `linear-gradient(135deg, ${colors.primary}dd, ${colors.primary}99)`,
                boxShadow: `0 0 28px ${glow}0.28), 0 2px 20px rgba(0,0,0,0.45)`,
                border: `1px solid ${glow}0.45)`,
                color: "#fff", cursor: "pointer",
                position: "relative", overflow: "hidden",
              }}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.45, delay: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
              whileHover={{
                scale: 1.025,
                boxShadow: `0 0 44px ${glow}0.38), 0 4px 28px rgba(0,0,0,0.5)`,
              }}
              whileTap={{ scale: 0.97 }}
            >
              {/* Inner highlight */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 1,
                background: "rgba(255,255,255,0.18)", borderRadius: "16px 16px 0 0",
              }} />
              I did this today
            </motion.button>
          )}

          {/* Post-completion: tomorrow's commitment — elevated, not afterthought */}
          {orbState === "done" && showPost && (
            <motion.div
              key="tomorrow"
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 10,
                width: "100%", maxWidth: 340,
              }}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              {/* Label */}
              <p style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.22em",
                textTransform: "uppercase", color: "rgba(255,255,255,0.25)",
                margin: 0,
              }}>
                Tomorrow's Commitment
              </p>

              {/* Input row */}
              <AnimatePresence mode="wait">
                {!promiseSubmitted ? (
                  <motion.div
                    key="input"
                    style={{
                      display: "flex", alignItems: "center",
                      width: "100%", borderRadius: 14, overflow: "hidden",
                      border: `1px solid ${glow}0.22)`,
                      background: `${glow}0.06)`,
                    }}
                    exit={{ opacity: 0, scale: 0.96 }}
                  >
                    <input
                      type="text"
                      placeholder="What will you do tomorrow?"
                      value={promise}
                      onChange={(e) => setPromise(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && promise.trim()) setPromiseSubmitted(true);
                      }}
                      style={{
                        flex: 1, background: "transparent",
                        fontSize: 13, padding: "13px 16px",
                        outline: "none", color: "rgba(255,255,255,0.78)",
                        border: "none",
                      }}
                    />
                    <motion.button
                      onClick={() => promise.trim() && setPromiseSubmitted(true)}
                      disabled={!promise.trim()}
                      style={{
                        padding: "13px 16px",
                        background: "none", border: "none",
                        cursor: promise.trim() ? "pointer" : "default",
                        display: "flex", alignItems: "center",
                        color: promise.trim() ? colors.text : "rgba(255,255,255,0.15)",
                        transition: "color 0.2s",
                      }}
                      whileHover={promise.trim() ? { x: 2 } : {}}
                    >
                      <ArrowRight style={{ width: 16, height: 16 }} />
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="submitted"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 320, damping: 24 }}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "11px 18px", borderRadius: 14,
                      background: `${glow}0.1)`,
                      border: `1px solid ${glow}0.28)`,
                    }}
                  >
                    <Check style={{ width: 14, height: 14, color: colors.text, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: colors.text, opacity: 0.85, fontStyle: "italic" }}>
                      "{promise}"
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={handleReset}
                style={{
                  fontSize: 10, color: "rgba(255,255,255,0.12)",
                  background: "none", border: "none", cursor: "pointer",
                  letterSpacing: "0.08em", marginTop: 2,
                }}
              >
                reset
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ghost nav — icon + label pairs, no text-only buttons */}
        {orbState === "idle" && <GhostNav />}
      </div>
    </div>
  );
}
