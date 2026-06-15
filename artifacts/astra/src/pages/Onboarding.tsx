import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useOnboardUser } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dumbbell, DollarSign, Brain, Zap, ArrowRight, CheckCircle2,
  Target, Clock, TrendingDown, Shuffle, Focus, BookOpen, Briefcase,
  AlertCircle, Lightbulb, Battery, BarChart3, Calendar, Shield,
  Flame, Sparkles, ChevronRight,
} from "lucide-react";

type Step = 1 | 2 | 3;

interface Choice {
  value: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
}

const AREA_OPTIONS: Choice[] = [
  { value: "discipline", label: "Discipline",   sub: "Build unbreakable habits and elite focus",          icon: <Brain className="w-5 h-5" /> },
  { value: "fitness",    label: "Fitness",       sub: "Build a stronger, healthier body",                  icon: <Dumbbell className="w-5 h-5" /> },
  { value: "focus",      label: "Focus",         sub: "Master deep work and cut distractions",             icon: <Target className="w-5 h-5" /> },
  { value: "consistency",label: "Consistency",   sub: "Show up every single day without fail",             icon: <Zap className="w-5 h-5" /> },
  { value: "learning",   label: "Learning",      sub: "Compound knowledge and grow my skills daily",      icon: <BookOpen className="w-5 h-5" /> },
  { value: "business",   label: "Business",      sub: "Build income, wealth, and financial freedom",      icon: <Briefcase className="w-5 h-5" /> },
];

const CHALLENGE_OPTIONS: Choice[] = [
  { value: "dont_finish",    label: "I start but don't finish",  sub: "I have energy at the start but lose momentum",  icon: <TrendingDown className="w-5 h-5" /> },
  { value: "lack_discipline",label: "I lack discipline",         sub: "I know what to do but can't make myself do it", icon: <AlertCircle className="w-5 h-5" /> },
  { value: "distracted",     label: "I get distracted",          sub: "My attention is constantly being pulled away",  icon: <Shuffle className="w-5 h-5" /> },
  { value: "no_system",      label: "I have no system",          sub: "I'm inconsistent because I lack structure",     icon: <BarChart3 className="w-5 h-5" /> },
  { value: "procrastinate",  label: "I procrastinate",           sub: "I delay the important things indefinitely",     icon: <Clock className="w-5 h-5" /> },
  { value: "lose_motivation",label: "I lose motivation",         sub: "I can't sustain energy and drive over time",    icon: <Battery className="w-5 h-5" /> },
];

const COMMITMENT_OPTIONS: Choice[] = [
  { value: "7",  label: "7 Days",  sub: "A week to prove it to myself",         icon: <span className="text-xl">🌱</span> },
  { value: "30", label: "30 Days", sub: "A month to build real momentum",        icon: <span className="text-xl">🔥</span> },
  { value: "90", label: "90 Days", sub: "Three months to transform my identity", icon: <span className="text-xl">⚡</span> },
];

const STEPS = [
  { step: 1, question: "What area do you want to improve most?",    sub: "ASTRA will tailor your daily actions and future projections around this.", options: AREA_OPTIONS },
  { step: 2, question: "What is your biggest challenge?",           sub: "Be honest — this is how ASTRA addresses your actual gap, not a generic plan.", options: CHALLENGE_OPTIONS },
  { step: 3, question: "How many days will you commit?",            sub: "Your streak tracker and missions will be built around this commitment.",     options: COMMITMENT_OPTIONS },
] as const;

const AREA_GOALS: Record<string, string> = {
  discipline: "Master discipline, develop unbreakable habits, and dominate my focus",
  fitness:    "Build an elite body, maximize energy, and maintain peak physical health",
  focus:      "Master deep focus, eliminate distractions, and do my best work every day",
  consistency:"Show up every single day and build unstoppable consistency in all areas",
  learning:   "Compound knowledge daily and invest in my skills and mental growth",
  business:   "Build significant wealth, grow my income, and achieve financial freedom",
};

const AREA_CAREER: Record<string, string> = {
  discipline: "High Performance",
  fitness:    "Health & Fitness",
  focus:      "Deep Work & Productivity",
  consistency:"Habit Building",
  learning:   "Continuous Learning",
  business:   "Finance & Entrepreneurship",
};

