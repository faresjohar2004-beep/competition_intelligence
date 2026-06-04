import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth, UserButton } from "@clerk/react";
import { useGetMe } from "@workspace/api-client-react";
import { 
  LayoutDashboard, User, Map, Activity, 
  BookOpen, Mail, FileText, MessageSquare, 
  GitCommit, Share2, Settings, ShieldAlert,
  Target, Trophy
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/missions", label: "Mission Control", icon: Target },
  { href: "/future-self", label: "Future Self", icon: User },
  { href: "/life-map", label: "Evolution Map", icon: Map },
  { href: "/actions", label: "Actions", icon: Activity },
  { href: "/chapters", label: "Chapters", icon: BookOpen },
  { href: "/letters", label: "Letters", icon: Mail },
  { href: "/biography", label: "Biography", icon: FileText },
  { href: "/coach", label: "AI Coach", icon: MessageSquare },
  { href: "/timeline", label: "Timeline", icon: GitCommit },
  { href: "/share", label: "Share", icon: Share2 },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: user } = useGetMe();

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar/50 backdrop-blur flex flex-col hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center font-bold text-white">
              A
            </div>
            <span className="text-xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">ASTRA</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
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
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]" : ""}`} />
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
          <div className="flex items-center gap-3 px-3 py-3 mt-2">
            <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: "w-8 h-8" } }} />
            <div className="text-sm font-medium">{user?.name || "User"}</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
