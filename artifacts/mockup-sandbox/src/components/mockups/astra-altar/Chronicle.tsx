import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenLine, Check, Lock, ChevronDown } from "lucide-react";

// ─── The Chronicle ────────────────────────────────────────────────────────────
// Design hypothesis: identity is not a score or a streak — it is a story
// being authored one action at a time. The interface is a living manuscript.
// You read who you've been. Then you write today's entry.
//
// Concept:    Authorship / accumulation
// IA:         Prose document → sentence selection → typewriter completion
// Interaction: Read → choose what to add → watch it become permanent
// Contrast:   The Altar = ceremony (one ritual moment)
//             The Chronicle = narrative (one sentence added to a permanent record)

const USER = {
  firstName: "Marcus",
  lastName: "Webb",
  streakDays: 14,
  totalActions: 47,
  joinedMonthsAgo: 2,
};

// Past paragraphs — identity constructed from action history
const PAST_ENTRIES = [
  {
    period: "The Beginning",
    text: "Marcus Webb started building. Quietly, without announcement. He worked out for the first time in months. Then he did it again.",
  },
  {
    period: "The Foundation",
    text: "He established a pattern. Deep work sessions before the world woke up. Books finished. Money set aside. Each action small; each action permanent.",
  },
  {
    period: "The Shift",
    text: "Fourteen days without breaking. Not because it was easy — because he had already decided who he was becoming. The actions followed the identity, not the other way around.",
  },
];

// Today's sentence options — not action buttons, but sentence completions
const ACTION_SENTENCES = [
  {
    type: "workout",
    fragment: "pushed his body when it wanted to rest,",
    completion: " proving that comfort is not the point.",
    color: "#10b981",
  },
  {
    type: "deep_work",
    fragment: "sat down to do the real work —",
    completion: " the kind most people postpone forever.",
    color: "#6366f1",
  },
  {
    type: "reading",
    fragment: "read for an hour before the noise began,",
    completion: " investing in the mind of the person he's becoming.",
    color: "#8b5cf6",
  },
  {
    type: "learning",
    fragment: "learned something that will compound quietly,",
    completion: " invisible now, undeniable later.",
    color: "#3b82f6",
  },
  {
    type: "meditation",
    fragment: "sat in silence and chose clarity over reaction,",
    completion: " the discipline most people never develop.",
    color: "#14b8a6",
  },
  {
    type: "saving",
    fragment: "made a financial decision his future self will recognize,",
    completion: " building wealth in the moments no one sees.",
    color: "#f59e0b",
  },
];

// ─── Typewriter hook ──────────────────────────────────────────────────────────
function useTypewriter(text: string, active: boolean, speed = 28): string {
  const [displayed, setDisplayed] = useState("");
  const idx = useRef(0);

  useEffect(() => {
    if (!active) { setDisplayed(""); idx.current = 0; return; }
    idx.current = 0;
    setDisplayed("");
    const interval = setInterval(() => {
      idx.current += 1;
      setDisplayed(text.slice(0, idx.current));
      if (idx.current >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, active, speed]);

  return displayed;
}

// ─── Blinking cursor ──────────────────────────────────────────────────────────
function Cursor({ visible = true }: { visible?: boolean }) {
  return (
    <motion.span
      animate={visible ? { opacity: [1, 0, 1] } : { opacity: 0 }}
      transition={{ duration: 1, repeat: Infinity, ease: "steps(1)" }}
      style={{
        display: "inline-block",
        width: 2,
        height: "1em",
        background: "rgba(255,255,255,0.55)",
        marginLeft: 2,
        verticalAlign: "text-bottom",
        borderRadius: 1,
      }}
    />
  );
}

// ─── Past paragraph ───────────────────────────────────────────────────────────
function PastEntry({ period, text, delay }: { period: string; text: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      style={{ marginBottom: 24 }}
    >
      <p style={{
        fontSize: 9, fontWeight: 800, letterSpacing: "0.22em",
        textTransform: "uppercase", color: "rgba(255,255,255,0.2)",
        marginBottom: 8, fontFamily: "monospace",
      }}>
        § {period}
      </p>
      <p style={{
        fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,0.55)",
        fontFamily: "'Georgia', 'Times New Roman', serif",
        fontStyle: "italic",
      }}>
        {text}
      </p>
    </motion.div>
  );
}

// ─── Action picker ────────────────────────────────────────────────────────────
function SentencePicker({ onSelect }: { onSelect: (s: typeof ACTION_SENTENCES[number]) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ opacity: 0.8 }}
        whileTap={{ scale: 0.98 }}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 16px", borderRadius: 10,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.5)",
          fontSize: 12, fontWeight: 600, cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        <PenLine style={{ width: 12, height: 12 }} />
        <span>he…</span>
        <ChevronDown style={{ width: 11, height: 11, opacity: 0.5 }} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            style={{
              position: "absolute", top: "calc(100% + 8px)", left: 0,
              width: 340,
              background: "#0e0e1a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
              zIndex: 50,
            }}
          >
            {ACTION_SENTENCES.map((s, i) => (
              <motion.button
                key={s.type}
                onClick={() => { onSelect(s); setOpen(false); }}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ background: "rgba(255,255,255,0.05)" }}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  width: "100%", padding: "12px 16px",
                  background: "transparent", border: "none",
                  borderBottom: i < ACTION_SENTENCES.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  cursor: "pointer", textAlign: "left",
                  transition: "background 0.1s",
                }}
              >
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: s.color, marginTop: 6, flexShrink: 0,
                }} />
                <div>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)",
                    fontFamily: "'Georgia', serif", fontStyle: "italic", lineHeight: 1.5 }}>
                    he {s.fragment}
                  </span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)",
                    fontFamily: "'Georgia', serif", fontStyle: "italic" }}>
                    {s.completion}
                  </span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