const AREA_IDENTITY: Record<string, string> = {
  discipline: "someone who shows up when it's hard",
  fitness:    "someone who refuses to let their body fail them",
  focus:      "someone who does their best work every single day",
  consistency:"someone who keeps every promise they make to themselves",
  learning:   "someone who compounds knowledge into an unfair advantage",
  business:   "someone who builds their freedom one day at a time",
};

const AREA_PROMISE: Record<string, string> = {
  discipline: "Complete a full morning routine",
  fitness:    "Work out for 20 minutes",
  focus:      "Do 90 minutes of uninterrupted deep work",
  consistency:"Log one action before noon",
  learning:   "Read or study for 30 minutes",
  business:   "Work on your income for 60 minutes",
};

const CHALLENGE_MAP: Record<string, string> = {
  dont_finish:    "Starting strong but losing momentum before finishing",
  lack_discipline:"Knowing what to do but struggling to make myself do it",
  distracted:     "Getting distracted and struggling to maintain deep focus",
  no_system:      "Lacking a clear structure and system for daily actions",
  procrastinate:  "Delaying important tasks indefinitely and losing time",
  lose_motivation:"Unable to sustain energy, drive, and motivation over time",
};

const CHALLENGE_FIX: Record<string, string> = {
  dont_finish:    "Completion systems that build follow-through",
  lack_discipline:"Daily accountability that makes action automatic",
  distracted:     "Focus protocols and distraction elimination",
  no_system:      "A structured daily action system built for you",
  procrastinate:  "Anti-procrastination triggers and momentum builders",
  lose_motivation:"Identity reinforcement that keeps drive alive",
};

const AREA_COLOR: Record<string, string> = {
  discipline: "from-purple-500 to-violet-600",
  fitness:    "from-orange-500 to-red-500",
  focus:      "from-blue-500 to-cyan-500",
  consistency:"from-emerald-500 to-teal-500",
  learning:   "from-yellow-500 to-amber-500",
  business:   "from-green-500 to-emerald-600",
};

