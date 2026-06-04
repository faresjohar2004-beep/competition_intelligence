import AppLayout from "@/components/layout/AppLayout";
import { useGetLifeMap } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Heart, DollarSign, Briefcase, Users, Flame, BookOpen, TrendingUp, Lock } from "lucide-react";

const NODES = [
  {
    id: "health", label: "Health", icon: Heart, color: "from-emerald-500 to-teal-500",
    border: "border-emerald-500/30", bg: "bg-emerald-500/10",
    description: "Physical vitality & longevity", threshold: 0,
  },
  {
    id: "discipline", label: "Discipline", icon: Flame, color: "from-blue-500 to-cyan-500",
    border: "border-blue-500/30", bg: "bg-blue-500/10",
    description: "Consistency & mental toughness", threshold: 20,
  },
  {
    id: "wealth", label: "Wealth", icon: DollarSign, color: "from-amber-500 to-yellow-500",
    border: "border-amber-500/30", bg: "bg-amber-500/10",
    description: "Financial intelligence & growth", threshold: 30,
  },
  {
    id: "knowledge", label: "Knowledge", icon: BookOpen, color: "from-violet-500 to-purple-500",
    border: "border-violet-500/30", bg: "bg-violet-500/10",
    description: "Learning & intellectual capital", threshold: 40,
  },
  {
    id: "career", label: "Career", icon: Briefcase, color: "from-indigo-500 to-blue-600",
    border: "border-indigo-500/30", bg: "bg-indigo-500/10",
    description: "Professional impact & legacy", threshold: 50,
  },
  {
    id: "relationships", label: "Connections", icon: Users, color: "from-pink-500 to-rose-500",
    border: "border-pink-500/30", bg: "bg-pink-500/10",
    description: "Social capital & influence", threshold: 50,
  },
  {
    id: "confidence", label: "Confidence", icon: TrendingUp, color: "from-orange-500 to-red-500",
    border: "border-orange-500/30", bg: "bg-orange-500/10",
    description: "Inner conviction & presence", threshold: 60,
  },
];

function NodeRing({ score, color }: { score: number; color: string }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <svg className="w-16 h-16 -rotate-90 absolute" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-white/5" />
      <circle
        cx="32" cy="32" r={r} fill="none"
        stroke="url(#nodeGrad)" strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        className="transition-all duration-700"
      />
      <defs>
        <linearGradient id="nodeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function LifeMap() {
  const { data: lifeAreas = [] } = useGetLifeMap();

  const areaMap: Record<string, any> = {};
  (lifeAreas as any[]).forEach((a: any) => { areaMap[a.area] = a; });

  const overallScore = Math.round(
    NODES.reduce((acc, n) => acc + (areaMap[n.id]?.score ?? 20), 0) / NODES.length
  );

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Personal Evolution Map
          </h1>
          <p className="text-muted-foreground">Unlock nodes by taking consistent action. Your life is a skill tree.</p>
        </motion.div>

        {/* Overall score */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/5 bg-card/80 p-5 mb-8 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-primary/30 shrink-0">
            {overallScore}
          </div>
          <div className="flex-1">
            <div className="flex justify-between mb-1.5">
              <span className="font-semibold text-white">Overall Evolution</span>
              <span className="text-sm text-primary font-bold">{overallScore}%</span>
            </div>
            <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallScore}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Log <Link href="/actions" className="text-primary hover:underline">actions</Link> to unlock new nodes and raise your scores
            </p>
          </div>
        </motion.div>

        {/* Skill tree grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {NODES.map((node, i) => {
            const area = areaMap[node.id];
            const score = area?.score ?? 20;
            const isUnlocked = score >= node.threshold || node.threshold === 0;
            const Icon = node.icon;

            return (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07 }}
                className={`relative rounded-2xl border p-5 transition-all ${
                  isUnlocked ? `${node.border} ${node.bg}` : "border-white/5 bg-white/[0.02] opacity-60"
                }`}
              >
                {!isUnlocked && (
                  <div className="absolute top-3 right-3">
                    <Lock className="w-4 h-4 text-muted-foreground/40" />
                  </div>
                )}
                <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <NodeRing score={score} color={node.color} />
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${node.color} shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-white mb-0.5">{node.label}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{node.description}</p>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Score</span>
                    <span className="font-bold text-white">{score}/100</span>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 0.8, delay: i * 0.07 + 0.3, ease: "easeOut" }}
                      className={`h-full bg-gradient-to-r ${node.color} rounded-full`}
                    />
                  </div>
                  {!isUnlocked && (
                    <p className="text-xs text-muted-foreground/50 mt-2">Unlock at {node.threshold} score</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-8">
          Each node unlocks new chapters, simulations, and coaching insights.
        </p>
      </div>
    </AppLayout>
  );
}
