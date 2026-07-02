import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  ArrowRight, CheckCircle2, Flame, Zap, Shield, TrendingUp,
  Target, Brain, Repeat2, ChevronRight,
} from "lucide-react";

// ─── Animated counter ────────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.ceil(to / 40);
    const t = setInterval(() => {
      start = Math.min(start + step, to);
      setCount(start);
      if (start >= to) clearInterval(t);
    }, 28);
    return () => clearInterval(t);
  }, [inView, to]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// ─── Preview card ─────────────────────────────────────────────────────────────
function PreviewCard({ label, children, delay, accent }: { label: string; children: React.ReactNode; delay: number; accent: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={`rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-5 flex flex-col gap-3 hover:border-white/15 transition-colors`}
    >
      <p className={`text-xs font-bold uppercase tracking-[0.2em] ${accent}`}>{label}</p>
      {children}
    </motion.div>
  );
}

// ─── Step item ────────────────────────────────────────────────────────────────
function Step({ n, title, sub, last = false }: { n: number; title: string; sub: string; last?: boolean }) {
  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full border border-primary/40 bg-primary/10 flex items-center justify-center text-primary font-black text-sm shrink-0">
          {n}
        </div>
        {!last && <div className="w-px flex-1 bg-gradient-to-b from-primary/20 to-transparent mt-2" />}
      </div>
      <div className={`${last ? "" : "pb-10"}`}>
        <p className="font-bold text-white text-base mb-1">{title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{sub}</p>
      </div>
    </div>
  );
}

// ─── Pillar card ──────────────────────────────────────────────────────────────
function Pillar({ icon: Icon, label, sub, delay }: { icon: React.ElementType; label: string; sub: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="rounded-2xl border border-white/8 bg-white/3 p-6 hover:border-primary/30 hover:bg-primary/5 transition-all"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="font-bold text-white text-lg mb-2">{label}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{sub}</p>
    </motion.div>
  );
}

