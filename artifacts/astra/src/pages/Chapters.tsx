import AppLayout from "@/components/layout/AppLayout";
import { useGetChapters, useGetUserStats } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Lock, CheckCircle2, Flame } from "lucide-react";

const CHAPTER_GRADIENTS = [
  "from-violet-600/20 to-purple-800/10 border-violet-500/30",
  "from-blue-600/20 to-blue-800/10 border-blue-500/30",
  "from-indigo-600/20 to-indigo-800/10 border-indigo-500/30",
  "from-emerald-600/20 to-emerald-800/10 border-emerald-500/30",
  "from-amber-600/20 to-amber-800/10 border-amber-500/30",
  "from-rose-600/20 to-rose-800/10 border-rose-500/30",
];
const CHAPTER_ACCENT = [
  "text-violet-400", "text-blue-400", "text-indigo-400",
  "text-emerald-400", "text-amber-400", "text-rose-400",
];

export default function Chapters() {
  const { data: chapters = [], isLoading } = useGetChapters();
  const { data: stats } = useGetUserStats();

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Life Chapters</h1>
          <p className="text-muted-foreground mt-1">Your story unfolds one chapter at a time. Each unlock is earned.</p>
        </div>

        {stats && (
          <div className="mb-6 rounded-2xl border border-border bg-card p-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-400" />
              <span className="text-sm font-medium">{stats.streakDays} day streak</span>
            </div>
            <div className="text-sm text-muted-foreground">·</div>
            <div className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">{stats.totalActions}</span> total actions logged
            </div>
          </div>
        )}

        {isLoading && (
          <div className="space-y-4">
            {[0,1,2,3,4,5].map(i => <div key={i} className="h-28 rounded-2xl bg-card animate-pulse" />)}
          </div>
        )}

        <div className="space-y-4">
          {(chapters as any[]).map((chapter: any, i: number) => {
            const gradient = CHAPTER_GRADIENTS[i % CHAPTER_GRADIENTS.length];
            const accent = CHAPTER_ACCENT[i % CHAPTER_ACCENT.length];
            const isCurrent = chapter.isCurrentChapter;
            const isUnlocked = chapter.unlocked;
            const isLocked = !isUnlocked;

            return (
              <motion.div
                key={chapter.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`relative rounded-2xl border bg-gradient-to-r p-6 overflow-hidden transition-all ${
                  isCurrent
                    ? `${gradient} ring-1 ring-primary/40`
                    : isLocked
                    ? "border-border bg-card opacity-60"
                    : `${gradient}`
                }`}
              >
                {isCurrent && (
                  <div className="absolute top-3 right-3">
                    <span className="text-xs font-bold bg-primary text-white px-2 py-0.5 rounded-full">CURRENT</span>
                  </div>
                )}
                <div className="flex items-start gap-5">
                  <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black border ${
                    isLocked ? "border-border bg-secondary text-muted-foreground" : `border-white/10 bg-white/5 ${accent}`
                  }`}>
                    {isLocked ? <Lock className="h-5 w-5" /> : chapter.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className={`text-xl font-bold ${isLocked ? "text-muted-foreground" : accent}`}>
                        {chapter.title}
                      </h2>
                      {isUnlocked && !isCurrent && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">{chapter.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {isLocked ? (
                        <span>Unlock at <strong className="text-foreground">{chapter.requiredActions}</strong> actions</span>
                      ) : (
                        <span className={`font-medium ${accent}`}>Unlocked</span>
                      )}
                      {chapter.requiredActions > 0 && (
                        <span>Required: {chapter.requiredActions} actions</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
