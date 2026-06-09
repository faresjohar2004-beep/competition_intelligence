import React, { useState } from "react";
import { useLocation } from "wouter";
import { useOnboardUser } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell, DollarSign, Brain, Zap, ArrowRight, CheckCircle2, Target, Clock, TrendingDown, Shuffle } from "lucide-react";

type Step = 1 | 2 | 3 | 4;

interface Choice {
  value: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
}

const FOCUS_OPTIONS: Choice[] = [
  { value: "fitness",    label: "Body & Health",        sub: "Build the physique and energy I deserve",    icon: <Dumbbell className="w-6 h-6" /> },
  { value: "wealth",     label: "Wealth & Career",       sub: "Build income, assets, and financial freedom", icon: <DollarSign className="w-6 h-6" /> },
  { value: "discipline", label: "Elite Discipline",      sub: "Master my habits, focus, and consistency",   icon: <Brain className="w-6 h-6" /> },
  { value: "all",        label: "Total Transformation",  sub: "I want to level up in every area of life",   icon: <Zap className="w-6 h-6" /> },
];

const STRUGGLE_OPTIONS: Choice[] = [
  { value: "consistency", label: "I lose momentum",       sub: "I start strong but fade after a few days",    icon: <TrendingDown className="w-6 h-6" /> },
  { value: "action",      label: "I know but don't do",   sub: "I have the knowledge — I just don't act",     icon: <Target className="w-6 h-6" /> },
  { value: "focus",       label: "I get distracted",      sub: "My attention is constantly being pulled away", icon: <Shuffle className="w-6 h-6" /> },
  { value: "time",        label: "I run out of time",      sub: "I'm busy, overwhelmed, and can't find space",  icon: <Clock className="w-6 h-6" /> },
];

const LEVEL_OPTIONS: Choice[] = [
  { value: "Beginner",     label: "Just Starting",   sub: "I'm building the foundation right now",          icon: <span className="text-2xl">🌱</span> },
  { value: "Intermediate", label: "In the Game",     sub: "I'm consistent but want to push further",        icon: <span className="text-2xl">🔥</span> },
  { value: "Advanced",     label: "Already Dialed",  sub: "I'm disciplined — I'm here to optimize",         icon: <span className="text-2xl">⚡</span> },
];

const AGE_OPTIONS: Choice[] = [
  { value: "20", label: "Under 25",  sub: "Building the foundation early", icon: <span className="text-2xl">🚀</span> },
  { value: "30", label: "25 – 34",   sub: "Peak performance decade",       icon: <span className="text-2xl">💎</span> },
  { value: "40", label: "35 – 44",   sub: "Elevation and mastery",         icon: <span className="text-2xl">🏔</span> },
  { value: "50", label: "45+",       sub: "Legacy and longevity",          icon: <span className="text-2xl">👑</span> },
];

const STEPS = [
  { step: 1, question: "What's your primary focus?",          sub: "ASTRA will tailor your missions and projections around this.",    options: FOCUS_OPTIONS },
  { step: 2, question: "What's your biggest obstacle?",       sub: "Be honest — this helps ASTRA address your actual gap.",          options: STRUGGLE_OPTIONS },
  { step: 3, question: "Where are you right now?",            sub: "No judgment — just calibration.",                                options: LEVEL_OPTIONS },
  { step: 4, question: "What's your age range?",              sub: "Your future projection is calibrated to your life stage.",       options: AGE_OPTIONS },
] as const;

const FOCUS_GOALS: Record<string, string> = {
  fitness:    "Build an elite body, maximize energy, and maintain peak physical health",
  wealth:     "Build significant wealth, grow my income, and achieve financial freedom",
  discipline: "Master discipline, develop unbreakable habits, and dominate my focus",
  all:        "Transform every area of my life — health, wealth, discipline, and relationships",
};

const STRUGGLE_MAP: Record<string, string> = {
  consistency: "Losing momentum and breaking habits",
  action:      "Knowing what to do but not doing it — the intention-action gap",
  focus:       "Getting distracted and struggling to maintain deep focus",
  time:        "Feeling overwhelmed, busy, and unable to carve out time for growth",
};

