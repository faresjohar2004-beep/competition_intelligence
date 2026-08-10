import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import AppLayout from "@/components/layout/AppLayout";
import {
  useGetMe, useGetFutureSelf, useGetTodayActions, useGetCurrentChapter, useGetUserStats,
  useLogAction, useGetActions, useUpdateMe, getGetMeQueryKey,
  getGetTodayActionsQueryKey, getGetFutureSelfQueryKey, getGetUserStatsQueryKey, getGetActionsQueryKey,
  useGetLatestLetter, useGenerateBiographyEntry, getGetBiographyQueryKey,
} from "@workspace/api-client-react";
import { useAlignment, useMissions, useCompleteMission } from "@/hooks/useMissions";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Target, Trophy, Flame, Shield, Skull, ArrowRight, AlertTriangle,
  CheckCircle, Star, Dumbbell, BookOpen, Brain, Video, Leaf, DollarSign, PenLine,
  Laptop, Moon, Droplets, CheckCircle2, Sparkles, X, ChevronRight, Calendar, Share2, Bell, BellOff, Mail,
  TrendingUp,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Action config (shared with Actions page) ────────────────────────────────
const ACTION_CONFIG = [
  { type: "workout",          label: "Workout",          icon: Dumbbell,   color: "emerald", impact: "+2% Health, +1% Discipline",   identity: "You are someone who refuses to let their body fail them." },
  { type: "deep_work",        label: "Deep Work",        icon: Laptop,     color: "indigo",  impact: "+2% Discipline, +1.5% Wealth",  identity: "You are someone who does the real work." },
  { type: "learning",         label: "Learning",         icon: Brain,      color: "blue",    impact: "+2% Knowledge, +1% Wealth",     identity: "You are someone who invests in their future every single day." },
  { type: "content_creation", label: "Content Creation", icon: Video,      color: "orange",  impact: "+2% Confidence, +1.5% Wealth",  identity: "You are someone who creates value in the world." },
  { type: "saving",           label: "Saving Money",     icon: DollarSign, color: "amber",   impact: "+2% Wealth, +1% Discipline",    identity: "You are someone who builds wealth with intention." },
  { type: "reading",          label: "Reading",          icon: BookOpen,   color: "violet",  impact: "+1.5% Knowledge",               identity: "You are someone who never stops growing." },
  { type: "meditation",       label: "Meditation",       icon: Leaf,       color: "teal",    impact: "+1.5% Discipline",              identity: "You are someone who masters their own mind." },
  { type: "sleep",            label: "Sleep",            icon: Moon,       color: "sky",     impact: "+1.5% Health",                  identity: "You are someone who plays the long game." },
  { type: "water",            label: "Water Intake",     icon: Droplets,   color: "cyan",    impact: "+1% Health",                    identity: "You are someone who takes care of their body." },
  { type: "promise",          label: "Promise Kept",     icon: Sparkles,   color: "violet",  impact: "+1.5% Discipline, +1.5% Confidence", identity: "You are someone who keeps their word to themselves." },
];

const COLOR_MAP: Record<string, { text: string; bg: string; ring: string; border: string }> = {
  emerald: { text: "text-emerald-400", bg: "bg-emerald-500/10", ring: "from-emerald-500 to-teal-400",   border: "border-emerald-500/30" },
  indigo:  { text: "text-indigo-400",  bg: "bg-indigo-500/10",  ring: "from-indigo-500 to-violet-400",  border: "border-indigo-500/30" },
  blue:    { text: "text-blue-400",    bg: "bg-blue-500/10",    ring: "from-blue-500 to-cyan-400",      border: "border-blue-500/30" },
  orange:  { text: "text-orange-400",  bg: "bg-orange-500/10",  ring: "from-orange-500 to-amber-400",   border: "border-orange-500/30" },
  amber:   { text: "text-amber-400",   bg: "bg-amber-500/10",   ring: "from-amber-500 to-yellow-400",   border: "border-amber-500/30" },
  violet:  { text: "text-violet-400",  bg: "bg-violet-500/10",  ring: "from-violet-500 to-purple-400",  border: "border-violet-500/30" },
  teal:    { text: "text-teal-400",    bg: "bg-teal-500/10",    ring: "from-teal-500 to-emerald-400",   border: "border-teal-500/30" },
  sky:     { text: "text-sky-400",     bg: "bg-sky-500/10",     ring: "from-sky-500 to-blue-400",       border: "border-sky-500/30" },
  cyan:    { text: "text-cyan-400",    bg: "bg-cyan-500/10",    ring: "from-cyan-500 to-sky-400",       border: "border-cyan-500/30" },
};

// ─── Daily Briefing ──────────────────────────────────────────────────────────
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type BriefingTier = {
  word: string;
  wordColor: string;
  headlines: string[];
  bodies: string[];
  nextMilestone: number;
  milestoneLabel: string;
};

// ─── Score gain map (numeric, per action type) ───────────────────────────────
type ScoreDim = "health" | "wealth" | "discipline" | "knowledge" | "confidence";
const SCORE_GAINS: Record<string, Partial<Record<ScoreDim, number>>> = {
  workout:          { health: 2,    discipline: 1            },
  deep_work:        { discipline: 2, wealth: 1.5             },
  learning:         { knowledge: 2,  wealth: 1              },
  content_creation: { confidence: 2, wealth: 1.5            },
  saving:           { wealth: 2,    discipline: 1            },
  reading:          { knowledge: 1.5                        },
  meditation:       { discipline: 1.5                       },
  sleep:            { health: 1.5                           },
  water:            { health: 1                             },
  promise:          { discipline: 1.5, confidence: 1.5      },
};

