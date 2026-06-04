import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useGetMe, useGetFutureSelf, useGetTodayActions, useGetCurrentChapter, useGetLatestLetter, useGetUserStats } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Activity, Brain, Target, Shield, Heart, Zap, Sparkles } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

const data = [
  { val: 20 }, { val: 30 }, { val: 25 }, { val: 40 }, { val: 35 }, { val: 50 }, { val: 60 }, { val: 55 }, { val: 70 }
];

export default function Dashboard() {
  const { data: user, isLoading: userLoading } = useGetMe();
  const { data: stats, isLoading: statsLoading } = useGetUserStats();
  const { data: futureSelves, isLoading: fsLoading } = useGetFutureSelf();
  const { data: todayActions, isLoading: todayLoading } = useGetTodayActions();
  const { data: currentChapter, isLoading: chapterLoading } = useGetCurrentChapter();
  const { data: latestLetter, isLoading: letterLoading } = useGetLatestLetter();

  const currentSelf = futureSelves?.find(f => f.timeframe === "current");

  if (userLoading || statsLoading || fsLoading) {
    return (
      <AppLayout>
        <div className="p-8 max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64 bg-card border border-border" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-64 bg-card border border-border" />
            <Skeleton className="h-64 bg-card border border-border" />
            <Skeleton className="h-64 bg-card border border-border" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Welcome back, {user?.name?.split(' ')[0]}</h1>
            <p className="text-muted-foreground text-lg">Your future self is waiting. What will you do today?</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex items-center gap-4 bg-card/50 backdrop-blur-md border border-border rounded-full px-6 py-3 shadow-[0_0_15px_rgba(124,58,237,0.1)]">
            <div className="flex flex-col items-center">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Streak</span>
              <span className="text-xl font-bold text-primary flex items-center gap-1"><Zap className="w-4 h-4 fill-primary" /> {stats?.streakDays || 0}</span>
            </div>
            <div className="w-px h-8 bg-border"></div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Chapter</span>
              <span className="text-xl font-bold text-white">{currentChapter?.number || 1}</span>
            </div>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Trajectory Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="lg:col-span-2 rounded-2xl border border-white/5 bg-gradient-to-br from-card to-card/50 backdrop-blur-xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-primary/20 transition-all duration-1000"></div>
            
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Overall Trajectory</h2>
                <p className="text-primary font-medium">Top 5% of users</p>
              </div>
              <div className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-br from-white to-white/50">
                {stats?.overallScore || 0}
              </div>
            </div>

            <div className="h-48 relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="val" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-5 gap-4 mt-8 relative z-10">
              <ScoreOrb label="Health" score={currentSelf?.healthScore || 0} color="text-emerald-400" bg="bg-emerald-400/20" />
              <ScoreOrb label="Wealth" score={currentSelf?.wealthScore || 0} color="text-amber-400" bg="bg-amber-400/20" />
              <ScoreOrb label="Discipline" score={currentSelf?.disciplineScore || 0} color="text-blue-400" bg="bg-blue-400/20" />
              <ScoreOrb label="Confidence" score={currentSelf?.confidenceScore || 0} color="text-orange-400" bg="bg-orange-400/20" />
              <ScoreOrb label="Knowledge" score={currentSelf?.knowledgeScore || 0} color="text-violet-400" bg="bg-violet-400/20" />
            </div>
          </motion.div>

          {/* Right Column */}
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="rounded-2xl border border-white/5 bg-card/80 backdrop-blur-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[40px]"></div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" /> Today's Progress
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Actions Logged</span>
                  <span className="font-bold text-white">{todayActions?.actions?.length || 0} / {todayActions?.totalPossibleTypes || 9}</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${todayActions?.completionPercentage || 0}%` }}></div>
                </div>
                <Link href="/actions" className="block w-full py-3 mt-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-center font-medium transition-colors">
                  Log Actions
                </Link>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="rounded-2xl border border-white/5 bg-card/80 backdrop-blur-xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[40px]"></div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" /> Latest Letter
              </h3>
              
              {latestLetter ? (
                <div>
                  <p className="text-muted-foreground italic line-clamp-3 text-sm mb-4">"{latestLetter.content}"</p>
                  <Link href="/letters" className="text-sm text-primary hover:text-primary/80 font-medium">Read full letter &rarr;</Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm mb-4">No letters from the future yet.</p>
                  <Link href="/letters" className="text-sm bg-primary/20 text-primary px-4 py-2 rounded-full font-medium">Generate Letter</Link>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function ScoreOrb({ label, score, color, bg }: { label: string, score: number, color: string, bg: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-14 h-14 rounded-full ${bg} border border-white/10 flex items-center justify-center relative`}>
        <div className={`absolute inset-0 rounded-full border border-current opacity-30 ${color}`}></div>
        <span className={`font-bold ${color}`}>{score}</span>
      </div>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
}