// ─── Option card ─────────────────────────────────────────────────────────────
function OptionCard({ choice, selected, onSelect }: { choice: Choice; selected: boolean; onSelect: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 flex items-center gap-4 ${
        selected
          ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(124,58,237,0.15)]"
          : "border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/5"
      }`}
    >
      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
        selected ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground"
      }`}>
        {choice.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold leading-tight ${selected ? "text-white" : "text-foreground"}`}>{choice.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{choice.sub}</p>
      </div>
      <div className={`shrink-0 w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
        selected ? "border-primary bg-primary" : "border-white/20"
      }`}>
        {selected && <CheckCircle2 className="w-3.5 h-3.5 text-white fill-white" />}
      </div>
    </motion.button>
  );
}

// ─── Completion screen ────────────────────────────────────────────────────────
function CompletionScreen({
  firstName, area, challenge, commitment,
  onEnter,
}: {
  firstName: string;
  area: string;
  challenge: string;
  commitment: string;
  onEnter: () => void;
}) {
  const [phase, setPhase] = useState<"building" | "reveal" | "cta">("building");
  const areaLabel = AREA_OPTIONS.find((o) => o.value === area)?.label ?? area;
  const challengeLabel = CHALLENGE_OPTIONS.find((o) => o.value === challenge)?.label ?? challenge;
  const commitmentLabel = commitment === "7" ? "7-day sprint" : commitment === "30" ? "30-day transformation" : "90-day identity shift";
  const areaIconComp = AREA_OPTIONS.find((o) => o.value === area)?.icon;
  const gradient = AREA_COLOR[area] ?? "from-primary to-blue-500";

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("reveal"), 1400);
    const t2 = setTimeout(() => setPhase("cta"), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="min-h-screen bg-[#08090f] text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.18),transparent_55%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(59,130,246,0.08),transparent_60%)] pointer-events-none" />

      {/* Particle ring */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: phase === "building" ? 1 : 0.15, scale: phase === "building" ? 1 : 1.4 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="w-[420px] h-[420px] rounded-full border border-primary/20"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: phase === "building" ? 0.6 : 0.08, scale: phase === "building" ? 1 : 1.6 }}
          transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
          className="absolute w-[300px] h-[300px] rounded-full border border-primary/30"
        />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">

        {/* Phase: building */}
        <AnimatePresence mode="wait">
          {phase === "building" && (
            <motion.div
              key="building"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center text-center"
            >
              {/* Animated orb */}
              <div className="relative mb-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="w-20 h-20 rounded-full border-2 border-transparent border-t-primary border-l-primary/50"
                />
                <div className={`absolute inset-2 rounded-full bg-gradient-to-br ${gradient} opacity-20`} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
              </div>
              <p className="text-xs font-bold text-primary/60 uppercase tracking-[0.3em] mb-3">ASTRAVITA</p>
              <h2 className="text-2xl font-black text-white">Building your future self…</h2>
              <p className="text-sm text-muted-foreground mt-2">Calibrating your personal path</p>

              {/* Animated build items */}
              <div className="mt-8 space-y-2.5 w-full">
                {[
                  "Mapping your identity profile",
                  "Configuring daily action system",
                  "Generating your first mission",
                ].map((label, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.28, duration: 0.35 }}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/3 border border-white/6 text-left"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5 + i * 0.28, type: "spring", stiffness: 300 }}
                      className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    </motion.div>
                    <span className="text-sm text-muted-foreground">{label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Phase: reveal + cta */}
          {(phase === "reveal" || phase === "cta") && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-full flex flex-col items-center"
            >
              {/* Headline */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-center mb-7"
              >
                <p className="text-xs font-bold text-emerald-400/80 uppercase tracking-[0.3em] mb-2 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Profile Ready
                </p>
                <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                  Your path has been<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">built, {firstName}.</span>
                </h1>
              </motion.div>

              {/* Three profile cards */}
              <div className="w-full space-y-2.5 mb-6">
                {/* Area */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/3 border border-white/8"
                >
                  <div className={`shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
                    {areaIconComp}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em] mb-0.5">Your Focus</p>
                    <p className="text-sm font-bold text-white">{areaLabel}</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">{AREA_GOALS[area]?.split(",")[0]}</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                </motion.div>

                {/* Challenge */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.22, duration: 0.4 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/3 border border-white/8"
                >
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em] mb-0.5">Your Block — Addressed</p>
                    <p className="text-sm font-bold text-white">{challengeLabel}</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">{CHALLENGE_FIX[challenge]}</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                </motion.div>

                {/* Commitment */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.34, duration: 0.4 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/3 border border-white/8"
                >
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em] mb-0.5">Your Commitment</p>
                    <p className="text-sm font-bold text-white capitalize">{commitmentLabel}</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">Day 1 of {commitment} starts right now</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                </motion.div>
              </div>

              {/* Identity statement */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="w-full mb-7 px-5 py-4 rounded-2xl border border-primary/20 bg-primary/5 text-center"
              >
                <p className="text-xs font-bold text-primary/60 uppercase tracking-[0.2em] mb-1.5">Your New Identity</p>
                <p className="text-base font-bold text-white leading-snug">
                  You are becoming{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                    {AREA_IDENTITY[area] ?? "someone who takes daily action toward their future self"}
                  </span>.
                </p>
              </motion.div>

              {/* First promise */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.62, duration: 0.4 }}
                className="w-full mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-[0.2em]">Your First Promise</p>
                  <p className="text-sm font-bold text-white mt-0.5">{AREA_PROMISE[area]}</p>
                </div>
              </motion.div>

              {/* CTA button */}
              <AnimatePresence>
                {phase === "cta" && (
                  <motion.button
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onEnter}
                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-blue-500 text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(124,58,237,0.4)] hover:shadow-[0_0_40px_rgba(124,58,237,0.55)] transition-shadow"
                  >
                    Begin Day 1
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const onboardUser = useOnboardUser();

  const [step, setStep] = useState<Step>(1);
  const [area, setArea] = useState("");
  const [challenge, setChallenge] = useState("");
  const [commitment, setCommitment] = useState("");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [showCompletion, setShowCompletion] = useState(false);

  const selections: Record<Step, string> = { 1: area, 2: challenge, 3: commitment };
  const setters: Record<Step, (v: string) => void> = { 1: setArea, 2: setChallenge, 3: setCommitment };

  const currentStep = STEPS.find((s) => s.step === step)!;
  const currentValue = selections[step];
  const canAdvance = !!currentValue;

  const advance = () => {
    if (!canAdvance) return;
    if (step < 3) {
      setDirection(1);
      setStep((s) => (s + 1) as Step);
    } else {
      handleSubmit();
    }
  };

  const back = () => {
    if (step > 1) {
      setDirection(-1);
      setStep((s) => (s - 1) as Step);
    }
  };

  const handleSubmit = () => {
    if (!user) return;
    onboardUser.mutate(
      {
        data: {
          clerkId:          user.id,
          name:             user.fullName || "User",
          email:            user.primaryEmailAddress?.emailAddress || "",
          avatarUrl:        user.imageUrl,
          age:              30,
          gender:           "Prefer not to say",
          fitnessLevel:     commitment === "7" ? "Beginner" : commitment === "30" ? "Intermediate" : "Advanced",
          incomeRange:      "Prefer not to say",
          career:           AREA_CAREER[area] ?? "Personal Growth",
          mainGoals:        AREA_GOALS[area] ?? "Grow and improve every area of my life",
          biggestStruggles: CHALLENGE_MAP[challenge] ?? "Staying consistent and taking daily action",
          dailyHabits:      area === "fitness"    ? "Working out, sleeping well, eating clean"
                          : area === "business"   ? "Learning, deep work, financial tracking"
                          : area === "discipline" ? "Morning routines, journaling, focus blocks"
                          : "Reading, working out, meditation, deep work",
        },
      },
      { onSuccess: () => setShowCompletion(true) }
    );
  };

  const firstName = (user?.fullName || user?.firstName || "You").split(" ")[0];

  if (showCompletion) {
    return (
      <CompletionScreen
        firstName={firstName}
        area={area}
        challenge={challenge}
        commitment={commitment}
        onEnter={() => setLocation("/dashboard")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#08090f] text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.12),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(59,130,246,0.06),transparent_60%)] pointer-events-none" />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-white/5 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-blue-400"
          animate={{ width: `${((step - 1) / 3) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Logo */}
      <div className="mb-8 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center font-black text-white text-sm">A</div>
        <span className="text-lg font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">ASTRAVITA</span>
      </div>

      <div className="w-full max-w-lg relative">
        {/* Step dots */}
        <div className="flex items-center gap-2 mb-7">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              s < step ? "bg-primary" : s === step ? "bg-primary/60" : "bg-white/10"
            }`} />
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <div className="mb-6">
              <p className="text-xs font-bold text-primary/60 uppercase tracking-[0.25em] mb-2">
                Step {step} of 3 · Your Assessment
              </p>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-2">
                {currentStep.question}
              </h1>
              <p className="text-sm text-muted-foreground">{currentStep.sub}</p>
            </div>

            <div className="space-y-2.5 mb-6">
              {currentStep.options.map((opt) => (
                <OptionCard
                  key={opt.value}
                  choice={opt}
                  selected={currentValue === opt.value}
                  onSelect={() => setters[step](opt.value)}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button
              onClick={back}
              className="flex-none px-5 h-12 rounded-xl border border-white/10 text-muted-foreground text-sm font-medium hover:border-white/20 hover:text-foreground transition-all"
            >
              Back
            </button>
          )}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={advance}
            disabled={!canAdvance || onboardUser.isPending}
            className={`flex-1 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              canAdvance && !onboardUser.isPending
                ? "bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]"
                : "bg-white/5 text-white/30 cursor-not-allowed"
            }`}
          >
            {onboardUser.isPending ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Building your future self…
              </>
            ) : step === 3 ? (
              <>Generate My Future Self <Zap className="w-4 h-4 fill-white" /></>
            ) : (
              <>Continue <ArrowRight className="w-4 h-4" /></>
            )}
          </motion.button>
        </div>

        <p className="text-xs text-muted-foreground/40 text-center mt-4">
          Takes 45 seconds · Your answers shape everything ASTRA shows you
        </p>
      </div>
    </div>
  );
}