// ─── Today's Gains Bar ────────────────────────────────────────────────────────
// Compact animated summary of cumulative score gains from today's logged actions.
// Closes the "Build Evidence" gap — users see exactly what today constructed.
function TodayGainsBar({ gains }: { gains: Record<ScoreDim, number> }) {
  const DIMS: { key: ScoreDim; label: string; textColor: string; borderColor: string; bgColor: string; icon: React.ElementType }[] = [
    { key: "health",     label: "Health",     textColor: "text-emerald-400", borderColor: "border-emerald-500/20", bgColor: "bg-emerald-500/8",  icon: Dumbbell   },
    { key: "wealth",     label: "Wealth",     textColor: "text-amber-400",   borderColor: "border-amber-500/20",   bgColor: "bg-amber-500/8",    icon: DollarSign },
    { key: "discipline", label: "Discipline", textColor: "text-blue-400",    borderColor: "border-blue-500/20",    bgColor: "bg-blue-500/8",     icon: Shield     },
    { key: "knowledge",  label: "Knowledge",  textColor: "text-violet-400",  borderColor: "border-violet-500/20",  bgColor: "bg-violet-500/8",   icon: Brain      },
    { key: "confidence", label: "Confidence", textColor: "text-orange-400",  borderColor: "border-orange-500/20",  bgColor: "bg-orange-500/8",   icon: Zap        },
  ];

  const active = DIMS.filter(d => (gains[d.key] ?? 0) > 0);
  if (active.length === 0) return null;

  const totalGain = active.reduce((sum, d) => sum + (gains[d.key] ?? 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="rounded-2xl border border-white/6 bg-card/60 px-5 py-4 mt-5"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">Today's Gains</p>
        <span className="text-[10px] font-bold text-white/20">
          +{totalGain % 1 === 0 ? totalGain : totalGain.toFixed(1)}% total
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {active.map((d, i) => {
          const val = gains[d.key] ?? 0;
          return (
            <motion.div
              key={d.key}
              initial={{ opacity: 0, scale: 0.82 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.08 + i * 0.07, type: "spring", stiffness: 380, damping: 22 }}
              className={`flex items-center gap-1.5 rounded-xl border ${d.borderColor} ${d.bgColor} px-3 py-2`}
            >
              <d.icon className={`w-3 h-3 ${d.textColor} shrink-0`} />
              <span className={`text-xs font-black ${d.textColor}`}>
                +{val % 1 === 0 ? val : val.toFixed(1)}%
              </span>
              <span className="text-xs text-white/35">{d.label}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function getBriefingTier(streakDays: number): BriefingTier {
  if (streakDays === 0) return {
    word: "BEGIN", wordColor: "text-white",
    headlines: [
      "Every legend started with day one.",
      "The person you want to be starts right now.",
      "Today is not ordinary. It's the beginning.",
    ],
    bodies: [
      "History's most consistent people didn't start with a perfect plan. They started with one decision. Make yours today.",
      "The gap between who you are and who you want to be closes with a single action. Log your first one today.",
      "You are here. That already separates you from the version of yourself who stayed comfortable.",
    ],
    nextMilestone: 3, milestoneLabel: "3-day foundation",
  };
  if (streakDays < 4) return {
    word: "COMMIT", wordColor: "text-blue-400",
    headlines: [
      `Day ${streakDays}. The foundation is being laid.`,
      `You showed up ${streakDays} day${streakDays > 1 ? "s" : ""}. Most people don't.`,
      `${streakDays} day${streakDays > 1 ? "s" : ""}. This is where quitters stop.`,
    ],
    bodies: [
      "The first three days are hardest. Your brain is building new neural pathways. Every action is rewiring who you are.",
      "Most people quit before their habits have time to form. Commitment is what separates intention from identity.",
      "You're in the window where giving up feels easiest. Push through and the resistance starts to disappear.",
    ],
    nextMilestone: 7, milestoneLabel: "7-day streak",
  };
  if (streakDays < 8) return {
    word: "MOMENTUM", wordColor: "text-primary",
    headlines: [
      `${streakDays} days in. You're building real momentum.`,
      `One week. The habit is starting to stick.`,
      `${streakDays} consecutive days of kept promises.`,
    ],
    bodies: [
      "At this stage, the behavior starts becoming automatic. You're no longer forcing it — you're becoming it.",
      "A week of consistent action does something permanent to your identity. The person who didn't show up is fading.",
      "Momentum is powerful because it builds on itself. Every day you continue makes tomorrow's action easier.",
    ],
    nextMilestone: 14, milestoneLabel: "14-day streak",
  };
  if (streakDays < 15) return {
    word: "IDENTITY", wordColor: "text-violet-400",
    headlines: [
      `${streakDays} days. You're not the same person who started.`,
      `Two weeks of consistency. Your identity is shifting.`,
      `${streakDays} days of proof that you're someone who shows up.`,
    ],
    bodies: [
      "At 14+ days, research shows the behavior begins to feel like part of who you are — not something you do, but someone you are.",
      "You have two weeks of evidence that you're the person you said you'd be. That evidence is permanent.",
      "Identity change isn't sudden — it's the accumulation of daily proof. You're 14+ days deep into a new story.",
    ],
    nextMilestone: 30, milestoneLabel: "30-day streak",
  };
  if (streakDays < 31) return {
    word: "RARE", wordColor: "text-amber-400",
    headlines: [
      `${streakDays} days. You're in rare company.`,
      `Most people only dream of a ${streakDays}-day streak.`,
      `${streakDays} consecutive kept promises. This is who you are now.`,
    ],
    bodies: [
      "Studies show fewer than 8% of people maintain a streak past two weeks. You're in that group. Own it.",
      "At this stage, you're not building habits — you're living them. The version of you who couldn't stay consistent is a stranger now.",
      "Your future self isn't a projection anymore. They're the logical conclusion of the evidence you've been building daily.",
    ],
    nextMilestone: 60, milestoneLabel: "60-day streak",
  };
  if (streakDays < 61) return {
    word: "FORGED", wordColor: "text-orange-400",
    headlines: [
      `${streakDays} days. You've built something real.`,
      `A 30+ day streak isn't motivation. It's identity.`,
      `${streakDays} days. This version of you is permanent.`,
    ],
    bodies: [
      "Thirty days of consistent action is not a phase — it's a new baseline. This level of discipline is now your floor, not your ceiling.",
      "The person who started this journey couldn't have imagined being here. That's proof of transformation.",
      "You're no longer proving something. You've already proven it. Now you're just living as who you became.",
    ],
    nextMilestone: 90, milestoneLabel: "90-day streak",
  };
  return {
    word: "LEGEND", wordColor: "text-emerald-400",
    headlines: [
      `${streakDays} days. You are the rare few.`,
      `${streakDays}-day streak. Most people never get here.`,
      `${streakDays} days of unbroken commitment. You are forged.`,
    ],
    bodies: [
      "90 days of consistent action is a life transformation, not a habit. You've rewritten who you are at a cellular level.",
      "A 90+ day streak puts you in the top 1% of every self-improvement system ever built. This isn't motivation — it's mastery.",
      "You didn't find motivation. You became disciplined. There's a profound difference, and you're living it.",
    ],
    nextMilestone: streakDays + 30, milestoneLabel: `${streakDays + 30}-day streak`,
  };
}

// Per-action-type personalized body copy for DailyBriefing.
// Each function takes the weekly count and returns a domain-specific motivational line.
const ACTION_BRIEFING_BODY: Record<string, (n: number) => string> = {
  workout:          (n) => `${n} workout${n > 1 ? "s" : ""} this week. Your body is the foundation everything else is built on — and you're actively building it.`,
  deep_work:        (n) => `${n} deep work session${n > 1 ? "s" : ""} this week. Focus is your compound interest. Every session widens the gap between you and the distracted majority.`,
  reading:          (n) => `${n} reading session${n > 1 ? "s" : ""} this week. Every page is a deposit into the mind of the person you're becoming.`,
  learning:         (n) => `${n} learning session${n > 1 ? "s" : ""} this week. Knowledge compounds. You're investing in the version of yourself who shows up a year from now.`,
  meditation:       (n) => `${n} meditation session${n > 1 ? "s" : ""} this week. Mental clarity is a performance multiplier most people ignore. You don't.`,
  content_creation: (n) => `${n} creation session${n > 1 ? "s" : ""} this week. You're building a body of work, an audience, a legacy — one piece at a time.`,
  saving:           (n) => `${n} saving action${n > 1 ? "s" : ""} this week. Wealth is built in the quiet moments no one sees. Your future self is watching.`,
  sleep:            (n) => `${n} recovery session${n > 1 ? "s" : ""} this week. Sleep is the hidden variable that elite performers protect. You get it.`,
  water:            (n) => `${n} hydration check${n > 1 ? "s" : ""} this week. The smallest disciplines stack into elite performance over time.`,
};

function DailyBriefing({
  firstName,
  streakDays,
  actionsToday,
  alignScore,
  tomorrowPromise,
  dominantActionType,
  weeklyActionCount,
}: {
  firstName: string;
  streakDays: number;
  actionsToday: number;
  alignScore: number;
  tomorrowPromise?: string | null;
  dominantActionType?: string | null;
  weeklyActionCount?: number;
}) {
  const now = new Date();
  const dayName = DAY_NAMES[now.getDay()];
  const hour = now.getHours();
  const dateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`; // stable per day

  // Use dateKey as a seed for stable-per-day variation
  const seed = dateKey.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const tier = getBriefingTier(streakDays);
  const headlineIdx = seed % tier.headlines.length;
  const bodyIdx = (seed + 1) % tier.bodies.length;

  const headline = tier.headlines[headlineIdx];
  const genericBody = tier.bodies[bodyIdx];

  // If the user has weekly activity data, replace the generic body with a personalized
  // domain-specific line that makes ASTRA feel like it's actually watching their progress.
  const body = (dominantActionType && weeklyActionCount && weeklyActionCount > 0)
    ? (ACTION_BRIEFING_BODY[dominantActionType]?.(weeklyActionCount) ?? genericBody)
    : genericBody;

  // Progress to next milestone
  const progressToNext = Math.min((streakDays / tier.nextMilestone) * 100, 100);

  // Time-based opening
  const opening = hour < 5 ? "Burning the midnight oil" : hour < 12 ? "Good morning" : hour < 17 ? "This afternoon" : hour < 20 ? "This evening" : "Tonight";

  // Streak already protected today?
  const protected_ = actionsToday > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-white/8 bg-gradient-to-r from-white/[0.03] to-transparent px-5 py-5 relative overflow-hidden"
    >
      {/* Subtle glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-start justify-between gap-4 relative z-10">
        <div className="flex-1 min-w-0">
          {/* Label row */}
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3 h-3 text-primary/60" />
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary/60">
              Daily Briefing · {dayName}
            </p>
            {protected_ && (
              <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-2.5 h-2.5" /> Protected
              </span>
            )}
          </div>

          {/* Greeting */}
          <p className="text-xs text-muted-foreground/60 mb-1">{opening}, {firstName}.</p>

          {/* Headline */}
          <h2 className="text-lg sm:text-xl font-black text-white leading-snug mb-2">
            {headline}
          </h2>

          {/* Body */}
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
            {body}
          </p>

          {/* Yesterday's Promise callout — shows before first action of day */}
          {tomorrowPromise && actionsToday === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-3 flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5"
            >
              <div className="shrink-0 w-4 h-4 rounded-full bg-emerald-500/25 border border-emerald-500/35 flex items-center justify-center mt-0.5">
                <ArrowRight className="w-2 h-2 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/60 mb-0.5">Yesterday's Promise</p>
                <p className="text-sm font-bold text-white leading-snug">{tomorrowPromise}</p>
              </div>
            </motion.div>
          )}

          {/* Progress to next milestone */}
          {streakDays > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden max-w-[200px]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressToNext}%` }}
                  transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full"
                />
              </div>
              <span className="text-xs text-muted-foreground/60 whitespace-nowrap">
                {streakDays}/{tier.nextMilestone} → {tier.milestoneLabel}
              </span>
            </div>
          )}
        </div>

        {/* Word of the day badge */}
        <div className="shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-2xl border border-white/8 bg-white/3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1.5 leading-none">Today</p>
          <p className={`text-sm font-black leading-none ${tier.wordColor}`}>{tier.word}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Celebration Burst — shared micro-interaction ────────────────────────────
function CelebrationBurst({ color = "#7c3aed" }: { color?: string }) {
  const particles = useMemo(() => Array.from({ length: 10 }, (_, i) => ({
    id: i,
    angle: (i / 10) * Math.PI * 2,
    dist: 40 + Math.random() * 30,
  })), []);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible flex items-center justify-center z-20">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ opacity: 1, x: 0, y: 0, scale: 0 }}
          animate={{
            opacity: 0,
            x: Math.cos(p.angle) * p.dist,
            y: Math.sin(p.angle) * p.dist,
            scale: 1,
          }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

// ─── Command Stats Bar — the 4 headline numbers, leading the dashboard ───────
function CommandStatsBar({
  alignScore,
  identityScore,
  streakDays,
  promiseStreak,
}: {
  alignScore: number;
  identityScore: number;
  streakDays: number;
  promiseStreak: number;
}) {
  const tiles = [
    {
      label: "Future Alignment",
      value: `${alignScore}%`,
      icon: Target,
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
      sub: "How aligned today is",
    },
    {
      label: "Identity Score",
      value: `${identityScore}%`,
      icon: Shield,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      sub: "Who you're becoming",
    },
    {
      label: "Current Streak",
      value: `${streakDays}`,
      icon: Flame,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      sub: streakDays === 1 ? "day" : "days",
    },
    {
      label: "Promise Streak",
      value: `${promiseStreak}d`,
      icon: Sparkles,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
      border: "border-violet-500/20",
      sub: promiseStreak === 0 ? "Keep your promise" : promiseStreak === 1 ? "kept in a row" : "kept in a row",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {tiles.map((t, i) => (
        <motion.div
          key={t.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 + i * 0.05 }}
          className={`rounded-2xl border ${t.border} ${t.bg} p-4 relative overflow-hidden`}
        >
          <div className="flex items-center gap-2 mb-2">
            <t.icon className={`w-3.5 h-3.5 ${t.color} shrink-0`} />
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40 truncate">{t.label}</p>
          </div>
          <p className={`text-2xl font-black leading-none ${t.color}`}>{t.value}</p>
          <p className="text-[10px] text-white/25 mt-1.5 truncate">{t.sub}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── Today's Promise Card — the single daily commitment ──────────────────────
function TodaysPromiseCard({
  promiseText,
  isCompleted,
  isLoading,
  onKeep,
  isPending,
  alignScore,
}: {
  promiseText: string | null;
  isCompleted: boolean;
  isLoading: boolean;
  onKeep: () => void;
  isPending: boolean;
  alignScore: number;
}) {
  const [justCompleted, setJustCompleted] = useState(false);

  const handleClick = useCallback(() => {
    setJustCompleted(true);
    onKeep();
    setTimeout(() => setJustCompleted(false), 1400);
  }, [onKeep]);

  if (isLoading) {
    return <div className="h-40 rounded-3xl border border-white/5 bg-white/[0.02] animate-pulse" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 }}
      className={`rounded-3xl border p-6 sm:p-7 relative overflow-hidden ${
        isCompleted
          ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/8 via-[#0d1017] to-[#0a0c14]"
          : "border-primary/25 bg-gradient-to-br from-primary/8 via-[#0d1017] to-[#0a0c14]"
      }`}
    >
      <div className={`absolute top-0 right-0 w-56 h-56 rounded-full blur-3xl pointer-events-none ${
        isCompleted ? "bg-emerald-500/8" : "bg-primary/10"
      }`} />
      <AnimatePresence>{justCompleted && <CelebrationBurst color={isCompleted ? "#34d399" : "#7c3aed"} />}</AnimatePresence>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${
            isCompleted ? "bg-emerald-500/20 border-emerald-500/40" : "bg-primary/20 border-primary/40"
          }`}>
            {isCompleted
              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              : <Sparkles className="w-3.5 h-3.5 text-primary" />}
          </div>
          <p className={`text-xs font-bold uppercase tracking-[0.25em] ${isCompleted ? "text-emerald-400" : "text-primary/80"}`}>
            Today's Promise
          </p>
        </div>

        <AnimatePresence mode="wait">
          {isCompleted ? (
            <motion.div key="done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-snug mb-3">
                Promise kept. You are who you said you'd be.
              </h2>
              <p className="text-sm text-emerald-300/70 italic mb-5">"{promiseText}"</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
                  +1.5% Discipline
                </span>
                <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
                  +1.5% Confidence
                </span>
                <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/15 border border-primary/25 text-primary">
                  {alignScore}% Aligned
                </span>
                <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/8 border border-white/10 text-white/70">
                  Identity Strengthened
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div key="pending" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-snug mb-2">
                {promiseText ?? "Set your first promise by logging an action."}
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                One commitment. Total focus. Keep it and prove who you're becoming.
              </p>
              <button
                onClick={handleClick}
                disabled={isPending || !promiseText}
                className="h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center gap-2"
              >
                {isPending ? "Sealing…" : "Keep My Promise"}
                {!isPending && <ArrowRight className="w-4 h-4" />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Identity Progress Card — trait bars ─────────────────────────────────────
function IdentityProgressCard({
  consistency,
  discipline,
  focus,
}: {
  consistency: number;
  discipline: number;
  focus: number;
}) {
  const traits = [
    { label: "Consistency", value: consistency, icon: Flame, color: "from-orange-500 to-amber-400", text: "text-orange-400" },
    { label: "Discipline", value: discipline, icon: Shield, color: "from-blue-500 to-cyan-400", text: "text-blue-400" },
    { label: "Focus", value: focus, icon: Brain, color: "from-violet-500 to-purple-400", text: "text-violet-400" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="rounded-3xl border border-white/5 bg-gradient-to-br from-[#0f0f1a] via-[#0d1017] to-[#0a0c14] p-6 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(124,58,237,0.06),transparent_60%)]" />
      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-white/60" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/40">Identity Progress</p>
            <p className="text-xs font-bold text-white leading-none mt-0.5">The traits you're building</p>
          </div>
        </div>

        <div className="space-y-4">
          {traits.map((t, i) => (
            <div key={t.label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <t.icon className={`w-3.5 h-3.5 ${t.text}`} />
                  <span className="text-sm font-bold text-white">{t.label}</span>
                </div>
                <span className={`text-sm font-black ${t.text}`}>{Math.round(t.value)}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(2, Math.min(100, t.value))}%` }}
                  transition={{ duration: 0.9, delay: 0.2 + i * 0.1, ease: "easeOut" }}
                  className={`h-full rounded-full bg-gradient-to-r ${t.color}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Reflection Unlock Card — end-of-day identity capture ────────────────────
const REFLECTION_UNLOCK_PROMPTS = [
  { key: "q1", label: "Today's action", question: "What did you do today that your future self would be proud of?" },
  { key: "q2", label: "Who you proved you are", question: "What kind of person did your actions prove you are today?" },
  { key: "q3", label: "From your future self", question: "What would your future self say about how you showed up today?" },
];

function ReflectionUnlockCard({ onSubmitted }: { onSubmitted: () => void }) {
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({ q1: "", q2: "", q3: "" });
  const [saved, setSaved] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/api/reflections`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...answers, moodScore: 5, type: "daily" }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["reflections"] });
      qc.invalidateQueries({ queryKey: getGetTodayActionsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetFutureSelfQueryKey() });
      onSubmitted();
    },
  });

  const canSave = answers.q1.trim() || answers.q2.trim() || answers.q3.trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4 }}
      className="rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-500/8 via-[#0d1017] to-[#0a0c14] p-6 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-56 h-56 bg-amber-400/8 rounded-full blur-3xl pointer-events-none" />
      <AnimatePresence>{saved && <CelebrationBurst color="#fbbf24" />}</AnimatePresence>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-amber-400" />
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
            Today's Reflection Unlocked
          </p>
        </div>

        {saved ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4 text-center">
            <Sparkles className="w-7 h-7 text-amber-400 mx-auto mb-2" />
            <p className="text-base font-black text-white">Day sealed. Identity strengthened.</p>
            <p className="text-sm text-muted-foreground mt-1">This reflection is now permanent proof — added to your timeline.</p>
          </motion.div>
        ) : (
          <>
            <h3 className="text-lg font-black text-white mb-1.5 leading-snug">
              All promises kept today. Lock it in.
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              You finished everything you set out to do. Take two minutes to capture who that makes you.
            </p>
            <div className="space-y-3">
              {REFLECTION_UNLOCK_PROMPTS.map((p) => (
                <div key={p.key}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/70 mb-1">{p.label}</p>
                  <textarea
                    value={answers[p.key]}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [p.key]: e.target.value }))}
                    placeholder={p.question}
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-amber-400/15 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-amber-400/40 transition-colors resize-none"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => submit.mutate()}
              disabled={!canSave || submit.isPending}
              className="mt-4 w-full h-11 rounded-xl bg-amber-500/20 border border-amber-400/35 text-amber-300 font-bold text-sm hover:bg-amber-500/30 transition-all disabled:opacity-30"
            >
              {submit.isPending ? "Sealing the day…" : "Complete Today's Reflection →"}
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Score / streak helpers ──────────────────────────────────────────────────
const SCORE_COLORS = [
  { from: 0,  to: 40,  color: "text-red-400",     ring: "from-red-500 to-red-600" },
  { from: 40, to: 65,  color: "text-amber-400",   ring: "from-amber-500 to-orange-500" },
  { from: 65, to: 80,  color: "text-blue-400",    ring: "from-blue-500 to-cyan-500" },
  { from: 80, to: 101, color: "text-emerald-400", ring: "from-emerald-500 to-teal-500" },
];
function getScoreColor(score: number) {
  return SCORE_COLORS.find((c) => score >= c.from && score < c.to) ?? SCORE_COLORS[SCORE_COLORS.length - 1];
}

function AlignmentOrb({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 72;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center justify-center relative">
      <svg className="w-52 h-52 -rotate-90" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="72" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/5" />
        <circle cx="80" cy="80" r="72" fill="none" stroke="url(#alignGrad)" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 drop-shadow-[0_0_12px_rgba(124,58,237,0.6)]" />
        <defs>
          <linearGradient id="alignGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-black text-white leading-none">{score}%</span>
        <span className="text-xs font-bold text-primary/80 uppercase tracking-widest mt-1">Aligned</span>
      </div>
    </div>
  );
}

type StreakState = "zero" | "comeback" | "unprotected" | "safe" | "legendary";
function getStreakState(streakDays: number, actionsToday: number, hasHistory = false): StreakState {
  if (streakDays === 0 && actionsToday === 0 && hasHistory) return "comeback";
  if (streakDays === 0 && actionsToday === 0) return "zero";
  if (actionsToday === 0) return "unprotected";
  if (actionsToday >= 6) return "legendary";
  return "safe";
}

// ─── Streak Recovery Card ─────────────────────────────────────────────────────
function StreakRecoveryCard({
  streakDays,
  onFreeze,
  onDismiss,
  isPending,
}: {
  streakDays: number;
  onFreeze: () => void;
  onDismiss: () => void;
  isPending: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-amber-500/35 bg-amber-500/6 p-5 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[11px]">
            🧊
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400">
            Streak Freeze Available
          </p>
        </div>

        {/* Headline */}
        <h3 className="text-base sm:text-lg font-black text-white mb-1.5 leading-snug">
          Your {streakDays}-day streak ends here — unless you freeze it.
        </h3>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          You missed yesterday. Log today without a freeze and your {streakDays}-day streak resets to&nbsp;1.
          Apply your freeze now, then log today — and your streak continues.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={onFreeze}
            disabled={isPending}
            className="flex-1 h-11 rounded-xl bg-amber-500/20 border border-amber-500/35 text-amber-300 font-bold text-sm hover:bg-amber-500/30 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {isPending ? (
              "Applying…"
            ) : (
              <>
                🧊 Apply Freeze &amp; Protect Streak
              </>
            )}
          </button>
          <button
            onClick={onDismiss}
            className="h-11 px-4 rounded-xl text-xs text-white/25 hover:text-white/45 transition-colors whitespace-nowrap"
          >
            Accept the reset
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/40 mt-2">
          1 freeze per 30 days · You must still log an action today
        </p>
      </div>
    </motion.div>
  );
}

