import AppLayout from "@/components/layout/AppLayout";
import { useGetLifeMap } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";
import { Heart, DollarSign, Briefcase, Users, Flame, BookOpen, TrendingUp, TrendingDown, Minus } from "lucide-react";

const AREA_CONFIG: Record<string, { icon: any; color: string; bg: string; gradient: string }> = {
  health:        { icon: Heart,     color: "text-rose-400",    bg: "bg-rose-500/10",    gradient: "from-rose-500" },
  wealth:        { icon: DollarSign,color: "text-amber-400",   bg: "bg-amber-500/10",   gradient: "from-amber-500" },
  career:        { icon: Briefcase, color: "text-blue-400",    bg: "bg-blue-500/10",    gradient: "from-blue-500" },
  relationships: { icon: Users,     color: "text-pink-400",    bg: "bg-pink-500/10",    gradient: "from-pink-500" },
  discipline:    { icon: Flame,     color: "text-orange-400",  bg: "bg-orange-500/10",  gradient: "from-orange-500" },
  knowledge:     { icon: BookOpen,  color: "text-violet-400",  bg: "bg-violet-500/10",  gradient: "from-violet-500" },
};

function TrendIcon({ trend }: { trend: number }) {
  if (trend > 0.5) return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
  if (trend < -0.5) return <TrendingDown className="h-3.5 w-3.5 text-rose-400" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

export default function LifeMap() {
  const { data: areas = [], isLoading } = useGetLifeMap();

  const radarData = (areas as any[]).map((a: any) => ({
    subject: a.area.charAt(0).toUpperCase() + a.area.slice(1),
    score: Math.round(a.score),
  }));

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Life Map</h1>
          <p className="text-muted-foreground mt-1">A complete picture of every dimension of your life.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Radar chart */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Life Balance Radar</h2>
            {!isLoading && radarData.length > 0 && (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
                  />
                  <Radar
                    name="Life Score"
                    dataKey="score"
                    stroke="#7c3aed"
                    fill="#7c3aed"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
            {isLoading && <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>}
          </div>

          {/* Summary stats */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Area Scores</h2>
            <div className="space-y-4">
              {(areas as any[]).map((area: any) => {
                const config = AREA_CONFIG[area.area] ?? AREA_CONFIG.health;
                const Icon = config.icon;
                const score = Math.round(area.score);
                return (
                  <div key={area.id} className="flex items-center gap-3">
                    <div className={`shrink-0 rounded-lg p-2 ${config.bg}`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium capitalize">{area.area}</span>
                        <div className="flex items-center gap-1.5">
                          <TrendIcon trend={area.trend} />
                          <span className={`text-sm font-bold ${config.color}`}>{score}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full bg-gradient-to-r ${config.gradient} to-transparent`}
                          initial={{ width: 0 }}
                          animate={{ width: `${score}%` }}
                          transition={{ duration: 0.8 }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Area cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {(areas as any[]).map((area: any, i: number) => {
            const config = AREA_CONFIG[area.area] ?? AREA_CONFIG.health;
            const Icon = config.icon;
            const score = Math.round(area.score);
            return (
              <motion.div
                key={area.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`rounded-lg p-1.5 ${config.bg}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <span className="text-sm font-semibold capitalize">{area.area}</span>
                  <TrendIcon trend={area.trend} />
                </div>
                <div className={`text-3xl font-black ${config.color}`}>{score}<span className="text-lg font-normal text-muted-foreground">%</span></div>
                <p className="text-xs text-muted-foreground mt-1">
                  {score >= 75 ? "Excellent" : score >= 60 ? "Good" : score >= 45 ? "Building" : "Needs focus"}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
