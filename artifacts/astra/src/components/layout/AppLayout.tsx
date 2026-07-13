import React from "react";
import { Link, useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import { useGetMe } from "@workspace/api-client-react";
import {
  LayoutDashboard, User, Map, Activity,
  BookOpen, Mail, FileText, MessageSquare,
  GitCommit, Share2, Settings, ShieldAlert,
  Target, LogOut, Shield, Zap,
} from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── All nav items (sidebar on desktop) ──────────────────────────────────────
const NAV_ITEMS = [
  { href: "/dashboard",  label: "Dashboard",      icon: LayoutDashboard },
  { href: "/missions",   label: "Mission Control", icon: Target },
  { href: "/future-self",label: "Future Self",     icon: User },
  { href: "/life-map",   label: "Evolution Map",   icon: Map },
  { href: "/actions",    label: "Actions",         icon: Activity },
  { href: "/evidence",   label: "Evidence Vault",  icon: Shield },
  { href: "/reflections",label: "Reflections",     icon: BookOpen },
  { href: "/chapters",   label: "Chapters",        icon: BookOpen },
  { href: "/letters",    label: "Letters",         icon: Mail },
  { href: "/biography",  label: "Biography",       icon: FileText },
  { href: "/coach",      label: "AI Coach",        icon: MessageSquare },
  { href: "/timeline",   label: "Timeline",        icon: GitCommit },
  { href: "/share",      label: "Share",           icon: Share2 },
];

// ─── Mobile bottom-bar: 5 core-loop destinations ─────────────────────────────
const MOBILE_NAV = [
  { href: "/dashboard",  label: "Home",     icon: LayoutDashboard },
  { href: "/actions",    label: "Actions",  icon: Zap },
  { href: "/missions",   label: "Missions", icon: Target },
  { href: "/coach",      label: "Coach",    icon: MessageSquare },
  { href: "/future-self",label: "Future",   icon: User },
];

// Map from path → page title for the mobile header
const PAGE_TITLES: Record<string, string> = {
  "/dashboard":  "Dashboard",
  "/missions":   "Mission Control",
  "/future-self":"Future Self",
  "/life-map":   "Evolution Map",
  "/actions":    "Actions",
  "/evidence":   "Evidence Vault",
  "/reflections":"Reflections",
  "/chapters":   "Chapters",
  "/letters":    "Letters",
  "/biography":  "Biography",
  "/coach":      "AI Coach",
  "/timeline":   "Timeline",
  "/share":      "Share",
  "/settings":   "Settings",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: user } = useGetMe();
  const { signOut } = useClerk();

  const pageTitle = PAGE_TITLES[location] ?? "ASTRA";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">

      {/* ── Desktop sidebar ── */}
      <aside className="w-64 border-r border-border bg-sidebar/50 backdrop-blur flex-col hidden md:flex shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center font-bold text-white">A</div>
            <span className="text-xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">ASTRA OS</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent/5 hover:text-foreground"
                }`}
              >
                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? "text-primary drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-border space-y-1">
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
                location === "/admin"
                  ? "bg-destructive/10 text-destructive font-medium"
                  : "text-muted-foreground hover:bg-accent/5 hover:text-foreground"
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
              Admin
            </Link>
          )}
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
              location === "/settings"
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent/5 hover:text-foreground"
            }`}
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
          <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.name || "User"}</div>
            </div>
          </div>
          <button
            onClick={() => signOut({ redirectUrl: basePath || "/" })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md w-full text-left transition-all text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile top header ── */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center font-black text-white text-xs">A</div>
          <span className="text-sm font-bold tracking-[0.18em] text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">ASTRA OS</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-muted-foreground">{pageTitle}</span>
          <Link href="/settings">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-white text-xs font-bold">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>
          </Link>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>

      {/* ── Mobile bottom navigation ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl safe-area-pb">
        <div className="flex items-stretch h-16">
          {MOBILE_NAV.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all relative ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {/* Active indicator dot */}
                {isActive && (
                  <span className="absolute top-1 w-1 h-1 rounded-full bg-primary" />
                )}
                <item.icon className={`w-5 h-5 ${isActive ? "drop-shadow-[0_0_6px_rgba(124,58,237,0.6)]" : ""}`} />
                <span className={`text-[10px] font-semibold leading-none ${isActive ? "text-primary" : "text-muted-foreground/70"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
