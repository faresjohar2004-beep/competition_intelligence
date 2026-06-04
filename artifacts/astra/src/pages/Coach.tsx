import AppLayout from "@/components/layout/AppLayout";
import { useGetCoachingMessages, useSendCoachingMessage, useGetCoachingInsights, getGetCoachingMessagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Lightbulb, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const INSIGHT_ICONS: Record<string, any> = {
  strength: TrendingUp,
  recommendation: Lightbulb,
  warning: AlertTriangle,
};
const INSIGHT_COLORS: Record<string, string> = {
  strength: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
  recommendation: "border-primary/30 bg-primary/5 text-primary",
  warning: "border-amber-500/30 bg-amber-500/5 text-amber-400",
};

const STARTER_PROMPTS = [
  "What's my biggest leverage point right now?",
  "Help me build a morning routine",
  "How do I stay consistent when motivation drops?",
  "What habit will have the biggest impact on my future?",
];

export default function Coach() {
  const qc = useQueryClient();
  const { data: messages = [], isLoading: messagesLoading } = useGetCoachingMessages();
  const { data: insights = [] } = useGetCoachingInsights();
  const sendMessage = useSendCoachingMessage();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

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

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-4 border-b border-border">
            <h1 className="text-xl font-bold">AI Coach</h1>
            <p className="text-xs text-muted-foreground">Your personal future-self strategist</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !messagesLoading && (
              <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-2">Meet ASTRA Coach</h2>
                  <p className="text-muted-foreground text-sm max-w-xs">Your AI life strategist — precise, warm, and relentlessly focused on your growth.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                  {STARTER_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => handleSend(p)}
                      className="text-left text-sm rounded-xl border border-white/10 bg-card px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {(messages as any[]).map((msg: any) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === "user" ? "bg-primary/20" : "bg-white/5 border border-white/10"}`}>
                    {msg.role === "user" ? <User className="h-4 w-4 text-primary" /> : <Bot className="h-4 w-4 text-white/80" />}
                  </div>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-card border border-border rounded-tl-sm"
                  }`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {sendMessage.isPending && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white/80" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-primary"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Ask your coach anything..."
                className="flex-1 bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
              />
              <Button onClick={() => handleSend()} disabled={!input.trim() || sendMessage.isPending} size="icon" className="shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Insights sidebar */}
        <div className="hidden lg:flex w-72 flex-col border-l border-border p-4 gap-3 overflow-y-auto">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-1">Coach Insights</h2>
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
      </div>
    </AppLayout>
  );
}
