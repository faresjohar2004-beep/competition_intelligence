import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, CheckCircle2, Sparkles, ChevronDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const PROMPTS = [
  {
    key: "q1",
    label: "Today's action",
    question: "What did you do today that your future self would be proud of?",
    placeholder: "I chose to…",
  },
  {
    key: "q2",
    label: "Who you proved you are",
    question: "What kind of person did your actions prove you are today?",
    placeholder: "Through my actions, I proved I am someone who…",
  },
  {
    key: "q3",
    label: "From your future self",
    question: "What would your future self say about how you showed up today?",
    placeholder: "My future self would say…",
  },
];

const MOODS = [
  { score: 1, emoji: "😔", label: "Struggling" },
  { score: 2, emoji: "😕", label: "Below par" },
  { score: 3, emoji: "😐", label: "Okay" },
  { score: 4, emoji: "🙂", label: "Good" },
  { score: 5, emoji: "🔥", label: "On fire" },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function MoodEmoji({ score }: { score?: number | null }) {
  return <span>{MOODS.find((m) => m.score === score)?.emoji ?? "🙂"}</span>;
}

export default function Reflections() {
  const qc = useQueryClient();

  const { data: todayData, isLoading: checkingToday } = useQuery({
    queryKey: ["reflections", "today"],
    queryFn: () => apiFetch("/reflections/today"),
    staleTime: 30_000,
  });

  const { data: historyData } = useQuery({
    queryKey: ["reflections", "history"],
    queryFn: () => apiFetch("/reflections"),
    staleTime: 60_000,
  });

  const createReflection = useMutation({
    mutationFn: (data: object) =>
      apiFetch("/reflections", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reflections"] });
      setSaved(true);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Reflection didn't save",
        description: "That didn't go through — your answers are still here, try again.",
      });
    },
  });

  const [answers, setAnswers] = useState<Record<string, string>>({ q1: "", q2: "", q3: "" });
  const [mood, setMood] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  const hasReflectedToday = todayData?.reflected === true;
  const todayReflection = todayData?.reflection;
  const history = (historyData?.reflections ?? []) as any[];
  const pastReflections = hasReflectedToday ? history.slice(1) : history;

  const canSave = mood !== null && (answers.q1.trim() || answers.q2.trim() || answers.q3.trim());

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Reflection Journal</h1>
            <p className="text-muted-foreground text-sm">Know yourself. Grow yourself. Build the evidence.</p>
          </div>
        </div>

        {/* ── Today's reflection ── */}
        {checkingToday ? (
          <div className="h-64 rounded-2xl bg-card animate-pulse" />
        ) : hasReflectedToday ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex-1">Today's Reflection Complete</p>
              <span className="text-2xl"><MoodEmoji score={todayReflection?.moodScore} /></span>
            </div>
            {todayReflection?.q1 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">What I did</p>
                <p className="text-sm text-white">{todayReflection.q1}</p>
              </div>
            )}
            {todayReflection?.q2 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Who I proved I am</p>
                <p className="text-sm text-white">{todayReflection.q2}</p>
              </div>
            )}
            {todayReflection?.q3 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">From my future self</p>
                <p className="text-sm text-white italic">"{todayReflection.q3}"</p>
              </div>
            )}
          </motion.div>
        ) : saved ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-primary/25 bg-primary/5 p-10 text-center"
          >
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
            <h2 className="text-xl font-black text-white mb-2">Reflection Saved</h2>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Self-awareness is evidence. Your future self is watching.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/8 bg-card p-6 space-y-6"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary/70 mb-1">Daily Identity Reflection</p>
              <h2 className="text-xl font-black text-white">How did you show up today?</h2>
            </div>

            {/* Mood */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">How are you feeling?</p>
              <div className="flex gap-2">
                {MOODS.map(({ score, emoji, label }) => (
                  <button
                    key={score}
                    onClick={() => setMood(score)}
                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
                      mood === score
                        ? "border-primary/50 bg-primary/10"
                        : "border-white/8 bg-white/3 hover:border-white/15"
                    }`}
                  >
                    <span className="text-xl">{emoji}</span>
                    <span className="text-[10px] text-muted-foreground/50 hidden sm:block">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompts */}
            {PROMPTS.map(({ key, label, question, placeholder }) => (
              <div key={key}>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60 mb-1">{label}</p>
                <p className="text-sm font-medium text-white mb-2">{question}</p>
                <textarea
                  value={answers[key]}
                  onChange={(e) => setAnswers((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/8 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/30 transition-colors resize-none"
                />
              </div>
            ))}

            <button
              onClick={() =>
                createReflection.mutate({ ...answers, moodScore: mood, type: "daily" })
              }
              disabled={!canSave || createReflection.isPending}
              className="w-full h-12 rounded-xl bg-primary/15 border border-primary/25 text-primary font-bold text-sm hover:bg-primary/25 transition-all disabled:opacity-30"
            >
              {createReflection.isPending ? "Saving…" : "Complete Reflection →"}
            </button>
          </motion.div>
        )}

        {/* ── Past reflections ── */}
        {pastReflections.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/40 mb-3">Past Reflections</p>
            <div className="space-y-2">
              {pastReflections.map((r: any) => (
                <div key={r.id} className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
                  <button
                    onClick={() => setOpenId(openId === r.id ? null : r.id)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/3 transition-colors text-left"
                  >
                    <span className="text-xl shrink-0"><MoodEmoji score={r.moodScore} /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{formatDate(r.createdAt)}</p>
                      {r.q1 && (
                        <p className="text-xs text-muted-foreground/50 truncate mt-0.5">{r.q1}</p>
                      )}
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground/40 shrink-0 transition-transform ${
                        openId === r.id ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {openId === r.id && (
                      <motion.div
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-3 border-t border-white/5 space-y-3">
                          {r.q1 && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 mb-1">What I did</p>
                              <p className="text-sm text-white">{r.q1}</p>
                            </div>
                          )}
                          {r.q2 && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 mb-1">Who I proved I am</p>
                              <p className="text-sm text-white">{r.q2}</p>
                            </div>
                          )}
                          {r.q3 && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 mb-1">From my future self</p>
                              <p className="text-sm text-white italic">"{r.q3}"</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty past state */}
        {!checkingToday && !hasReflectedToday && !saved && pastReflections.length === 0 && (
          <p className="text-center text-xs text-muted-foreground/30 py-4">
            Your first reflection becomes permanent evidence. Start now.
          </p>
        )}
      </div>
    </AppLayout>
  );
}
