import React, { useMemo, useState, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import {
  useGetMe, useGetFutureSelf, useGetTodayActions, useGetCurrentChapter, useGetUserStats,
  useLogAction,
  getGetTodayActionsQueryKey, getGetFutureSelfQueryKey, getGetUserStatsQueryKey,
} from "@workspace/api-client-react";
import { useAlignment, useMissions } from "@/hooks/useMissions";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Target, Trophy, Flame, Shield, Skull, ArrowRight, AlertTriangle,
  CheckCircle, Star, Dumbbell, BookOpen, Brain, Video, Leaf, DollarSign,
  Laptop, Moon, Droplets, CheckCircle2, Sparkles,
} from "lucide-react";

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

function DailyBriefing({
  firstName,
  streakDays,
  actionsToday,
  alignScore,
}: {
  firstName: string;
  streakDays: number;
  actionsToday: number;
  alignScore: number;
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
  const body = tier.bodies[bodyIdx];

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

type StreakState = "zero" | "unprotected" | "safe" | "legendary";
function getStreakState(streakDays: number, actionsToday: number): StreakState {
  if (streakDays === 0 && actionsToday === 0) return "zero";
  if (actionsToday === 0) return "unprotected";
  if (actionsToday >= 6) return "legendary";
  return "safe";
}

function StreakStatusBar({ streakDays, actionsToday, firstName }: { streakDays: number; actionsToday: number; firstName: string }) {
  const now = new Date();
  const hour = now.getHours();
  const state = getStreakState(streakDays, actionsToday);
  const minutesLeft = (23 - hour) * 60 + (59 - now.getMinutes());
  const hoursLeft = Math.floor(minutesLeft / 60);
  const timeLabel = hoursLeft > 1 ? `${hoursLeft}h left today` : minutesLeft > 30 ? `${hoursLeft}h ${minutesLeft % 60}m left` : `${minutesLeft}m left — act now`;
  const isLate = hour >= 20;

  const config = {
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

  return (
    <AnimatePresence mode="wait">
      <motion.div key={state} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.35 }}
        className={`rounded-2xl border ${config.border} ${config.bg} px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5`}>
        {state === "unprotected" && (
          <div className="absolute -top-1 -right-1 w-3 h-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </div>
        )}
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

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const qc = useQueryClient();
  const { data: user } = useGetMe();
  const { data: stats } = useGetUserStats();
  const { data: futureSelves } = useGetFutureSelf();
  const { data: todayActions } = useGetTodayActions();
  const { data: currentChapter } = useGetCurrentChapter();
  const { data: alignment, isLoading: alignLoading } = useAlignment();
  const { data: missions } = useMissions();
  const logAction = useLogAction();

  const [justLogged, setJustLogged] = useState<string | null>(null);
  const [loggingType, setLoggingType] = useState<string | null>(null);

  const currentSelf = futureSelves?.find((f) => f.timeframe === "current");
  const alignScore = alignment?.alignmentScore ?? 0;
  const topAction = alignment?.topAction ?? "workout";
  const firstName = user?.name?.split(" ")[0] ?? "Explorer";
  const streakDays = stats?.streakDays ?? 0;
  const actionsToday = todayActions?.actions?.length ?? 0;
  const loggedTypes = useMemo(
    () => new Set((todayActions?.actions ?? []).map((a: any) => a.type)),
    [todayActions],
  );

  const completedMissions = missions
    ? [missions.criticalCompleted, missions.secondary1Completed, missions.secondary2Completed, missions.secondary3Completed, missions.courageCompleted].filter(Boolean).length
    : 0;

  const handleQuickLog = useCallback((type: string) => {
    if (loggingType === type) return;
    setLoggingType(type);
    logAction.mutate({ data: { type } } as any, {
      onSuccess: () => {
        setJustLogged(type);
        qc.invalidateQueries({ queryKey: getGetTodayActionsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetFutureSelfQueryKey() });
        qc.invalidateQueries({ queryKey: getGetUserStatsQueryKey() });
        // Clear identity flash after 3s
        setTimeout(() => setJustLogged(null), 3000);
      },
      onSettled: () => setLoggingType(null),
    });
  }, [loggingType, logAction, qc]);

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">

        {/* Daily Briefing — personalized ASTRA message, changes every day */}
        <DailyBriefing
          firstName={firstName}
          streakDays={streakDays}
          actionsToday={actionsToday}
          alignScore={alignScore}
        />

        {/* Streak status bar */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <StreakStatusBar streakDays={streakDays} actionsToday={actionsToday} firstName={firstName} />
        </motion.div>

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
            </div>
          </div>
        </motion.div>

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
            <Link href="/missions" className="block h-full rounded-2xl border border-white/5 bg-card/80 p-5 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-xl bg-amber-500/10 p-2"><Trophy className="w-5 h-5 text-amber-400" /></div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-400 transition-colors" />
              </div>
              <h3 className="font-bold text-white mb-1">Hall of Legends</h3>
              <p className="text-sm text-muted-foreground mb-3">Your earned milestones</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-amber-400">{alignment?.newMilestonesEarned?.length ?? 0}</span>
                <span className="text-xs text-muted-foreground">new milestones available</span>
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

      </div>
    </AppLayout>
  );
}
