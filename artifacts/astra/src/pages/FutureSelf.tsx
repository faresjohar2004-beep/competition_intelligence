import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useGetFutureSelf, useGetFutureSelfProjection, useGetFutureSelfScores } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function FutureSelf() {
  const { data: futureSelves, isLoading: fsLoading } = useGetFutureSelf();
  const { data: projection, isLoading: projLoading } = useGetFutureSelfProjection();
  const { data: scoreHistory, isLoading: histLoading } = useGetFutureSelfScores();

  if (fsLoading || projLoading || histLoading) {
    return (
      <AppLayout>
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          <Skeleton className="h-12 w-64 bg-card" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-96 bg-card" />
            <Skeleton className="h-96 bg-card" />
            <Skeleton className="h-96 bg-card" />
          </div>
        </div>
      </AppLayout>
    );
  }

  const current = futureSelves?.find(f => f.timeframe === "current");
  const year1 = futureSelves?.find(f => f.timeframe === "one_year");
  const year5 = futureSelves?.find(f => f.timeframe === "five_years");

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10">
        <header>
          <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-4xl font-bold tracking-tight text-white mb-2">Future Self Profiles</motion.h1>
          <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="text-muted-foreground text-lg">Glimpse into the paths your current actions are paving.</motion.p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ProfileCard title="Current Self" self={current} delay={0.2} glowColor="bg-blue-500/20" />
          <ProfileCard title="1-Year Projection" self={year1} delay={0.3} glowColor="bg-purple-500/20" />
          <ProfileCard title="5-Year Peak" self={year5} delay={0.4} glowColor="bg-amber-500/20" highlighted />
        </div>

        {projection && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="rounded-2xl border border-white/5 bg-card/80 backdrop-blur-xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
            <h2 className="text-2xl font-bold text-white mb-6 relative z-10">AI Projection Narrative</h2>
            <div className="grid md:grid-cols-2 gap-8 relative z-10">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Overall Narrative</h3>
                  <p className="text-muted-foreground leading-relaxed">{projection.overallNarrative}</p>
                </div>
                {projection.topRecommendation && (
                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Top Recommendation</h3>
                    <p className="text-white">{projection.topRecommendation}</p>
                  </div>
                )}
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-2">Fitness Projection</h3>
                  <p className="text-muted-foreground">{projection.fitnessProjection}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-2">Wealth Projection</h3>
                  <p className="text-muted-foreground">{projection.wealthProjection}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {scoreHistory && scoreHistory.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="rounded-2xl border border-white/5 bg-card/80 backdrop-blur-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Score History</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreHistory}>
                  <XAxis dataKey="date" stroke="#ffffff40" fontSize={12} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month:'short', day:'numeric'})} />
                  <YAxis stroke="#ffffff40" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="healthScore" stroke="#34d399" strokeWidth={2} dot={false} name="Health" />
                  <Line type="monotone" dataKey="wealthScore" stroke="#fbbf24" strokeWidth={2} dot={false} name="Wealth" />
                  <Line type="monotone" dataKey="disciplineScore" stroke="#60a5fa" strokeWidth={2} dot={false} name="Discipline" />
                  <Line type="monotone" dataKey="confidenceScore" stroke="#fb923c" strokeWidth={2} dot={false} name="Confidence" />
                  <Line type="monotone" dataKey="knowledgeScore" stroke="#a78bfa" strokeWidth={2} dot={false} name="Knowledge" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}

function ProfileCard({ title, self, delay, glowColor, highlighted = false }: { title: string, self: any, delay: number, glowColor: string, highlighted?: boolean }) {
  if (!self) return <Skeleton className="h-96 bg-card" />;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.5, delay }} 
      className={`rounded-2xl border ${highlighted ? 'border-primary/50 bg-card' : 'border-white/5 bg-card/50'} backdrop-blur-xl p-8 relative overflow-hidden group flex flex-col`}
    >
      <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-[60px] pointer-events-none transition-all duration-700 ${glowColor} group-hover:scale-150`}></div>
      
      <div className="text-center mb-8 relative z-10">
        <h2 className={`text-2xl font-bold mb-2 ${highlighted ? 'text-primary' : 'text-white'}`}>{title}</h2>
        <div className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
          {self.overallScore || 0}
        </div>
        <p className="text-sm text-muted-foreground mt-1 uppercase tracking-widest font-semibold">Overall Score</p>
      </div>

      <div className="space-y-4 relative z-10 flex-1">
        <ScoreBar label="Health" score={self.healthScore} color="bg-emerald-400" />
        <ScoreBar label="Wealth" score={self.wealthScore} color="bg-amber-400" />
        <ScoreBar label="Discipline" score={self.disciplineScore} color="bg-blue-400" />
        <ScoreBar label="Confidence" score={self.confidenceScore} color="bg-orange-400" />
        <ScoreBar label="Knowledge" score={self.knowledgeScore} color="bg-violet-400" />
      </div>

      {self.characterDescription && (
        <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
          <p className="text-sm italic text-muted-foreground leading-relaxed">"{self.characterDescription}"</p>
        </div>
      )}
    </motion.div>
  );
}

function ScoreBar({ label, score, color }: { label: string, score: number, color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5 font-medium">
        <span className="text-white/80">{label}</span>
        <span className="text-white">{score}</span>
      </div>
      <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full ${color} shadow-[0_0_10px_currentColor]`}
        />
      </div>
    </div>
  );
}