function OptionCard({ choice, selected, onSelect }: { choice: Choice; selected: boolean; onSelect: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border p-4 sm:p-5 transition-all duration-200 flex items-center gap-4 ${
        selected
          ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(124,58,237,0.15)]"
          : "border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/5"
      }`}
    >
      <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
        selected ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground"
      }`}>
        {choice.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold leading-tight ${selected ? "text-white" : "text-foreground"}`}>{choice.label}</p>
        <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{choice.sub}</p>
      </div>
      <div className={`shrink-0 w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
        selected ? "border-primary bg-primary" : "border-white/20"
      }`}>
        {selected && <CheckCircle2 className="w-3.5 h-3.5 text-white fill-white" />}
      </div>
    </motion.button>
  );
}

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const onboardUser = useOnboardUser();

  const [step, setStep] = useState<Step>(1);
  const [focus, setFocus]       = useState<string>("");
  const [struggle, setStruggle] = useState<string>("");
  const [level, setLevel]       = useState<string>("");
  const [age, setAge]           = useState<string>("");
  const [direction, setDirection] = useState<1 | -1>(1);

  const selections: Record<Step, string> = { 1: focus, 2: struggle, 3: level, 4: age };
  const setters: Record<Step, (v: string) => void> = { 1: setFocus, 2: setStruggle, 3: setLevel, 4: setAge };

  const currentStep = STEPS.find((s) => s.step === step)!;
  const currentValue = selections[step];
  const canAdvance = !!currentValue;

  const advance = () => {
    if (!canAdvance) return;
    if (step < 4) {
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
    const ageNum = parseInt(age, 10);

    const careerMap: Record<string, string> = {
      fitness:    "Health & Fitness",
      wealth:     "Finance & Entrepreneurship",
      discipline: "High Performance",
      all:        "Life Optimization",
    };

    onboardUser.mutate(
      {
        data: {
          clerkId:         user.id,
          name:            user.fullName || "User",
          email:           user.primaryEmailAddress?.emailAddress || "",
          avatarUrl:       user.imageUrl,
          age:             ageNum,
          gender:          "Prefer not to say",
          fitnessLevel:    level,
          incomeRange:     focus === "wealth" ? "$50k - $100k" : "Prefer not to say",
          career:          careerMap[focus] ?? "Personal Growth",
          mainGoals:       FOCUS_GOALS[focus] ?? "Grow and improve every area of my life",
          biggestStruggles: STRUGGLE_MAP[struggle] ?? "Staying consistent and taking daily action",
          dailyHabits:     focus === "fitness" ? "Working out, sleeping well, eating clean"
                         : focus === "wealth"  ? "Learning, deep work, financial tracking"
                         : focus === "discipline" ? "Morning routines, journaling, focus blocks"
                         : "Reading, working out, meditation, deep work",
        },
      },
      { onSuccess: () => setLocation("/dashboard") }
    );
  };

  const progressPct = ((step - 1) / 4) * 100;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.12),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(59,130,246,0.06),transparent_60%)] pointer-events-none" />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-white/5 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-blue-400"
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Logo */}
      <div className="mb-8 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center font-black text-white text-sm">
          A
        </div>
        <span className="text-lg font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
          ASTRA
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-5">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    s < step ? "bg-primary" : s === step ? "bg-primary/60" : "bg-white/10"
                  }`}
                />
              ))}
            </div>

            {/* Question */}
            <div className="mb-6">
              <p className="text-xs font-bold text-primary/60 uppercase tracking-[0.25em] mb-2">
                Step {step} of 4
              </p>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-2">
                {currentStep.question}
              </h1>
              <p className="text-sm text-muted-foreground">{currentStep.sub}</p>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-6">
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
            ) : step === 4 ? (
              <>Generate My Future Self <Zap className="w-4 h-4 fill-white" /></>
            ) : (
              <>Continue <ArrowRight className="w-4 h-4" /></>
            )}
          </motion.button>
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground/50 text-center mt-4">
          Takes 45 seconds · Your answers shape everything ASTRA shows you
        </p>
      </div>
    </div>
  );
}
