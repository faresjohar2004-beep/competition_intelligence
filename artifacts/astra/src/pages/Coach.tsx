import AppLayout from "@/components/layout/AppLayout";
import { useGetCoachingMessages, useSendCoachingMessage, useGetCoachingInsights, getGetCoachingMessagesQueryKey } from "@workspace/api-client-react";
import { useGetMe, useGetTodayActions, useGetUserStats } from "@workspace/api-client-react";
import { useAlignment } from "@/hooks/useMissions";
import { useQueryClient } from "@tanstack/react-query";
import { useIsPaywalled } from "@/hooks/useSubscription";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Bot, User, Lightbulb, TrendingUp, AlertTriangle, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

const INSIGHT_ICONS: Record<string, any> = {
  strength: TrendingUp,
  recommendation: Lightbulb,
  warning: AlertTriangle,
};
const INSIGHT_COLORS: Record<string, string> = {
  strength:       "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
  recommendation: "border-primary/30 bg-primary/5 text-primary",
  warning:        "border-amber-500/30 bg-amber-500/5 text-amber-400",
};

function buildAstraGreeting(
  name: string,
  actionsToday: number,
  streakDays: number,
  topAction: string,
  hour: number,
): string {
  const first = name.split(" ")[0];
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const actionName = topAction.replace(/_/g, " ");

  if (actionsToday === 0 && streakDays === 0) {
    return `${timeGreeting}, ${first}.\n\nI've been waiting to meet you.\n\nYour highest-leverage action right now: **${actionName}**. One decision today sets the trajectory for everything that follows.\n\nWhat's standing between you and starting?`;
  }

  if (actionsToday === 0) {
    return `${timeGreeting}, ${first}.\n\nYou've built a ${streakDays}-day streak. That's real. Don't let today be the day it breaks.\n\nYour highest-leverage action right now: **${actionName}**.\n\nWhat's the resistance today? Let's work through it.`;
  }

  if (actionsToday >= 6) {
    return `${timeGreeting}, ${first}.\n\n${actionsToday} actions today. That's not normal — most people settle for one and call it enough. You have a ${streakDays > 0 ? `${streakDays}-day streak and ` : ""}a pattern forming that most people never build.\n\nYou're becoming someone different. What do you want to push next?`;
  }

  if (actionsToday >= 3) {
    return `${timeGreeting}, ${first}.\n\n${actionsToday} actions logged already${streakDays > 1 ? ` — ${streakDays} days straight` : ""}. You're building evidence that compounds.\n\nThe next highest-leverage move: **${actionName}**.\n\nWhat's on your mind as you keep building today?`;
  }

  return `${timeGreeting}, ${first}.\n\nYou've logged ${actionsToday} action${actionsToday !== 1 ? "s" : ""} today${streakDays > 0 ? ` — day ${streakDays} of your streak` : ""}. Momentum is building.\n\nYour next highest-leverage action: **${actionName}**.\n\nWhat do you need from me right now to make today exceptional?`;
}

function buildContextualPrompts(actionsToday: number, streakDays: number): string[] {
  if (actionsToday === 0) {
    return [
      "I'm struggling to start today — help me",
      "What's the ONE thing I should do right now?",
      "How do I break through resistance?",
      "I keep procrastinating. What's really going on?",
    ];
  }
  if (actionsToday >= 5) {
    return [
      "How do I sustain this level of performance?",
      "What separates good days from great decades?",
      "I want to push further — what's next?",
      "How do I build on this momentum long-term?",
    ];
  }
  if (streakDays >= 7) {
    return [
      "How do I turn this streak into an identity?",
      "What habit should I add at this stage?",
      "I want to level up my discipline further",
      "How do I protect my streak when life gets hard?",
    ];
  }
  return [
    "What's my biggest leverage point right now?",
    "Help me optimize the rest of today",
    "How do I stay consistent when motivation drops?",
    "What habit will have the biggest impact on my future?",
  ];
}

function renderMessageContent(content: string) {
  const parts = content.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="text-white font-semibold">{part}</strong>
      : <span key={i}>{part}</span>
  );
}