type Stage = "reading" | "writing" | "sealed";

export function Chronicle() {
  const [stage, setStage] = useState<Stage>("reading");
  const [chosen, setChosen] = useState<typeof ACTION_SENTENCES[number] | null>(null);
  const [typingDone, setTypingDone] = useState(false);

  // Full sentence to type: "Today, he {fragment}{completion}"
  const fullCompletion = chosen ? chosen.completion : "";
  const typed = useTypewriter(fullCompletion, stage === "writing", 22);

  // When typewriter finishes, pause then seal
  useEffect(() => {
    if (stage !== "writing" || !chosen) return;
    if (typed.length >= fullCompletion.length && fullCompletion.length > 0) {
      const t = setTimeout(() => { setTypingDone(true); }, 600);
      return () => clearTimeout(t);
    }
  }, [typed, stage, chosen, fullCompletion]);

  function handleSelect(s: typeof ACTION_SENTENCES[number]) {
    setChosen(s);
    setStage("writing");
    setTypingDone(false);
  }

  function handleSeal() {
    setStage("sealed");
  }

  function handleReset() {
    setStage("reading");
    setChosen(null);
    setTypingDone(false);
  }

  const todayDate = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080810",
      fontFamily: "'Inter', sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "48px 24px",
      boxSizing: "border-box",
    }}>
      {/* Ambient glow — muted, bookish */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 50% 30% at 50% 0%, rgba(139,92,246,0.05) 0%, transparent 70%)",
      }} />

      <div style={{ width: "100%", maxWidth: 580, position: "relative", zIndex: 1 }}>

        {/* ── Manuscript header ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          style={{ textAlign: "center", marginBottom: 40 }}
        >
          <p style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.35em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.18)",
            fontFamily: "monospace", marginBottom: 8,
          }}>
            The Chronicle of
          </p>
          <h1 style={{
            fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em",
            color: "rgba(255,255,255,0.85)", lineHeight: 1,
          }}>
            {USER.firstName} {USER.lastName}
          </h1>
          <p style={{
            fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 6,
            fontFamily: "monospace", letterSpacing: "0.1em",
          }}>
            {USER.totalActions} entries · {USER.streakDays} days unbroken
          </p>
        </motion.div>

        {/* ── Manuscript body ───────────────────────────────────────── */}
        <div style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 16,
          padding: "36px 40px",
          marginBottom: 24,
        }}>
          {/* Decorative rule */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12, marginBottom: 28,
          }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", letterSpacing: "0.2em", fontFamily: "monospace" }}>
              VOLUME I
            </span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
          </div>

          {/* Past entries */}
          {PAST_ENTRIES.map((e, i) => (
            <PastEntry key={e.period} {...e} delay={i * 0.12} />
          ))}

          {/* Divider before today */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              margin: "28px 0",
            }}
          >
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
            <span style={{
              fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.22em",
              fontFamily: "monospace", textTransform: "uppercase",
            }}>
              {todayDate}
            </span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
          </motion.div>

          {/* Today's entry — being written */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <p style={{
              fontSize: 9, fontWeight: 800, letterSpacing: "0.22em",
              textTransform: "uppercase", color: "rgba(255,255,255,0.2)",
              marginBottom: 12, fontFamily: "monospace",
            }}>
              § Today
            </p>

            <p style={{
              fontSize: 15, lineHeight: 1.85,
              fontFamily: "'Georgia', 'Times New Roman', serif",
              fontStyle: "italic",
              color: "rgba(255,255,255,0.78)",
            }}>
              {stage === "reading" && (
                <>
                  On this day,{" "}
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>
                    {USER.firstName}
                  </span>{" "}
                  <SentencePicker onSelect={handleSelect} />
                  <Cursor />
                </>
              )}

              {(stage === "writing" || stage === "sealed") && chosen && (
                <AnimatePresence mode="wait">
                  <motion.span
                    key="written"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    On this day,{" "}
                    <span style={{ color: "rgba(255,255,255,0.88)" }}>
                      {USER.firstName}
                    </span>{" "}
                    <span style={{ color: chosen.color }}>
                      {chosen.fragment}
                    </span>
                    <span style={{
                      color: "rgba(255,255,255,0.55)",
                    }}>
                      {typed}
                    </span>
                    {stage === "writing" && typed.length < fullCompletion.length && (
                      <Cursor />
                    )}
                    {stage === "sealed" && (
                      <span style={{ color: "rgba(255,255,255,0.2)" }}>
                        {" "}This entry is permanent.
                      </span>
                    )}
                  </motion.span>
                </AnimatePresence>
              )}
            </p>
          </motion.div>
        </div>

        {/* ── Action area below the document ───────────────────────── */}
        <AnimatePresence mode="wait">
          {stage === "reading" && (
            <motion.div
              key="reading-cta"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ delay: 0.7, duration: 0.4 }}
              style={{ textAlign: "center" }}
            >
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", marginBottom: 8 }}>
                Tap "he…" inside the document to write today's entry.
              </p>
              <p style={{
                fontSize: 11, color: "rgba(255,255,255,0.12)",
                fontFamily: "monospace", letterSpacing: "0.1em",
              }}>
                Every sentence is permanent.
              </p>
            </motion.div>
          )}

          {stage === "writing" && typingDone && (
            <motion.div
              key="seal-cta"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
            >
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
                This is who you are today. Seal it.
              </p>
              <motion.button
                onClick={handleSeal}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "12px 28px", borderRadius: 12,
                  background: chosen ? `${chosen.color}22` : "rgba(255,255,255,0.06)",
                  border: `1px solid ${chosen ? chosen.color + "44" : "rgba(255,255,255,0.12)"}`,
                  color: chosen?.color ?? "rgba(255,255,255,0.7)",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >
                <Lock style={{ width: 13, height: 13 }} />
                Seal Today's Entry
              </motion.button>
            </motion.div>
          )}

          {stage === "sealed" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
            >
              {/* Sealed stamp */}
              <motion.div
                initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
                animate={{ scale: 1, rotate: -6, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 6,
                  border: "2px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.25)",
                  fontSize: 11, fontWeight: 900, letterSpacing: "0.3em",
                  textTransform: "uppercase", fontFamily: "monospace",
                }}
              >
                <Check style={{ width: 10, height: 10 }} />
                Sealed · {todayDate}
              </motion.div>

              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
                  Today's chapter is written.
                </p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
                  {USER.totalActions + 1} entries total · {USER.streakDays + 1} days unbroken
                </p>
              </div>

              <button
                onClick={handleReset}
                style={{
                  fontSize: 10, color: "rgba(255,255,255,0.15)",
                  background: "none", border: "none",
                  cursor: "pointer", letterSpacing: "0.1em",
                  fontFamily: "monospace", marginTop: 4,
                }}
              >
                reset demo
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          style={{
            textAlign: "center", fontSize: 10,
            color: "rgba(255,255,255,0.08)",
            fontFamily: "monospace", letterSpacing: "0.12em",
            marginTop: 40,
          }}
        >
          ASTRA · THE CHRONICLE · PRIVATE RECORD
        </motion.p>
      </div>
    </div>
  );
}
