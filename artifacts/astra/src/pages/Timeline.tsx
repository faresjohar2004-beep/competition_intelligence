import AppLayout from "@/components/layout/AppLayout";
import { useGetTimeline } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { TrendingUp, Zap, Star } from "lucide-react";

const PATH_CONFIG = [
  { key: "current", label: "Current Path", color: "muted-foreground", border: "border-border", bg: "bg-card", icon: TrendingUp, accentColor: "text-muted-foreground", barColor: "bg-muted-foreground/40" },
  { key: "improved", label: "Improved Path", color: "primary", border: "border-primary/40", bg: "bg-primary/5", icon: Zap, accentColor: "text-primary", barColor: "bg-primary" },
  { key: "peak", label: "Peak Potential", color: "blue-400", border: "border-blue-500/40", bg: "bg-blue-500/5", icon: Star, accentColor: "text-blue-400", barColor: "bg-blue-500" },
];

export default function Timeline() {
  const { data: timelines, isLoading } = useGetTimeline();

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Trajectory Timeline</h1>
          <p className="text-muted-foreground mt-1">Three possible futures. Which one will you choose?</p>
        </div>

        {isLoading && (
          <div className="grid md:grid-cols-3 gap-6">
            {[0,1,2].map(i => <div key={i} className="h-96 rounded-2xl bg-card animate-pulse" />)}
          </div>
        )}

        {timelines && (
          <div className="grid md:grid-cols-3 gap-6">
            {PATH_CONFIG.map((path, pi) => {
              const data = (timelines as any)[path.key];
              const Icon = path.icon;
              if (!data) return null;
              return (
                <motion.div
                  key={path.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: pi * 0.1 }}
                  className={`rounded-2xl border p-6 relative overflow-hidden ${path.border} ${path.bg}`}
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 ${path.barColor}`} />
                  <div className="relative z-10">
                    <div className={`inline-flex rounded-xl p-2 mb-4 bg-white/5 border border-white/10`}>
                      <Icon className={`h-5 w-5 ${path.accentColor}`} />
                    </div>
                    <h2 className={`text-xl font-bold mb-1 ${path.accentColor}`}>{data.name}</h2>
                    <p className="text-xs text-muted-foreground mb-5 leading-relaxed">{data.description}</p>

                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">Projected Score</span>
                        <span className={`text-2xl font-bold ${path.accentColor}`}>{data.projectedScore}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${path.barColor}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${data.projectedScore}%` }}
                          transition={{ duration: 1, delay: pi * 0.1 + 0.3 }}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Milestones</h3>
                      {data.milestones.map((milestone: any, mi: number) => (
                        <div key={mi} className="flex gap-3">
                          <div className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${path.border} ${path.accentColor}`}>
                            {milestone.month < 12 ? `${milestone.month}M` : "1Y"}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-foreground">{milestone.event}</p>
                            <p className={`text-xs ${path.accentColor}`}>Score → {milestone.scoreProjection}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-2">The Compound Effect</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The difference between these three paths isn't talent or luck — it's daily decisions compounding over time. 
            Every action you log today shifts your trajectory. The peak path is available to you right now.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