function StreakChain({ allActions, actionsToday }: { allActions: any[]; actionsToday: number }) {
  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const actionDays = new Set(
      allActions.map((a: any) => new Date(a.completedAt).toISOString().split("T")[0])
    );
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (13 - i));
      const key = d.toISOString().split("T")[0];
      const todayKey = today.toISOString().split("T")[0];
      const isToday = key === todayKey;
      const hasAction = actionDays.has(key) || (isToday && actionsToday > 0);
      return { key, isToday, hasAction, dayLabel: d.toLocaleDateString("en-US", { weekday: "short" })[0] };
    });
  }, [allActions, actionsToday]);

  const longestRun = useMemo(() => {
    let best = 0, cur = 0;
    for (const d of days) {
      if (d.hasAction) { cur++; best = Math.max(best, cur); } else cur = 0;
    }
    return best;
  }, [days]);

  return (
    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/5">
      {days.map((d, i) => (
        <div key={d.key} className="flex flex-col items-center gap-1 flex-1">
          <div className="relative">
            {d.isToday && !d.hasAction ? (
              <>
                <span className="absolute inset-0 rounded-full animate-ping bg-amber-400/40" />
                <div className="relative w-3.5 h-3.5 rounded-full border-2 border-amber-400/70 bg-amber-400/10" />
              </>
            ) : d.hasAction ? (
              <div className={`w-3.5 h-3.5 rounded-full ${
                d.isToday
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                  : i >= 14 - longestRun && longestRun > 1
                  ? "bg-orange-400/90"
                  : "bg-orange-400/60"
              }`} />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full bg-white/8" />
            )}
          </div>
          {d.isToday && (
            <span className="text-[8px] font-bold text-white/30 uppercase leading-none">now</span>
          )}
        </div>
      ))}
    </div>
  );
}