export default function Coach() {
  const qc = useQueryClient();
  const { data: messages = [], isLoading: messagesLoading } = useGetCoachingMessages();
  const { data: insights = [] } = useGetCoachingInsights();
  const { data: user } = useGetMe();
  const { data: todayActions } = useGetTodayActions();
  const { data: stats } = useGetUserStats();
  const { data: alignment } = useAlignment();
  const sendMessage = useSendCoachingMessage();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const actionsToday = todayActions?.actions?.length ?? 0;
  const streakDays   = stats?.streakDays ?? 0;
  const topAction    = alignment?.topAction ?? "deep work";
  const userName     = user?.name ?? "Explorer";
  const hour         = new Date().getHours();

  const astraGreeting = useMemo(
    () => buildAstraGreeting(userName, actionsToday, streakDays, topAction, hour),
    [userName, actionsToday, streakDays, topAction, hour],
  );

  const contextualPrompts = useMemo(
    () => buildContextualPrompts(actionsToday, streakDays),
    [actionsToday, streakDays],
  );

  const showEmptyState = (messages as any[]).length === 0 && !messagesLoading;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (text?: string) => {
    const content = text ?? input.trim();
    if (!content || sendMessage.isPending) return;
    setInput("");
    sendMessage.mutate({ data: { content } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetCoachingMessagesQueryKey() });
      },
    });
  };

  const handlePromptClick = (prompt: string) => {
    inputRef.current?.focus();
    handleSend(prompt);
  };

  const isPaywalled = useIsPaywalled();
  const [, navigate] = useLocation();

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-0px)] overflow-hidden">

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header */}
          <div className="p-4 border-b border-border shrink-0 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">ASTRA Coach</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-muted-foreground">Online · Your personal strategist</span>
              </div>
            </div>
            {isPaywalled && (
              <div className="ml-auto">
                <Button onClick={() => navigate("/upgrade")} size="sm" className="gap-1.5 text-xs h-8">
                  <Crown className="h-3 w-3" />Upgrade for unlimited coaching
                </Button>
              </div>
            )}
          </div>

          {/* Pro banner */}
          {isPaywalled && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-4 mt-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 shrink-0"
            >
              <div className="flex items-center gap-2">
                <Crown className="h-3.5 w-3.5 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Your free trial has ended.</span>{" "}
                  Upgrade to Pro for unlimited AI coaching sessions and full conversation history.
                </p>
              </div>
              <button onClick={() => navigate("/upgrade")} className="text-xs text-primary hover:text-primary/80 font-semibold shrink-0 transition-colors">
                Upgrade →
              </button>
            </motion.div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* Empty state — ASTRA speaks first */}
            <AnimatePresence>
              {showEmptyState && !messagesLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4"
                >
                  {/* ASTRA opening message */}
                  <div className="flex gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mt-1">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.15, duration: 0.4 }}
                      className="max-w-[80%] rounded-2xl rounded-tl-sm px-5 py-4 bg-card border border-border"
                    >
                      <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                        {renderMessageContent(astraGreeting)}
                      </p>
                    </motion.div>
                  </div>

                  {/* Context-aware quick prompts */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="ml-11"
                  >
                    <p className="text-xs text-muted-foreground/60 mb-2 font-medium uppercase tracking-wider">Quick replies</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {contextualPrompts.map((p) => (
                        <button
                          key={p}
                          onClick={() => handlePromptClick(p)}
                          disabled={sendMessage.isPending}
                          className="text-left text-sm rounded-xl border border-white/8 bg-card/50 px-4 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-all disabled:opacity-50"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading skeleton */}
            {messagesLoading && (
              <div className="space-y-4">
                {[120, 200, 80].map((w, i) => (
                  <div key={i} className={`flex gap-3 ${i % 2 === 1 ? "flex-row-reverse" : ""}`}>
                    <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse shrink-0" />
                    <div className={`h-10 rounded-2xl bg-white/5 animate-pulse`} style={{ width: w }} />
                  </div>
                ))}
              </div>
            )}

            {/* Conversation messages */}
            <AnimatePresence initial={false}>
              {(messages as any[]).map((msg: any) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
                    msg.role === "user"
                      ? "bg-primary/20"
                      : "bg-white/5 border border-white/10"
                  }`}>
                    {msg.role === "user"
                      ? <User className="h-4 w-4 text-primary" />
                      : <Bot className="h-4 w-4 text-primary" />
                    }
                  </div>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-card border border-border rounded-tl-sm text-foreground/90"
                  }`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Thinking indicator */}
            {sendMessage.isPending && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-primary"
                      animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.18 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Reply to ASTRA..."
                className="flex-1 bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/40"
              />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || sendMessage.isPending}
                size="icon"
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground/40 mt-2 text-center">
              ASTRA knows your streak, today's actions, and your goals
            </p>
          </div>
        </div>

        {/* Insights sidebar */}
        {(insights as any[]).length > 0 && (
          <div className="hidden lg:flex w-72 flex-col border-l border-border p-4 gap-3 overflow-y-auto">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-1">
              Coach Insights
            </h2>
            {(insights as any[]).map((insight: any) => {
              const Icon = INSIGHT_ICONS[insight.type] ?? Lightbulb;
              const colorClass = INSIGHT_COLORS[insight.type] ?? INSIGHT_COLORS.recommendation;
              return (
                <div key={insight.id} className={`rounded-xl border p-3 ${colorClass}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-xs font-semibold uppercase tracking-wider">{insight.type}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-foreground/80">{insight.content}</p>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