// ─── Main landing ─────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="min-h-screen bg-[#08090f] text-foreground overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#08090f]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center font-black text-white text-xs">A</div>
            <span className="text-sm font-bold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">ASTRA OS</span>
          </div>
          <Link href="/sign-in" className="text-xs font-semibold text-muted-foreground hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5">
            Sign In
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-5 pt-14 overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(124,58,237,0.18),transparent)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_80%_80%,rgba(59,130,246,0.06),transparent)] pointer-events-none" />
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-3xl mx-auto text-center">
          {/* Brand badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 border border-primary/30 bg-primary/10 rounded-full px-4 py-1.5 mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold tracking-[0.2em] text-primary/90 uppercase">Future Self Simulator</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.06] mb-6"
          >
            Become Who You<br />
            <span className="bg-gradient-to-r from-primary via-violet-400 to-blue-400 bg-clip-text text-transparent">
              Said You'd Be.
            </span>
          </motion.h1>

          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="flex items-center justify-center gap-4 mb-10"
          >
            {["Daily actions.", "Identity tracking.", "AI guidance."].map((line, i) => (
              <React.Fragment key={i}>
                <p className="text-base sm:text-lg text-muted-foreground font-medium">{line}</p>
                {i < 2 && <span className="w-1 h-1 rounded-full bg-muted-foreground/30 shrink-0" />}
              </React.Fragment>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link href="/onboarding"
              className="inline-flex items-center justify-center gap-2 h-13 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold transition-all shadow-[0_0_30px_rgba(124,58,237,0.35)] hover:shadow-[0_0_40px_rgba(124,58,237,0.5)]">
              Start Assessment <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/sign-in"
              className="inline-flex items-center justify-center h-13 px-8 rounded-xl border border-white/12 bg-white/5 hover:bg-white/8 text-white text-sm font-semibold transition-all">
              Sign In
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xs text-muted-foreground/50 mt-4"
          >
            Takes 45 seconds · No credit card required
          </motion.p>
        </div>

        {/* ── Preview Cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="relative z-10 w-full max-w-3xl mx-auto mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {/* Future Alignment */}
          <PreviewCard label="Future Alignment" delay={0} accent="text-primary/80">
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-white"><Counter to={87} suffix="%" /></span>
            </div>
            <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: "87%" }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full"
              />
            </div>
            <p className="text-xs text-muted-foreground">Actions aligned with future self</p>
          </PreviewCard>

          {/* Current Streak */}
          <PreviewCard label="Current Streak" delay={0.08} accent="text-orange-400/80">
            <div className="flex items-center gap-3">
              <Flame className="w-8 h-8 text-orange-400" />
              <span className="text-4xl font-black text-white"><Counter to={12} /></span>
            </div>
            <p className="text-xs text-muted-foreground">Consecutive days of action</p>
            <div className="flex gap-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className={`flex-1 h-1.5 rounded-full ${i < 12 ? "bg-orange-400" : "bg-white/10"}`} />
              ))}
            </div>
          </PreviewCard>

          {/* Today's Promise */}
          <PreviewCard label="Today's Promise" delay={0.16} accent="text-emerald-400/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="font-bold text-white">Complete Workout</span>
            </div>
            <p className="text-xs text-muted-foreground">Your highest-leverage action today</p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400">+3% Future Alignment</span>
            </div>
          </PreviewCard>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <div className="w-px h-10 bg-gradient-to-b from-white/20 to-transparent" />
        </motion.div>
      </section>

      {/* ── SECTION: Not a task manager ── */}
      <section className="py-20 px-5 border-y border-white/5 bg-white/[0.012]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary/60 mb-4">Competitive Positioning</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3 leading-tight">
              Not a task manager.<br />
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                An OS for identity change.
              </span>
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Most apps help you do more. Astra OS helps you become someone.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                them: "Habit trackers",
                themSub: "tell you what you did",
                us: "Astra OS",
                usSub: "shows you who you're becoming",
                delay: 0,
              },
              {
                them: "Productivity apps",
                themSub: "manage your schedule",
                us: "Astra OS",
                usSub: "builds your identity",
                delay: 0.08,
              },
              {
                them: "Self-help newsletters",
                themSub: "give you advice",
                us: "Astra OS",
                usSub: "creates evidence you act on it",
                delay: 0.16,
              },
            ].map(({ them, themSub, us, usSub, delay }) => (
              <motion.div
                key={them}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay }}
                className="rounded-2xl border border-white/8 bg-white/3 p-5 space-y-3"
              >
                <div className="space-y-0.5 opacity-50">
                  <p className="text-xs font-bold text-white line-through decoration-white/40">{them}</p>
                  <p className="text-xs text-muted-foreground">{themSub}</p>
                </div>
                <div className="w-full h-px bg-white/8" />
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-primary">{us}</p>
                  <p className="text-xs text-white font-medium">{usSub}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-center text-xs text-muted-foreground/40 mt-8 font-medium"
          >
            Every feature answers one question: "Does this help you become who you said you'd be?"
          </motion.p>
        </div>
      </section>

      {/* ── SECTION 2: Three Pillars ── */}
      <section className="py-28 px-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(124,58,237,0.06),transparent)] pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-xs font-bold uppercase tracking-[0.25em] text-primary/70 mb-4"
            >
              The Foundation
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 leading-tight"
            >
              Your Future Self Is<br />Built Daily.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground text-lg max-w-xl mx-auto"
            >
              Small actions repeated consistently create extraordinary change.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Pillar icon={Brain} label="Identity" sub="Become the person you respect — one kept promise at a time." delay={0} />
            <Pillar icon={Shield} label="Discipline" sub="Keep promises to yourself. Your word to you is the most important one." delay={0.1} />
            <Pillar icon={Repeat2} label="Consistency" sub="Show up every day. The compound effect of small actions is unstoppable." delay={0.2} />
          </div>
        </div>
      </section>

      {/* ── SECTION 3: How It Works ── */}
      <section className="py-28 px-5 bg-white/[0.015] border-y border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-xs font-bold uppercase tracking-[0.25em] text-primary/70 mb-4"
            >
              The System
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight"
            >
              How Astra OS Works
            </motion.h2>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-lg mx-auto"
          >
            <Step n={1} title="Make a Promise" sub="Define who you want to become. Set your daily commitment — small, achievable, and aligned with your future self." />
            <Step n={2} title="Take Action" sub="One high-leverage action per day. No overwhelm. Just the thing that moves the needle most toward your future identity." />
            <Step n={3} title="Collect Evidence" sub="Every completed action is stored permanently in your Evidence Vault. This vault never lies — and neither do you." />
            <Step n={4} title="Increase Future Alignment" sub="Your alignment score rises with every action. Watch the gap between who you are and who you're becoming close in real time." />
            <Step n={5} title="Reflect & Strengthen Identity" sub="Daily reflection deepens self-awareness. Know exactly who you proved yourself to be today — and build on it tomorrow." />
            <Step n={6} title="Return Tomorrow" last sub="Your streak grows. Your identity compounds. The person you're becoming is more real with every passing day." />
          </motion.div>
        </div>
      </section>

      {/* ── Social proof numbers ── */}
      <section className="py-20 px-5">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: 94, suffix: "%", label: "Report stronger identity" },
              { value: 28, suffix: " days", label: "Average streak length" },
              { value: 3, suffix: "x", label: "More consistent than before" },
              { value: 87, suffix: "%", label: "Average alignment score" },
            ].map(({ value, suffix, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="text-center"
              >
                <p className="text-3xl sm:text-4xl font-black text-white mb-1">
                  <Counter to={value} suffix={suffix} />
                </p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-28 px-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(124,58,237,0.12),transparent)] pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-5 leading-tight"
          >
            Ready To Meet The Person<br />
            <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              You're Becoming?
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="text-muted-foreground text-lg mb-10 max-w-md mx-auto"
          >
            Your future self is waiting. Start your 45-second assessment and see where you're headed.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Link href="/onboarding"
              className="inline-flex items-center justify-center gap-2.5 h-14 px-10 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-base transition-all shadow-[0_0_50px_rgba(124,58,237,0.4)] hover:shadow-[0_0_60px_rgba(124,58,237,0.55)]">
              Start Assessment
              <ChevronRight className="w-5 h-5" />
            </Link>
          </motion.div>
          <p className="text-xs text-muted-foreground/40 mt-5">No credit card · No commitment · Just your future self</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-8 px-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center font-black text-white text-xs">A</div>
            <span className="text-sm font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">ASTRA OS</span>
          </div>
          <p className="text-xs text-muted-foreground/40">Built to strengthen who you are becoming.</p>
        </div>
      </footer>

    </div>
  );
}