function StreakStatusBar({ streakDays, actionsToday, firstName, allActions }: { streakDays: number; actionsToday: number; firstName: string; allActions: any[] }) {
  const now = new Date();
  const hour = now.getHours();
  const hasHistory = allActions.length > 0;
  const state = getStreakState(streakDays, actionsToday, hasHistory);
  const minutesLeft = (23 - hour) * 60 + (59 - now.getMinutes());
  const hoursLeft = Math.floor(minutesLeft / 60);
  const timeLabel = hoursLeft > 1 ? `${hoursLeft}h left today` : minutesLeft > 30 ? `${hoursLeft}h ${minutesLeft % 60}m left` : `${minutesLeft}m left — act now`;
  const isLate = hour >= 20;

  // Best-streak computation — used by comeback state to honour past effort
  const bestStreak = useMemo(() => {
    if (allActions.length === 0) return 0;
    const days = Array.from(
      new Set(allActions.map((a: any) => new Date(a.completedAt).toISOString().split("T")[0]))
    ).sort();
    let max = 1, cur = 1;
    for (let i = 1; i < days.length; i++) {
      const diff = (new Date(days[i]).getTime() - new Date(days[i - 1]).getTime()) / 86_400_000;
      if (diff === 1) { cur++; if (cur > max) max = cur; } else cur = 1;
    }
    return max;
  }, [allActions]);

  const config = {
    // User has history but broke their streak — identity-preserving comeback copy
    comeback: {
      border: "border-indigo-500/30", bg: "bg-indigo-500/5",
      icon: <Flame className="w-5 h-5 text-indigo-400" />,
      headline: `Welcome back, ${firstName}.`,
      sub: bestStreak > 1
        ? `Your ${bestStreak}-day best is permanent evidence of who you are. One action today restarts your streak.`
        : "One day doesn't define you. Log one action today and you're back on track.",
      badge: bestStreak > 1 ? (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-400 whitespace-nowrap">
          <Trophy className="w-3 h-3" />{bestStreak}d best
        </div>
      ) : null,
      cta: { label: "Restart My Streak →", href: "/actions", color: "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 font-bold" },
    },
    zero: {
      border: "border-white/8", bg: "bg-white/2",
      icon: <Flame className="w-5 h-5 text-muted-foreground" />,
      headline: `Start your streak today, ${firstName}.`,
      sub: "Log one action before midnight to begin your journey.",
      badge: null,
      cta: { label: "Log Your First Action", href: "/actions", color: "bg-primary hover:bg-primary/90 text-white" },
    },
    unprotected: {
      border: isLate ? "border-red-500/50" : "border-amber-500/40",
      bg: isLate ? "bg-red-500/8" : "bg-amber-500/6",
      icon: <AlertTriangle className={`w-5 h-5 ${isLate ? "text-red-400" : "text-amber-400"}`} />,
      headline: streakDays > 0 ? `Your ${streakDays}-day streak ends at midnight.` : `No actions logged yet today, ${firstName}.`,
      sub: isLate ? `${timeLabel} — your streak is in danger.` : `Log at least one action today to protect your streak.`,
      badge: streakDays > 0 ? (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${isLate ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>
          <Flame className="w-3 h-3" />{streakDays}-day streak at risk
        </div>
      ) : null,
      cta: { label: "Protect Your Streak →", href: "/actions", color: isLate ? "bg-red-500 hover:bg-red-500/90 text-white" : "bg-amber-500 hover:bg-amber-400 text-black font-bold" },
    },
    safe: {
      border: "border-emerald-500/30", bg: "bg-emerald-500/5",
      icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
      headline: `Streak protected. Keep going, ${firstName}.`,
      sub: `${actionsToday} action${actionsToday !== 1 ? "s" : ""} logged today — ${timeLabel}.`,
      badge: streakDays > 0 ? (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">
          <Flame className="w-3 h-3" />{streakDays}-day streak protected
        </div>
      ) : null,
      cta: { label: "Log More Actions →", href: "/actions", color: "bg-white/8 hover:bg-white/12 text-white border border-white/10" },
    },
    legendary: {
      border: "border-amber-400/40", bg: "bg-amber-500/5",
      icon: <Star className="w-5 h-5 text-amber-400 fill-amber-400" />,
      headline: `Legendary day, ${firstName}.`,
      sub: `${actionsToday} actions logged — you're in rare company.`,
      badge: (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400">
          <Star className="w-3 h-3 fill-amber-400" />{streakDays > 0 ? `${streakDays}-day streak` : "Exceptional day"}
        </div>
      ),
      cta: { label: "View Missions →", href: "/missions", color: "bg-white/8 hover:bg-white/12 text-white border border-white/10" },
    },
  }[state];

  // Once today is already safe (streak protected, non-milestone), the full urgency
  // card is redundant with the stats bar + promise card above — collapse it to a
  // slim strip so screen space is reserved for states that actually need attention
  // (at-risk, zero, or legendary), while still keeping the evidence chain visible.
  if (state === "safe") {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/4 px-5 py-3">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-xs font-semibold text-emerald-400 flex-1 min-w-0 truncate">
            {config.headline} {streakDays > 0 && `· ${streakDays}-day streak protected`}
          </p>
          <Link href={config.cta.href} className="text-xs font-medium text-muted-foreground hover:text-white transition-colors shrink-0 whitespace-nowrap">
            {config.cta.label}
          </Link>
        </div>
        {hasHistory && <StreakChain allActions={allActions} actionsToday={actionsToday} />}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div key={state} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.35 }}
        className={`rounded-2xl border ${config.border} ${config.bg} px-5 py-4 relative overflow-hidden`}>
        {state === "unprotected" && (
          <div className="absolute -top-1 -right-1 w-3 h-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="shrink-0">{config.icon}</div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm leading-snug">{config.headline}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{config.sub}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {config.badge}
            <Link href={config.cta.href}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${config.cta.color}`}>
              {config.cta.label}
            </Link>
          </div>
        </div>
        {/* 14-day visual chain — only shown once user has any history */}
        {hasHistory && (
          <StreakChain allActions={allActions} actionsToday={actionsToday} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Quick Log Section ───────────────────────────────────────────────────────
function QuickLogSection({
  topActionType,
  loggedTypes,
  onLog,
  justLogged,
}: {
  topActionType: string;
  loggedTypes: Set<string>;
  onLog: (type: string) => void;
  justLogged: string | null;
}) {
  // Build ordered list: topAction first, then remaining un-logged, cap at 4
  const ordered = useMemo(() => {
    const top = ACTION_CONFIG.find(a => a.type === topActionType);
    const rest = ACTION_CONFIG.filter(a => a.type !== topActionType && !loggedTypes.has(a.type));
    const all = top ? [top, ...rest] : rest;
    return all.filter(a => !loggedTypes.has(a.type)).slice(0, 4);
  }, [topActionType, loggedTypes]);

  const justLoggedAction = ACTION_CONFIG.find(a => a.type === justLogged);

  if (ordered.length === 0) {
    return (
      <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
        <p className="text-sm font-semibold text-emerald-400">All 9 actions logged today. Legendary.</p>
        <Link href="/actions" className="ml-auto text-xs text-muted-foreground hover:text-white transition-colors shrink-0">view all →</Link>
      </div>
    );
  }

  const [primary, ...secondary] = ordered;
  const pc = COLOR_MAP[primary.color];

  return (
    <div className="space-y-3">
      {/* Identity flash — shown briefly after logging */}
      <AnimatePresence>
        {justLoggedAction && (
          <motion.div
            key={justLoggedAction.type}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${COLOR_MAP[justLoggedAction.color].border} bg-gradient-to-r from-white/5 to-transparent`}
          >
            <CheckCircle2 className={`h-4 w-4 shrink-0 ${COLOR_MAP[justLoggedAction.color].text}`} />
            <p className={`text-sm font-semibold italic ${COLOR_MAP[justLoggedAction.color].text}`}>
              "{justLoggedAction.identity}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary action — full width tap target */}
      <motion.button
        key={primary.type}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onLog(primary.type)}
        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border ${pc.border} ${pc.bg} hover:brightness-110 active:brightness-95 transition-all text-left group cursor-pointer`}
      >
        <div className={`w-10 h-10 rounded-xl ${pc.bg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
          <primary.icon className={`h-5 w-5 ${pc.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-primary/70 uppercase tracking-wider">Highest-Leverage Action</span>
          </div>
          <p className="font-bold text-white">{primary.label}</p>
          <p className={`text-xs ${pc.text} mt-0.5`}>{primary.impact}</p>
        </div>
        <div className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold ${pc.bg} ${pc.text} border ${pc.border} group-hover:scale-105 transition-transform`}>
          Log it →
        </div>
      </motion.button>

      {/* Secondary actions — compact chips */}
      {secondary.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {secondary.map((action) => {
            const sc = COLOR_MAP[action.color];
            return (
              <motion.button
                key={action.type}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onLog(action.type)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${sc.border} ${sc.bg} hover:brightness-110 transition-all text-sm font-semibold ${sc.text} cursor-pointer`}
              >
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </motion.button>
            );
          })}
          <Link href="/actions"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 transition-all text-sm font-medium text-muted-foreground">
            All 9 →
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Tomorrow Preview ────────────────────────────────────────────────────────
function TomorrowPreview({
  firstName,
  streakDays,
  lastActionType,
  onDismiss,
  onSavePromise,
}: {
  firstName: string;
  streakDays: number;
  lastActionType: string | null;
  onDismiss: () => void;
  onSavePromise: (promise: string) => void;
}) {
  const [phase, setPhase] = useState<"celebrate" | "commit">("celebrate");
  const currentTier = getBriefingTier(streakDays);
  const tomorrowTier = getBriefingTier(streakDays + 1);
  const nextDay = streakDays + 1;
  const isMilestone = [3, 7, 14, 30, 60, 90].includes(nextDay);
  const progressPct = Math.min(((streakDays + 1) / currentTier.nextMilestone) * 100, 100);
  const lastAction = ACTION_CONFIG.find((a) => a.type === lastActionType);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.38, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 relative overflow-hidden"
    >
      {/* Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/6 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-emerald-400/4 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-4 relative z-10">
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">

            {/* ── PHASE 1: Identity Confirmation ── */}
            {phase === "celebrate" && (
              <motion.div
                key="celebrate"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28 }}
              >
                {/* Header chip */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-400">
                    Day {streakDays} — Identity Confirmed
                  </p>
                </div>

                {/* Headline — celebration not farewell */}
                <h3 className="text-lg sm:text-xl font-black text-white mb-2 leading-snug">
                  {isMilestone
                    ? `Day ${nextDay} is a milestone. Come back and claim it.`
                    : `You just proved it, ${firstName}.`}
                </h3>

                {/* Identity statement — what they confirmed today */}
                {lastAction ? (
                  <p className="text-sm text-emerald-300/80 font-semibold italic mb-4 leading-relaxed">
                    "{lastAction.identity}"
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {isMilestone
                      ? `Most people never reach a ${nextDay}-day streak. You're one day away. Don't break the chain.`
                      : `That action is now permanent evidence. Your future self is watching.`}
                  </p>
                )}

                {/* Streak + progress row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/8 bg-white/4 shrink-0">
                    <Flame className="w-3 h-3 text-orange-400 shrink-0" />
                    <span className="text-xs font-black text-orange-400">{streakDays}</span>
                    <span className="text-xs text-muted-foreground">day streak</span>
                  </div>
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden max-w-[140px]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground/60 whitespace-nowrap">
                      {nextDay}/{currentTier.nextMilestone} → {currentTier.milestoneLabel}
                    </span>
                  </div>
                </div>

                {/* CTA: advance to commitment */}
                <button
                  onClick={() => setPhase("commit")}
                  className="w-full h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-bold hover:bg-emerald-500/25 transition-all flex items-center justify-center gap-2"
                >
                  Seal tomorrow
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onDismiss}
                  className="mt-2 w-full text-center text-[11px] text-white/18 hover:text-white/35 transition-colors"
                >
                  Skip — no commitment today
                </button>
              </motion.div>
            )}

            {/* ── PHASE 2: Tomorrow's Commitment ── */}
            {phase === "commit" && (
              <motion.div
                key="commit"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28 }}
              >
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-primary" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary/70">
                    Tomorrow's Promise
                  </p>
                </div>

                <h3 className="text-base sm:text-lg font-black text-white mb-1.5 leading-snug">
                  {isMilestone
                    ? `Day ${nextDay} is a milestone. Name your action.`
                    : `One commitment. One line.`}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {isMilestone
                    ? `You're one day from ${currentTier.milestoneLabel}. What will you do to claim it?`
                    : `People who write tomorrow's action are 3× more likely to do it. What will you do?`}
                </p>

                {/* Tomorrow's word chip */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/8 bg-white/4 mb-4 w-fit">
                  <Sparkles className="w-3 h-3 text-primary/60 shrink-0" />
                  <span className="text-xs text-muted-foreground">Tomorrow's word:</span>
                  <span className={`text-xs font-black ${tomorrowTier.wordColor}`}>{tomorrowTier.word}</span>
                </div>

                <PromiseInput
                  onSave={onSavePromise}
                  onSkip={onDismiss}
                  suggestions={PROMISE_SUGGESTIONS[lastActionType ?? ""] ?? DEFAULT_SUGGESTIONS}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Dismiss X */}
        <button
          onClick={onDismiss}
          className="shrink-0 w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-muted-foreground hover:text-white mt-0.5"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Smart promise suggestions by action type ─────────────────────────────────
const PROMISE_SUGGESTIONS: Record<string, [string, string, string]> = {
  workout:          ["Work out for 30 minutes — no excuses", "Do a full training session before noon", "Complete 20 minutes of movement, minimum"],
  deep_work:        ["90 minutes of deep work, phone in another room", "Finish my most important task before anything else", "One 2-hour focus block — no notifications"],
  learning:         ["Study for 45 minutes before bed", "Complete one lesson or chapter", "Learn one new thing and write it down"],
  content_creation: ["Create one piece of content, start to finish", "Write 500 words — publish or not", "Record one video or write one post"],
  saving:           ["Move money to savings before spending", "Track every expense today", "Review budget and cut one thing"],
  reading:          ["Read 20 pages — no skipping", "30 minutes of reading before screens", "Finish the chapter I started"],
  meditation:       ["10 minutes of meditation, no exceptions", "Breathe for 5 minutes before the day starts", "Meditate before I check my phone"],
  sleep:            ["In bed by 10:30pm, screens off at 10", "Get 7–8 hours — protect my recovery", "No screens 1 hour before bed"],
  water:            ["Drink 3L of water throughout the day", "Start the day with a full glass before coffee", "Carry my water bottle everywhere"],
};

const DEFAULT_SUGGESTIONS: [string, string, string] = [
  "Log at least one action before noon",
  "Complete my most important task for the day",
  "Show up — do one thing my future self will thank me for",
];

function PromiseInput({
  onSave,
  onSkip,
  suggestions,
}: {
  onSave: (p: string) => void;
  onSkip: () => void;
  suggestions: [string, string, string];
}) {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (!value.trim()) return;
    setSaved(true);
    onSave(value.trim());
    setTimeout(onSkip, 800);
  };

  const handleSelect = (s: string) => {
    setValue(s);
    // slight delay so the value is visible before focusing
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.35 }}
      className="mt-4 pt-4 border-t border-emerald-500/15"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400/60 mb-2">
        Tomorrow's Promise
      </p>

      {saved ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 text-emerald-400"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-sm font-bold">Promise sealed. See you tomorrow.</span>
        </motion.div>
      ) : (
        <>
          {/* ── Suggestion chips — tap to pre-fill ── */}
          <div className="flex flex-col gap-1.5 mb-3">
            {suggestions.map((s, i) => (
              <motion.button
                key={s}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.07 }}
                onClick={() => handleSelect(s)}
                className={`w-full text-left text-xs px-3 py-2.5 rounded-xl border transition-all ${
                  value === s
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 font-semibold"
                    : "border-white/8 bg-white/3 text-muted-foreground hover:border-emerald-500/30 hover:bg-emerald-500/8 hover:text-white"
                }`}
              >
                <span className="mr-1.5 opacity-40">{i === 0 ? "→" : i === 1 ? "→" : "→"}</span>
                {s}
              </motion.button>
            ))}
          </div>

          {/* ── Free-text input ── */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="Or write your own…"
              maxLength={120}
              className="flex-1 h-9 px-3 rounded-xl bg-black/20 border border-emerald-500/20 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/40 transition-colors min-w-0"
            />
            <button
              onClick={handleSave}
              disabled={!value.trim()}
              className="h-9 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-bold hover:bg-emerald-500/25 transition-all disabled:opacity-30 shrink-0 whitespace-nowrap"
            >
              Seal it →
            </button>
          </div>
        </>
      )}
      {!saved && (
        <button
          onClick={onSkip}
          className="mt-1.5 text-[11px] text-white/20 hover:text-white/35 transition-colors"
        >
          I'll commit tomorrow
        </button>
      )}
    </motion.div>
  );
}

// ─── Closing Promise Card ─────────────────────────────────────────────────────
// Persistent bottom-of-Dashboard card that appears when the user has logged
// at least one action today but hasn't committed to tomorrow yet.
// Unlike TomorrowPreview (one-shot modal), this stays until the promise is set.
function ClosingPromiseCard({
  dominantActionType,
  onSave,
}: {
  dominantActionType: string | null;
  onSave: (p: string) => void;
}) {
  const [value, setValue] = useState("");
  const [sealed, setSealed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions: [string, string, string] =
    PROMISE_SUGGESTIONS[dominantActionType ?? ""] ?? DEFAULT_SUGGESTIONS;

  const handleSave = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setValue(trimmed);
    setSealed(true);
    onSave(trimmed);
  };

  if (sealed) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ delay: 1.8, duration: 0.6 }}
        className="mt-6 flex items-center gap-2.5 justify-center py-3 text-emerald-400"
      >
        <CheckCircle2 className="w-4 h-4" />
        <span className="text-sm font-bold">Promise sealed. See you tomorrow.</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="mt-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent px-5 py-5 relative overflow-hidden"
    >
      {/* Subtle glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/8 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <PenLine className="w-3.5 h-3.5 text-primary/60" />
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/60">
            Before you close tonight
          </p>
        </div>
        <p className="text-sm font-bold text-white mb-4">
          One commitment seals the day. What will you do tomorrow?
        </p>

        {/* Smart suggestion chips */}
        <div className="flex flex-col gap-1.5 mb-3">
          {suggestions.map((s, i) => (
            <button
              key={s}
              onClick={() => handleSave(s)}
              className="w-full text-left text-xs px-3 py-2.5 rounded-xl border border-white/8 bg-white/3 text-muted-foreground hover:border-primary/30 hover:bg-primary/8 hover:text-white transition-all"
            >
              <span className="mr-1.5 opacity-40">→</span>{s}
            </button>
          ))}
        </div>

        {/* Free-text input */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave(value)}
            placeholder="Or write your own…"
            maxLength={120}
            className="flex-1 h-9 px-3 rounded-xl bg-black/20 border border-primary/15 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/35 transition-colors min-w-0"
          />
          <button
            onClick={() => handleSave(value)}
            disabled={!value.trim()}
            className="h-9 px-3 rounded-xl bg-primary/15 border border-primary/25 text-primary text-xs font-bold hover:bg-primary/25 transition-all disabled:opacity-30 shrink-0 whitespace-nowrap"
          >
            Seal it →
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Notification Permission Banner ──────────────────────────────────────────
const NOTIF_DISMISS_KEY = "astra_notif_banner_dismissed";

