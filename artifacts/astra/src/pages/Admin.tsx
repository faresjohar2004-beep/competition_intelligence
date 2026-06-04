import AppLayout from "@/components/layout/AppLayout";
import { useAdminGetMetrics, useAdminGetUsers } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Users, Activity, TrendingUp, Flame, BarChart2, Shield } from "lucide-react";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={`rounded-lg p-1.5 bg-white/5`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </div>
      <div className="text-3xl font-black text-foreground">{value}</div>
    </div>
  );
}

export default function Admin() {
  const { data: metrics, isLoading: metricsLoading } = useAdminGetMetrics();
  const { data: users = [], isLoading: usersLoading } = useAdminGetUsers();

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-xl bg-destructive/10 p-2">
            <Shield className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm">Platform metrics and user management</p>
          </div>
        </div>

        {/* Metrics */}
        {metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Users" value={metrics.totalUsers} icon={Users} color="text-blue-400" />
            <StatCard label="Active Users" value={metrics.activeUsers} icon={Activity} color="text-emerald-400" />
            <StatCard label="Avg Streak" value={`${metrics.avgStreak?.toFixed(1) ?? 0}d`} icon={Flame} color="text-orange-400" />
            <StatCard label="Total Actions" value={metrics.totalActionsLogged} icon={TrendingUp} color="text-primary" />
          </div>
        )}

        {metricsLoading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[0,1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-card animate-pulse" />)}
          </div>
        )}

        {/* Action breakdown */}
        {metrics?.topActionTypes && metrics.topActionTypes.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-primary" />
              Top Action Types
            </h2>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left px-5 py-3">Action Type</th>
                    <th className="text-right px-5 py-3">Times Logged</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.topActionTypes.map((a: any) => (
                    <tr key={a.actionType} className="border-b border-border/50 last:border-0">
                      <td className="px-5 py-3 capitalize font-medium">{a.actionType.replace(/_/g, " ")}</td>
                      <td className="px-5 py-3 text-right text-primary font-bold">{a.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users table */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            All Users
          </h2>
          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-right px-5 py-3">Actions</th>
                  <th className="text-right px-5 py-3">Streak</th>
                  <th className="text-right px-5 py-3">Chapter</th>
                  <th className="text-right px-5 py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading && (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">Loading...</td></tr>
                )}
                {!usersLoading && (users as any[]).length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">No users yet</td></tr>
                )}
                {(users as any[]).map((u: any) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="px-5 py-3 font-medium">{u.name}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">{u.email}</td>
                    <td className="px-5 py-3 text-right text-primary font-bold">{u.totalActions}</td>
                    <td className="px-5 py-3 text-right text-orange-400">{u.streakDays}d</td>
                    <td className="px-5 py-3 text-right">{u.currentChapter}</td>
                    <td className="px-5 py-3 text-right text-muted-foreground text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
