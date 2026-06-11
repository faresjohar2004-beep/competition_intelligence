import React, { useState } from "react";
import { useLocation } from "wouter";
import { useOnboardUser } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dumbbell, DollarSign, Brain, Zap, ArrowRight, CheckCircle2,
  Target, Clock, TrendingDown, Shuffle, Focus, BookOpen, Briefcase,
  AlertCircle, Lightbulb, Battery, BarChart3, Calendar,
} from "lucide-react";

type Step = 1 | 2 | 3;

interface Choice {
  value: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
}

const AREA_OPTIONS: Choice[] = [
  { value: "discipline", label: "Discipline",   sub: "Build unbreakable habits and elite focus",         icon: <Brain className="w-5 h-5" /> },
  { value: "fitness",    label: "Fitness",       sub: "Build a stronger, healthier body",                 icon: <Dumbbell className="w-5 h-5" /> },
  { value: "focus",      label: "Focus",         sub: "Master deep work and cut distractions",            icon: <Target className="w-5 h-5" /> },
  { value: "consistency",label: "Consistency",   sub: "Show up every single day without fail",            icon: <Zap className="w-5 h-5" /> },
  { value: "learning",   label: "Learning",      sub: "Compound knowledge and grow my skills daily",     icon: <BookOpen className="w-5 h-5" /> },
  { value: "business",   label: "Business",      sub: "Build income, wealth, and financial freedom",     icon: <Briefcase className="w-5 h-5" /> },
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
  { value: "7",  label: "7 Days",  sub: "A week to prove it to myself",        icon: <span className="text-xl">🌱</span> },
  { value: "30", label: "30 Days", sub: "A month to build real momentum",       icon: <span className="text-xl">🔥</span> },
  { value: "90", label: "90 Days", sub: "Three months to transform my identity", icon: <span className="text-xl">⚡</span> },
];

const STEPS = [
  {
    step: 1,
    question: "What area do you want to improve most?",
    sub: "ASTRA will tailor your daily actions and future projections around this.",
    options: AREA_OPTIONS,
  },
  {
    step: 2,
    question: "What is your biggest challenge?",
    sub: "Be honest — this is how ASTRA addresses your actual gap, not a generic plan.",
    options: CHALLENGE_OPTIONS,
  },
  {
    step: 3,
    question: "How many days will you commit?",
    sub: "Your streak tracker and missions will be built around this commitment.",
    options: COMMITMENT_OPTIONS,
  },
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

const CHALLENGE_MAP: Record<string, string> = {
  dont_finish:    "Starting strong but losing momentum before finishing",
  lack_discipline:"Knowing what to do but struggling to make myself do it",
  distracted:     "Getting distracted and struggling to maintain deep focus",
  no_system:      "Lacking a clear structure and system for daily actions",
  procrastinate:  "Delaying important tasks indefinitely and losing time",
  lose_motivation:"Unable to sustain energy, drive, and motivation over time",
};

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

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const onboardUser = useOnboardUser();

  const [step, setStep] = useState<Step>(1);
  const [area, setArea] = useState("");
  const [challenge, setChallenge] = useState("");
  const [commitment, setCommitment] = useState("");
  const [direction, setDirection] = useState<1 | -1>(1);

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
          dailyHabits:      area === "fitness" ? "Working out, sleeping well, eating clean"
                          : area === "business" ? "Learning, deep work, financial tracking"
                          : area === "discipline" ? "Morning routines, journaling, focus blocks"
                          : "Reading, working out, meditation, deep work",
        },
      },
      { onSuccess: () => setLocation("/dashboard") }
    );
  };

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