function NotificationPermissionBanner({ streakDays }: { streakDays: number }) {
  const { permission, loading, subscribed, isSupported, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(NOTIF_DISMISS_KEY) === "1"; } catch { return false; }
  });

  const dismiss = useCallback(() => {
    try { localStorage.setItem(NOTIF_DISMISS_KEY, "1"); } catch {}
    setDismissed(true);
  }, []);

  // Only show when: supported, streak ≥ 1, not yet asked, not dismissed, not subscribed
  if (!isSupported || dismissed || subscribed || permission === "granted" || permission === "denied") return null;
  if (streakDays < 1) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 flex items-center gap-4"
    >
      <div className="shrink-0 w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Bell className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white leading-tight">
          Protect your {streakDays}-day streak
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Get a reminder at 8pm if you haven't logged yet.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={subscribe}
          disabled={loading}
          className="h-8 px-4 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/80 transition-all disabled:opacity-50"
        >
          {loading ? "Enabling…" : "Enable"}
        </button>
        <button
          onClick={dismiss}
          className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-all"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Today's Evidence Strip ──────────────────────────────────────────────────
function TodayEvidenceStrip({ actions }: { actions: any[] }) {
  const shown = actions.slice(0, 6);
  const overflow = actions.length - 6;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="rounded-3xl border border-white/5 bg-gradient-to-br from-[#0f0f1a] via-[#0d1017] to-[#0a0c14] p-6 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(124,58,237,0.08),transparent_60%)]" />
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary/60">Promises Kept</p>
              <p className="text-xs font-bold text-white leading-none mt-0.5">
                {actions.length === 0 ? "No promises kept yet" : `${actions.length} promise${actions.length !== 1 ? "s" : ""} kept today`}
              </p>
            </div>
          </div>
          <Link href="/evidence" className="text-xs font-bold text-primary/60 hover:text-primary transition-colors flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Empty state */}
        {actions.length === 0 && (
          <div className="flex items-center gap-4 p-4 rounded-2xl border border-dashed border-white/8">
            <div className="w-9 h-9 rounded-xl bg-white/3 border border-dashed border-white/10 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-white/20" />
            </div>
            <div>
              <p className="text-sm font-bold text-white/30">Your first action becomes permanent proof.</p>
              <p className="text-xs text-white/20 mt-0.5">Every log here is evidence of who you're becoming.</p>
            </div>
          </div>
        )}

        {/* Action chips */}
        {actions.length > 0 && (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {shown.map((action: any, i: number) => {
                const cfg = ACTION_CONFIG.find((a) => a.type === action.type) ?? ACTION_CONFIG[0];
                const Icon = cfg.icon;
                const clr = COLOR_MAP[cfg.color] ?? COLOR_MAP["indigo"];
                const time = new Date(action.completedAt ?? action.loggedAt ?? action.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                return (
                  <motion.div
                    key={action.id ?? i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${clr.border} ${clr.bg} group`}
                  >
                    <div className={`shrink-0 w-8 h-8 rounded-xl ${clr.bg} border ${clr.border} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${clr.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black uppercase tracking-wide ${clr.text}`}>{cfg.label}</span>
                        <span className="text-[10px] text-white/25 font-medium">{time}</span>
                      </div>
                      <p className="text-[11px] text-white/40 leading-tight truncate">{cfg.identity}</p>
                    </div>
                    <CheckCircle2 className={`w-4 h-4 ${clr.text} shrink-0 opacity-70`} />
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {overflow > 0 && (
              <Link href="/evidence" className={`flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-white/8 bg-white/2 hover:bg-white/5 transition-all`}>
                <span className="text-xs font-bold text-white/40">+{overflow} more in Evidence Vault</span>
                <ChevronRight className="w-3 h-3 text-white/30" />
              </Link>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Milestone Achievement Card ──────────────────────────────────────────────
const MILESTONE_CONFIG: Record<number, {
  label: string; sub: string; tier: string; color: string;
  bg: string; border: string; glow: string; shareText: string;
}> = {
  7:  { label: "One Week",     sub: "You're in the top 15% who make it this far.",               tier: "MOMENTUM",  color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30",   glow: "rgba(59,130,246,0.3)",   shareText: "7 days. I kept my promise to myself every single day this week. Most people quit in 3. Building my future self on Astra OS." },
  14: { label: "Two Weeks",    sub: "Most people have quit by now. You haven't.",                 tier: "IDENTITY",  color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30", glow: "rgba(139,92,246,0.3)",   shareText: "14 days straight on Astra OS. Two full weeks. I didn't miss a single day. The habit is real now." },
  21: { label: "Three Weeks",  sub: "21 days. Science says the habit is forming.",                tier: "RARE",      color: "text-primary",    bg: "bg-primary/10",    border: "border-primary/30",    glow: "rgba(124,58,237,0.3)",   shareText: "21 days of daily action on Astra OS. Three weeks of building the person I said I'd become. It's working." },
  30: { label: "One Month",    sub: "You're in the top 3% of people who ever try.",              tier: "FORGED",    color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/30",  glow: "rgba(245,158,11,0.35)",  shareText: "30 days. One full month of keeping my promise to myself. I'm a different person than I was 30 days ago. Astra OS." },
  60: { label: "Two Months",   sub: "This is no longer a habit — it's an identity.",             tier: "ELITE",     color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", glow: "rgba(249,115,22,0.35)",  shareText: "60 consecutive days. I started this wondering if I could last a week. I'm still here. Still building. Astra OS." },
  90: { label: "90 Days",      sub: "Three months. This is who you are now — permanently.",      tier: "LEGEND",    color: "text-amber-300",  bg: "bg-amber-400/10",  border: "border-amber-400/30",  glow: "rgba(252,211,77,0.4)",   shareText: "90 days on Astra OS. I said I'd change. I did. This isn't discipline anymore — it's identity. Permanent." },
};

function MilestoneCard({
  streakDays, firstName, onDismiss,
}: { streakDays: number; firstName: string; onDismiss: () => void }) {
  const cfg = MILESTONE_CONFIG[streakDays];
  const [copied, setCopied] = useState(false);
  if (!cfg) return null;

  const handleShare = async () => {
    const text = cfg.shareText;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isGold = streakDays >= 30;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -16 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-3xl border ${cfg.border} overflow-hidden`}
      style={{ boxShadow: `0 0 60px ${cfg.glow}, 0 0 120px ${cfg.glow.replace("0.3", "0.12")}` }}
    >
      {/* Background */}
      <div className={`absolute inset-0 ${cfg.bg}`} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04),transparent_60%)]" />
      {isGold && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.12),transparent_50%)]" />
      )}

      <div className="relative z-10 p-6 sm:p-8">
        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Tier badge */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-2 mb-4"
        >
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${cfg.border} ${cfg.bg}`}>
            <Trophy className={`w-3.5 h-3.5 ${cfg.color}`} />
            <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${cfg.color}`}>{cfg.tier} UNLOCKED</span>
          </div>
        </motion.div>

        {/* Main headline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-2"
        >
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className={`text-5xl sm:text-6xl font-black leading-none ${cfg.color} tabular-nums`}>
              {streakDays}
            </span>
            <div>
              <p className="text-xl font-black text-white leading-tight">Day Streak</p>
              <p className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</p>
            </div>
          </div>
        </motion.div>

        {/* Sub copy */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-sm text-muted-foreground mb-6 max-w-sm"
        >
          {firstName}, {cfg.sub}
        </motion.p>

        {/* Identity statement */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          className={`px-4 py-3 rounded-xl border ${cfg.border} ${cfg.bg} mb-6`}
        >
          <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-1 ${cfg.color} opacity-70`}>Your Identity</p>
          <p className="text-sm font-bold text-white leading-snug">
            You are <span className={cfg.color}>someone who keeps their word to themselves</span> — {streakDays} days of proof.
          </p>
        </motion.div>

        {/* Share + continue */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52 }}
          className="flex items-center gap-3"
        >
          <button
            onClick={handleShare}
            className={`flex-1 h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border ${cfg.border} ${cfg.bg} ${cfg.color} hover:brightness-125`}
          >
            <Share2 className="w-4 h-4" />
            {copied ? "Copied!" : "Share this"}
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
          >
            Keep building <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Weekly Scorecard ────────────────────────────────────────────────────────
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const WEEK_SENTENCE: Record<string, string> = {
  workout:          "The week you chose your body over excuses.",
  deep_work:        "The week focus became your competitive edge.",
  learning:         "The week knowledge started compounding for you.",
  content_creation: "The week you created more than you consumed.",
  saving:           "The week wealth became a daily decision.",
  reading:          "The week your mind outgrew its old limits.",
  meditation:       "The week you commanded your own mind.",
  sleep:            "The week you invested in your recovery.",
  water:            "The week you started caring for the basics.",
};

function WeeklyScorecard({ allActions, streakDays, alignScore, identityScore }: { allActions: any[]; streakDays: number; alignScore: number; identityScore: number }) {
  const todayMidnight = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const last7 = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(todayMidnight);
      d.setDate(d.getDate() - (6 - i));
      return d;
    }),
  [todayMidnight]);

  const todayStr = todayMidnight.toISOString().split("T")[0];

  const sevenDaysAgo = useMemo(() => {
    const d = new Date(todayMidnight);
    d.setDate(d.getDate() - 6);
    return d;
  }, [todayMidnight]);

  const { weekActions, dayMap, totalThisWeek, activeDaysThisWeek, topType, promisesKeptThisWeek } = useMemo(() => {
    const week = allActions.filter((a: any) => new Date(a.completedAt) >= sevenDaysAgo);
    const map: Record<string, number> = {};
    const types: Record<string, number> = {};
    week.forEach((a: any) => {
      const d = new Date(a.completedAt).toISOString().split("T")[0];
      map[d] = (map[d] ?? 0) + 1;
      types[a.type] = (types[a.type] ?? 0) + 1;
    });
    const top = Object.entries(types).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "workout";
    return {
      weekActions: week,
      dayMap: map,
      totalThisWeek: week.length,
      activeDaysThisWeek: Object.values(map).filter(n => n > 0).length,
      topType: top,
      promisesKeptThisWeek: week.filter((a: any) => a.type === "promise").length,
    };
  }, [allActions, sevenDaysAgo]);

  const { longestStreak, weekTrendPct } = useMemo(() => {
    const daySet = new Set(allActions
      .filter((a: any) => a.type !== "streak_freeze")
      .map((a: any) => new Date(a.completedAt).toISOString().split("T")[0]));
    const sortedDays = Array.from(daySet).sort();
    let maxStreak = sortedDays.length ? 1 : 0, cur = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const diff = (new Date(sortedDays[i]).getTime() - new Date(sortedDays[i - 1]).getTime()) / 86400000;
      if (diff === 1) { cur++; maxStreak = Math.max(maxStreak, cur); }
      else cur = 1;
    }
    const fourteenDaysAgo = new Date(sevenDaysAgo);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 7);
    const prevWeekCount = allActions.filter((a: any) => {
      const t = new Date(a.completedAt);
      return t >= fourteenDaysAgo && t < sevenDaysAgo;
    }).length;
    const thisWeekCount = allActions.filter((a: any) => new Date(a.completedAt) >= sevenDaysAgo).length;
    const trend = prevWeekCount === 0
      ? (thisWeekCount > 0 ? 100 : 0)
      : Math.round(((thisWeekCount - prevWeekCount) / prevWeekCount) * 100);
    return { longestStreak: Math.max(maxStreak, streakDays), weekTrendPct: trend };
  }, [allActions, sevenDaysAgo, streakDays]);

  if (totalThisWeek === 0) return null;

  const perfectWeek = activeDaysThisWeek === 7;
  const topLabel = ACTION_CONFIG.find(c => c.type === topType)?.label ?? "Workout";
  const sentence = WEEK_SENTENCE[topType] ?? "The week you showed up.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.5 }}
      className={`rounded-3xl border p-6 relative overflow-hidden ${
        perfectWeek
          ? "border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-[#0d1017] to-[#0a0c14]"
          : "border-white/5 bg-gradient-to-br from-[#0f0f1a] via-[#0d1017] to-[#0a0c14]"
      }`}
    >
      {perfectWeek && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.08),transparent_60%)] pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            perfectWeek
              ? "bg-amber-500/15 border border-amber-500/30"
              : "bg-primary/10 border border-primary/20"
          }`}>
            {perfectWeek
              ? <Trophy className="w-4 h-4 text-amber-400" />
              : <Calendar className="w-4 h-4 text-primary" />
            }
          </div>
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-[0.25em] ${
              perfectWeek ? "text-amber-400/70" : "text-primary/60"
            }`}>
              {perfectWeek ? "⚡ Perfect Week" : "Daily Momentum"}
            </p>
            <h3 className="text-base font-bold text-white">Last 7 Days</h3>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-black leading-none ${perfectWeek ? "text-amber-400" : "text-white"}`}>
            {activeDaysThisWeek}<span className="text-lg text-muted-foreground font-medium">/7</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">days active</div>
        </div>
      </div>

      {/* Momentum summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        {[
          { label: "Promises Kept", value: promisesKeptThisWeek, icon: Sparkles, color: "text-violet-400", bg: "bg-violet-500/8", border: "border-violet-500/15" },
          { label: "Current Streak", value: `${streakDays}d`, icon: Flame, color: "text-orange-400", bg: "bg-orange-500/8", border: "border-orange-500/15" },
          { label: "Longest Streak", value: `${longestStreak}d`, icon: Trophy, color: "text-amber-400", bg: "bg-amber-500/8", border: "border-amber-500/15" },
          { label: "Identity Score", value: `${Math.round(identityScore)}%`, icon: Shield, color: "text-blue-400", bg: "bg-blue-500/8", border: "border-blue-500/15" },
        ].map((tile) => (
          <div key={tile.label} className={`rounded-xl border ${tile.border} ${tile.bg} p-3 text-center`}>
            <tile.icon className={`w-3.5 h-3.5 ${tile.color} mx-auto mb-1.5`} />
            <p className={`text-lg font-black leading-none ${tile.color}`}>{tile.value}</p>
            <p className="text-[9px] text-white/30 mt-1 leading-tight">{tile.label}</p>
          </div>
        ))}
      </div>

      {/* Alignment trend */}
      <div className="flex items-center gap-2 mb-5 px-3.5 py-2 rounded-xl bg-white/3 border border-white/5 w-fit">
        <TrendingUp className={`w-3.5 h-3.5 ${weekTrendPct >= 0 ? "text-emerald-400" : "text-red-400 rotate-180"}`} />
        <span className={`text-xs font-bold ${weekTrendPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {weekTrendPct >= 0 ? "+" : ""}{weekTrendPct}%
        </span>
        <span className="text-xs text-muted-foreground">vs last week · {alignScore}% aligned now</span>
      </div>

      {/* 7-day activity grid */}
      <div className="flex gap-1.5 mb-5">
        {last7.map((day, i) => {
          const key = day.toISOString().split("T")[0];
          const count = dayMap[key] ?? 0;
          const isToday = key === todayStr;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <span className={`text-[9px] font-bold uppercase tracking-wide ${
                isToday ? "text-primary" : "text-muted-foreground/40"
              }`}>
                {DAY_SHORT[day.getDay()]}
              </span>
              <div className={`w-full rounded-lg flex items-center justify-center text-xs font-black py-2.5 transition-all ${
                count > 0
                  ? perfectWeek
                    ? "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                    : "bg-primary/20 border border-primary/40 text-primary"
                  : isToday
                    ? "bg-white/5 border border-primary/20 border-dashed text-muted-foreground/30"
                    : "bg-white/3 border border-white/5 text-muted-foreground/15"
              }`}>
                {count > 0 ? count : isToday ? "·" : "—"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-primary fill-primary shrink-0" />
          <span className="text-sm font-bold text-white">{totalThisWeek}</span>
          <span className="text-xs text-muted-foreground">actions</span>
        </div>
        <span className="text-white/10">·</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Top:</span>
          <span className="text-sm font-bold text-white">{topLabel}</span>
        </div>
        {streakDays >= 7 && (
          <>
            <span className="text-white/10">·</span>
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span className="text-sm font-bold text-orange-400">{streakDays}-day streak</span>
            </div>
          </>
        )}
      </div>

      {/* Defining sentence */}
      <div className={`px-4 py-3 rounded-xl border ${
        perfectWeek
          ? "border-amber-500/20 bg-amber-500/8"
          : "border-primary/20 bg-primary/5"
      }`}>
        <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-1 ${
          perfectWeek ? "text-amber-400/60" : "text-primary/60"
        }`}>
          This was
        </p>
        <p className="text-sm font-bold text-white leading-snug">{sentence}</p>
      </div>
    </motion.div>
  );
}

// ─── Today's Gains Strip ─────────────────────────────────────────────────────
const DAILY_IMPACT_MAP: Record<string, Record<string, number>> = {
  workout:          { Health: 2,   Discipline: 1   },
  deep_work:        { Discipline: 2, Wealth: 1.5   },
  learning:         { Knowledge: 2, Wealth: 1      },
  content_creation: { Confidence: 2, Wealth: 1.5   },
  saving:           { Wealth: 2,   Discipline: 1   },
  reading:          { Knowledge: 1.5               },
  meditation:       { Discipline: 1.5              },
  sleep:            { Health: 1.5                  },
  water:            { Health: 1                    },
  promise:          { Discipline: 1.5, Confidence: 1.5 },
};

const SCORE_CHIP_STYLE: Record<string, string> = {
  Health:     "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Discipline: "text-blue-400   bg-blue-500/10    border-blue-500/20",
  Wealth:     "text-amber-400  bg-amber-500/10   border-amber-500/20",
  Knowledge:  "text-violet-400 bg-violet-500/10  border-violet-500/20",
  Confidence: "text-orange-400 bg-orange-500/10  border-orange-500/20",
};

function TodayGainsStrip({ actions }: { actions: { type: string }[] }) {
  const totals = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const a of actions) {
      for (const [score, delta] of Object.entries(DAILY_IMPACT_MAP[a.type] ?? {})) {
        acc[score] = (acc[score] ?? 0) + delta;
      }
    }
    return Object.entries(acc).sort((a, b) => b[1] - a[1]);
  }, [actions]);

  if (!totals.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="mt-5 pt-4 border-t border-white/5"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30 mb-2.5 text-center lg:text-left">
        Today's Gains
      </p>
      <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
        {totals.map(([score, delta], i) => (
          <motion.span
            key={score}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.08, type: "spring", stiffness: 300 }}
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${SCORE_CHIP_STYLE[score] ?? "text-white bg-white/5 border-white/10"}`}
          >
            +{delta % 1 === 0 ? delta : delta.toFixed(1)}% {score}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Reflection Nudge Card ────────────────────────────────────────────────────
function ReflectionNudgeCard({ actionsToday, allPromisesKept }: { actionsToday: number; allPromisesKept: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ["reflections", "today"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/reflections/today`, { credentials: "include" });
      if (!res.ok) return { reflected: false };
      return res.json();
    },
    staleTime: 60_000,
  });

  const hasReflected = data?.reflected === true;
  if (isLoading || hasReflected || actionsToday < 2 || allPromisesKept) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-primary/25 bg-primary/5 p-5 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-start gap-4">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center mt-0.5">
            <PenLine className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/60 mb-1">
              Strengthen Identity
            </p>
            <h3 className="text-base font-black text-white mb-1 leading-snug">
              You showed up today. Now prove it to yourself.
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {actionsToday >= 4
                ? `You've logged ${actionsToday} actions today — that's a strong day. Lock it in with a 2-minute reflection.`
                : `You've logged ${actionsToday} actions today. Take 2 minutes to record who you proved you are.`}
            </p>
            <Link
              href="/reflections"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-primary/20 border border-primary/30 text-primary text-sm font-bold hover:bg-primary/30 transition-all"
            >
              <PenLine className="w-3.5 h-3.5" />
              Write Today's Reflection
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const qc = useQueryClient();
  const { data: user } = useGetMe();
  const { data: stats } = useGetUserStats();
  const { data: futureSelves } = useGetFutureSelf();
  const { data: todayActions } = useGetTodayActions();
  const { data: currentChapter } = useGetCurrentChapter();
  const { data: alignment, isLoading: alignLoading } = useAlignment();
  const { data: missions, isLoading: missionsLoading } = useMissions();
  const logAction = useLogAction();
  const updateMe = useUpdateMe();
  const completeMission = useCompleteMission();
  const generateBio = useGenerateBiographyEntry();

  const { data: allActionsRaw = [] } = useGetActions({ limit: 200 });
  const allActions = allActionsRaw as any[];
  const { data: latestLetter } = useGetLatestLetter();

  const [justLogged, setJustLogged] = useState<string | null>(null);
  const [lastActionType, setLastActionType] = useState<string | null>(null);
  const [loggingType, setLoggingType] = useState<string | null>(null);
  const [showTomorrowPreview, setShowTomorrowPreview] = useState(false);
  const [showMilestoneCard, setShowMilestoneCard] = useState(false);
  const [milestoneStreak, setMilestoneStreak] = useState(0);
  const [freezeDismissed, setFreezeDismissed] = useState(false);
  // Ensures the auto-trigger only fires once per Dashboard session
  const tomorrowAutoShownRef = useRef(false);

  const tomorrowPromise = (user as any)?.tomorrowPromise as string | null | undefined;

  const savePromise = useCallback((promise: string) => {
    tomorrowAutoShownRef.current = true;
    updateMe.mutate({ data: { tomorrowPromise: promise } } as any, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetMeQueryKey() }),
      onError: () => {
        toast({
          variant: "destructive",
          title: "Couldn't set tomorrow's promise",
          description: "That didn't save — you can set it again from the dashboard.",
        });
      },
    });
    setShowTomorrowPreview(false);
  }, [updateMe, qc]);

  const currentSelf = futureSelves?.find((f) => f.timeframe === "current");
  const alignScore = alignment?.alignmentScore ?? 0;
  const topAction = alignment?.topAction ?? "workout";
  const firstName = user?.name?.split(" ")[0] ?? "Explorer";
  const streakDays = stats?.streakDays ?? 0;
  const actionsToday = todayActions?.actions?.length ?? 0;
  const identityScore = currentSelf?.overallScore ?? 0;

  // Derive dominant action type + weekly count from the already-fetched action history.
  // Used to personalise the DailyBriefing body so ASTRA references the user's actual week.
  const { dominantActionType, weeklyActionCount } = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const typeCounts: Record<string, number> = {};
    for (const a of allActions) {
      if (new Date(a.createdAt) >= sevenDaysAgo) {
        typeCounts[a.type] = (typeCounts[a.type] ?? 0) + 1;
      }
    }
    const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    const dominant = sorted[0];
    return {
      dominantActionType: dominant?.[0] ?? null,
      weeklyActionCount: dominant?.[1] ?? 0,
    };
  }, [allActions]);

  const loggedTypesForPromise = useMemo(
    () => new Set((todayActions?.actions ?? []).map((a: any) => a.type)),
    [todayActions],
  );

  // Cumulative score gains from today's logged actions — fed into TodayGainsBar
  const todayGains = useMemo<Record<ScoreDim, number>>(() => {
    const base: Record<ScoreDim, number> = { health: 0, wealth: 0, discipline: 0, knowledge: 0, confidence: 0 };
    for (const action of (todayActions?.actions ?? [])) {
      const impact = SCORE_GAINS[action.type as string];
      if (!impact) continue;
      for (const [dim, val] of Object.entries(impact) as [ScoreDim, number][]) {
        base[dim] += val;
      }
    }
    return base;
  }, [todayActions]);
  const promiseText: string | null = missions?.criticalMission ?? tomorrowPromise ?? null;
  const promiseCompleted: boolean = missions?.criticalCompleted ?? false;

  // ── Silent timezone detection ──────────────────────────────────────────────
  // Fires once per user when their profile loads without a stored timezone.
  // Detects the browser's IANA timezone and PATCHes it silently — no UI impact.
  // The cron job uses this to send push notifications at the user's local 7PM
  // instead of a fixed UTC hour that lands mid-afternoon for US users.
  useEffect(() => {
    if (!user || (user as any).timezone) return; // already set or not loaded
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        updateMe.mutate({ data: { timezone: tz } } as any, {
          onSuccess: () => qc.invalidateQueries({ queryKey: getGetMeQueryKey() }),
        });
      }
    } catch {
      // Intl not available — skip silently
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // only re-run if the user identity changes

  // Auto-show TomorrowPreview for users who logged their first action outside the Dashboard
  // (e.g. from the Actions page or Missions page) and haven't committed to tomorrow yet.
  // Guards: only fires once per session, not during an in-progress QuickLog animation,
  // not while a milestone card is showing, not once a promise is already saved.
  useEffect(() => {
    if (
      actionsToday >= 1 &&
      !tomorrowPromise &&
      !tomorrowAutoShownRef.current &&
      !showMilestoneCard &&
      !justLogged
    ) {
      tomorrowAutoShownRef.current = true;
      const t = setTimeout(() => setShowTomorrowPreview(true), 1200);
      return () => clearTimeout(t);
    }
  }, [actionsToday, tomorrowPromise, showMilestoneCard, justLogged]);

  const handleKeepPromise = useCallback(() => {
    completeMission.mutate("critical", {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["missions"] });
        if (!loggedTypesForPromise.has("promise")) {
          logAction.mutate({ data: { type: "promise" } } as any, {
            onSuccess: () => {
              qc.invalidateQueries({ queryKey: getGetTodayActionsQueryKey() });
              qc.invalidateQueries({ queryKey: getGetFutureSelfQueryKey() });
              qc.invalidateQueries({ queryKey: getGetUserStatsQueryKey() });
              qc.invalidateQueries({ queryKey: getGetActionsQueryKey() });
            },
            onError: () => {
              toast({
                variant: "destructive",
                title: "Your promise didn't save",
                description: "That didn't go through — your streak is safe. Tap Keep My Promise again.",
              });
            },
          });
        }
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Your promise didn't save",
          description: "That didn't go through — your streak is safe. Tap Keep My Promise again.",
        });
      },
    });
  }, [completeMission, qc, loggedTypesForPromise, logAction]);

  const consistencyPct = useMemo(() => {
    const days = new Set<string>();
    const cutoff = Date.now() - 7 * 86400000;
    allActions.forEach((a: any) => {
      const t = new Date(a.completedAt).getTime();
      if (t >= cutoff) days.add(new Date(a.completedAt).toISOString().split("T")[0]);
    });
    return Math.round((days.size / 7) * 100);
  }, [allActions]);

  const { data: reflectionToday } = useQuery({
    queryKey: ["reflections", "today"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/reflections/today`, { credentials: "include" });
      if (!res.ok) return { reflected: false };
      return res.json();
    },
    staleTime: 60_000,
  });
  const hasReflectedToday = reflectionToday?.reflected === true;

  const CAREER_TO_IDENTITY: Record<string, string> = {
    "Mindset & Discipline":       "someone who shows up when it's hard",
    "Health & Fitness":           "someone who takes relentless care of their body",
    "Productivity & Focus":       "someone who masters their attention",
    "Habits & Consistency":       "someone who keeps every promise they make",
    "Education & Growth":         "someone who never stops growing",
    "Finance & Entrepreneurship": "someone who builds their own path",
    "Personal Growth":            "someone who is always evolving",
  };
  const identityStatement: string | null =
    (user as any)?.currentIdentity ??
    ((user as any)?.career
      ? `I am becoming ${CAREER_TO_IDENTITY[(user as any).career] ?? "someone who shows up every day"}.`
      : null);
  // ── Streak Freeze detection ──────────────────────────────────────────────
  const freezeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/api/users/me/streak-freeze`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getGetUserStatsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetTodayActionsQueryKey() });
      qc.invalidateQueries();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Couldn't apply streak freeze",
        description: "That didn't go through — try again in a moment.",
      });
    },
  });

  const showStreakFreeze = useMemo(() => {
    if (freezeDismissed) return false;
    if (freezeMutation.isSuccess) return false;
    if (actionsToday > 0) return false;
    if (streakDays < 3) return false;
    // Check if the most recent action was before yesterday (streak is broken)
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const hadActionYesterday = allActions.some(
      (a: any) => new Date(a.completedAt).toISOString().split("T")[0] === yesterdayStr
    );
    if (hadActionYesterday) return false;
    // Check no freeze used in last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    const hasRecentFreeze = allActions.some(
      (a: any) => a.type === "streak_freeze" && new Date(a.completedAt).getTime() > thirtyDaysAgo
    );
    if (hasRecentFreeze) return false;
    // Must have some history (not a new user with 0 total actions)
    const lastAction = allActions[0];
    if (!lastAction) return false;
    return true;
  }, [freezeDismissed, freezeMutation.isSuccess, actionsToday, streakDays, allActions]);

  const loggedTypes = useMemo(
    () => new Set((todayActions?.actions ?? []).map((a: any) => a.type)),
    [todayActions],
  );

  const completedMissions = missions
    ? [missions.criticalCompleted, missions.secondary1Completed, missions.secondary2Completed, missions.secondary3Completed, missions.courageCompleted].filter(Boolean).length
    : 0;

  const STREAK_MILESTONES = [7, 14, 21, 30, 60, 90];

  const handleQuickLog = useCallback((type: string) => {
    if (loggingType === type) return;
    const isFirstActionOfDay = actionsToday === 0;
    const potentialStreak = streakDays + 1;
    const isMilestone = isFirstActionOfDay && STREAK_MILESTONES.includes(potentialStreak);
    setLoggingType(type);
    logAction.mutate({ data: { type } } as any, {
      onSuccess: () => {
        setJustLogged(type);
        if (actionsToday === 0) setLastActionType(type);
        qc.invalidateQueries({ queryKey: getGetTodayActionsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetFutureSelfQueryKey() });
        qc.invalidateQueries({ queryKey: getGetUserStatsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetActionsQueryKey() });
        // Showing up and doing real work today IS keeping the promise —
        // reconcile Quick Log with Today's Promise so the payoff always fires,
        // regardless of which CTA the user used to take action.
        if (!missions?.criticalCompleted) {
          completeMission.mutate("critical", {
            onSuccess: () => qc.invalidateQueries({ queryKey: ["missions"] }),
          });
        }
        // Clear yesterday's promise once they start acting on it
        if (actionsToday === 0 && tomorrowPromise) {
          updateMe.mutate({ data: { tomorrowPromise: "" } } as any, {
            onSuccess: () => qc.invalidateQueries({ queryKey: getGetMeQueryKey() }),
          });
        }
        if (isFirstActionOfDay) {
          // Silently generate today's biography entry in the background —
          // it will be ready on the Biography page without a separate tap.
          generateBio.mutate(undefined as any, {
            onSuccess: () => qc.invalidateQueries({ queryKey: getGetBiographyQueryKey() }),
          });
          setTimeout(() => {
            setJustLogged(null);
            if (isMilestone) {
              setMilestoneStreak(potentialStreak);
              setShowMilestoneCard(true);
            } else {
              tomorrowAutoShownRef.current = true;
              setShowTomorrowPreview(true);
            }
          }, 3200);
        } else {
          setTimeout(() => setJustLogged(null), 3000);
        }
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Action didn't log",
          description: "We couldn't save that — check your connection and try again.",
        });
      },
      onSettled: () => setLoggingType(null),
    });
  }, [loggingType, logAction, qc, actionsToday, streakDays, missions, completeMission, tomorrowPromise, updateMe, generateBio]);

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">

        {/* Daily Briefing — personalized ASTRA message, changes every day */}
        <DailyBriefing
          firstName={firstName}
          streakDays={streakDays}
          actionsToday={actionsToday}
          alignScore={alignScore}
          tomorrowPromise={tomorrowPromise}
          dominantActionType={dominantActionType}
          weeklyActionCount={weeklyActionCount}
        />

        {/* Command Stats Bar — Future Alignment, Identity Score, Streak, Promise Streak */}
        <CommandStatsBar
          alignScore={alignScore}
          identityScore={Math.round(identityScore)}
          streakDays={streakDays}
          promiseStreak={user?.promiseStreak ?? 0}
        />

        {/* Today's Promise — the single daily commitment */}
        <TodaysPromiseCard
          promiseText={promiseText}
          isCompleted={promiseCompleted}
          isLoading={missionsLoading}
          onKeep={handleKeepPromise}
          isPending={completeMission.isPending}
          alignScore={alignScore}
        />

        {/* Identity Progress — the traits being built */}
        <IdentityProgressCard
          consistency={consistencyPct}
          discipline={currentSelf?.disciplineScore ?? 0}
          focus={currentSelf?.confidenceScore ?? 0}
        />

        {/* Identity Statement Strip */}
        {identityStatement && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/15 bg-primary/5"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
            <p className="flex-1 text-sm font-medium text-white/75 truncate italic">
              "{identityStatement}"
            </p>
            <Link
              href="/reflections"
              className="flex items-center gap-1.5 text-xs font-bold text-primary/60 hover:text-primary transition-colors shrink-0 whitespace-nowrap"
            >
              <PenLine className="w-3 h-3" />
              Reflect
            </Link>
          </motion.div>
        )}

        {/* Streak Freeze Recovery Card — shown when streak is broken and freeze available */}
        <AnimatePresence>
          {showStreakFreeze && (
            <StreakRecoveryCard
              streakDays={streakDays}
              isPending={freezeMutation.isPending}
              onFreeze={() => freezeMutation.mutate()}
              onDismiss={() => setFreezeDismissed(true)}
            />
          )}
        </AnimatePresence>

        {/* Freeze applied confirmation */}
        <AnimatePresence>
          {freezeMutation.isSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-emerald-500/30 bg-emerald-500/8 px-5 py-4 flex items-center gap-3"
            >
              <span className="text-lg">🧊</span>
              <div>
                <p className="text-sm font-bold text-emerald-400">Streak frozen.</p>
                <p className="text-xs text-muted-foreground">Log one action today to extend your {streakDays + 1}-day streak.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Streak status bar */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <StreakStatusBar streakDays={streakDays} actionsToday={actionsToday} firstName={firstName} allActions={allActions} />
        </motion.div>

        {/* Milestone Achievement Card — fires on streak milestones at peak motivation */}
        <AnimatePresence>
          {showMilestoneCard && (
            <MilestoneCard
              streakDays={milestoneStreak}
              firstName={firstName}
              onDismiss={() => setShowMilestoneCard(false)}
            />
          )}
        </AnimatePresence>

        {/* Tomorrow Preview — fires after first action of non-milestone day */}
        <AnimatePresence>
          {showTomorrowPreview && (
            <TomorrowPreview
              firstName={firstName}
              streakDays={streakDays}
              lastActionType={lastActionType}
              onDismiss={() => setShowTomorrowPreview(false)}
              onSavePromise={savePromise}
            />
          )}
        </AnimatePresence>

        {/* Alignment + Quick Log */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-white/5 bg-gradient-to-br from-[#0f0f1a] via-[#0d1017] to-[#0a0c14] p-8 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(124,58,237,0.12),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(59,130,246,0.08),transparent_60%)]" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10">
            <div className="shrink-0">
              {alignLoading ? (
                <div className="w-52 h-52 rounded-full bg-white/5 animate-pulse" />
              ) : (
                <AlignmentOrb score={alignScore} />
              )}
            </div>

            <div className="flex-1 w-full text-center lg:text-left">
              <p className="text-xs uppercase tracking-[0.3em] font-bold text-primary/70 mb-3">Future Alignment Score</p>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-2 leading-tight">
                YOUR FUTURE IS CURRENTLY{" "}
                <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                  {alignScore}% ALIGNED.
                </span>
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                Every action you take today shifts this number. Your future self is watching.
              </p>

              {/* ── QUICK LOG — the 1% improvement ── */}
              <QuickLogSection
                topActionType={topAction}
                loggedTypes={loggedTypes}
                onLog={handleQuickLog}
                justLogged={justLogged}
              />

              <div className="flex flex-wrap gap-6 mt-5 justify-center lg:justify-start">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-bold text-white">{actionsToday}</span>
                  <span className="text-xs text-muted-foreground">actions today</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold text-white">Ch. {currentChapter?.number ?? 1}</span>
                  <span className="text-xs text-muted-foreground">{currentChapter?.name ?? "Awakening"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary fill-primary" />
                  <span className="text-sm font-bold text-white">{completedMissions}/5</span>
                  <span className="text-xs text-muted-foreground">missions done</span>
                </div>
              </div>

              {/* Today's Gains — live score accumulator from today's logged actions */}
              <TodayGainsStrip actions={todayActions?.actions ?? []} />
            </div>
          </div>
        </motion.div>

        {/* Today's Evidence Strip — inline proof on the main screen */}
        <TodayEvidenceStrip actions={todayActions?.actions ?? []} />

        {/* Reflection Nudge — appears after 2+ actions logged, disappears once user reflects */}
        <ReflectionNudgeCard actionsToday={actionsToday} allPromisesKept={completedMissions === 5} />

        {/* Reflection Unlock — end-of-day capture once every promise is kept */}
        <AnimatePresence>
          {completedMissions === 5 && !hasReflectedToday && (
            <ReflectionUnlockCard onSubmitted={() => qc.invalidateQueries({ queryKey: ["reflections"] })} />
          )}
        </AnimatePresence>

        {/* Notification permission — soft banner, only shows when streak ≥ 1 and not yet asked */}
        <AnimatePresence>
          <NotificationPermissionBanner streakDays={streakDays} />
        </AnimatePresence>

        {/* Section divider — separates today's ritual (above) from exploration (below) */}
        <div className="flex items-center gap-3 pt-4">
          <div className="h-px flex-1 bg-white/8" />
          <span className="text-[11px] uppercase tracking-[0.25em] font-bold text-muted-foreground/60">
            Explore Your Journey
          </span>
          <div className="h-px flex-1 bg-white/8" />
        </div>

        {/* Quick cards row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Link href="/missions" className="block h-full rounded-2xl border border-white/5 bg-card/80 p-5 hover:border-primary/30 hover:bg-primary/5 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-xl bg-primary/10 p-2"><Target className="w-5 h-5 text-primary" /></div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <h3 className="font-bold text-white mb-1">Mission Control</h3>
              <p className="text-sm text-muted-foreground mb-3">Your AI-generated daily missions</p>
              {missions ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(completedMissions / 5) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-primary">{completedMissions}/5</span>
                </div>
              ) : (
                <p className="text-xs text-primary font-medium">Generate today's missions →</p>
              )}
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Link href="/future-self" className="block h-full rounded-2xl border border-white/5 bg-card/80 p-5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-xl bg-blue-500/10 p-2"><Zap className="w-5 h-5 text-blue-400" /></div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-400 transition-colors" />
              </div>
              <h3 className="font-bold text-white mb-3">Life Scores</h3>
              <div className="space-y-2">
                {[
                  { label: "Health",     score: currentSelf?.healthScore     ?? 0, color: "bg-emerald-500" },
                  { label: "Wealth",     score: currentSelf?.wealthScore     ?? 0, color: "bg-amber-500" },
                  { label: "Discipline", score: currentSelf?.disciplineScore ?? 0, color: "bg-blue-500" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16">{s.label}</span>
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.score}%` }} />
                    </div>
                    <span className="text-xs font-bold text-white w-6 text-right">{s.score}</span>
                  </div>
                ))}
              </div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Link href="/letters" className="block h-full rounded-2xl border border-white/5 bg-card/80 p-5 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-violet-500/10 transition-colors" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="rounded-xl bg-violet-500/10 p-2"><Mail className="w-5 h-5 text-violet-400" /></div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-400 transition-colors" />
                </div>
                <h3 className="font-bold text-white mb-1">Future Self Letter</h3>
                {latestLetter ? (
                  <>
                    <p className="text-xs font-medium text-violet-400/70 uppercase tracking-wider mb-2">Latest message</p>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 italic">
                      "{(latestLetter as any).content?.slice(0, 120)}…"
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-3">Receive a message from who you're becoming.</p>
                    <p className="text-xs font-bold text-violet-400">Read your first letter →</p>
                  </>
                )}
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Link href="/actions" className="block rounded-2xl border border-white/5 bg-card/80 p-5 hover:border-orange-500/30 transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <Flame className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-white">Log Today's Actions</h3>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-bold text-white">{actionsToday}/9 types</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${todayActions?.completionPercentage ?? 0}%` }} />
              </div>
              <p className="text-xs text-orange-400 font-medium mt-3 group-hover:text-orange-300">
                {(todayActions?.completionPercentage ?? 0) >= 100 ? "All done today! 🔥" : "Add more actions →"}
              </p>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Link href="/missions" className="block rounded-2xl border border-white/5 bg-card/80 p-5 hover:border-red-500/20 transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <Skull className="w-5 h-5 text-red-400/60" />
                <h3 className="font-bold text-white">Hall of Regret</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Potential opportunities you've missed in the last 30 days. Face them.
              </p>
              <p className="text-xs text-red-400/70 font-medium group-hover:text-red-400">View missed potential →</p>
            </Link>
          </motion.div>
        </div>

        {/* Today's Gains — cumulative score impact of all logged actions */}
        <AnimatePresence>
          {actionsToday >= 1 && <TodayGainsBar gains={todayGains} />}
        </AnimatePresence>

        {/* Daily Momentum — last 7 days ritual */}
        <WeeklyScorecard allActions={allActions} streakDays={streakDays} alignScore={alignScore} identityScore={identityScore} />

        {/* Closing Promise Card — persistent bottom reminder when user has acted but hasn't committed to tomorrow */}
        <AnimatePresence>
          {actionsToday >= 1 && !tomorrowPromise && !showTomorrowPreview && (
            <ClosingPromiseCard
              dominantActionType={dominantActionType}
              onSave={savePromise}
            />
          )}
        </AnimatePresence>

      </div>
    </AppLayout>
  );
}
