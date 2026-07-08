import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, SignIn, SignUp, useAuth } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import React, { Suspense, useEffect, useRef } from "react";
import { useGetMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/react";
import NotFound from "@/pages/not-found";

const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#7c3aed",
    colorBackground: "#0a0c14",
    colorForeground: "#e2e8f0",
    colorMutedForeground: "#7a8aaa",
    colorDanger: "#ef4444",
    colorInput: "#141824",
    colorInputForeground: "#e2e8f0",
    colorNeutral: "#2a3050",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#0d1017] border border-white/10 rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#e2e8f0] font-bold",
    headerSubtitle: "text-[#7a8aaa]",
    socialButtonsBlockButtonText: "text-[#e2e8f0]",
    formFieldLabel: "text-[#e2e8f0]",
    footerActionLink: "text-[#7c3aed]",
    footerActionText: "text-[#7a8aaa]",
    dividerText: "text-[#7a8aaa]",
    identityPreviewEditButton: "text-[#7c3aed]",
    formFieldSuccessText: "text-emerald-400",
    alertText: "text-[#e2e8f0]",
    logoBox: "mb-2",
    logoImage: "w-10 h-10",
    socialButtonsBlockButton: "border border-white/10 bg-white/5 hover:bg-white/10",
    formButtonPrimary: "bg-[#7c3aed] hover:bg-[#6d28d9]",
    formFieldInput: "bg-[#141824] border-white/10 text-[#e2e8f0] placeholder:text-[#7a8aaa]",
    footerAction: "border-t border-white/10",
    dividerLine: "bg-white/10",
    alert: "border-white/10",
    otpCodeFieldInput: "bg-[#141824] border-white/10 text-[#e2e8f0]",
    formFieldRow: "",
    main: "",
  },
};

const queryClient = new QueryClient();

// Lazy-loaded pages
const Landing = React.lazy(() => import("@/pages/Landing"));
const Dashboard = React.lazy(() => import("@/pages/Dashboard"));
const Onboarding = React.lazy(() => import("@/pages/Onboarding"));
const FutureSelf = React.lazy(() => import("@/pages/FutureSelf"));
const LifeMap = React.lazy(() => import("@/pages/LifeMap"));
const Actions = React.lazy(() => import("@/pages/Actions"));
const Chapters = React.lazy(() => import("@/pages/Chapters"));
const Letters = React.lazy(() => import("@/pages/Letters"));
const Biography = React.lazy(() => import("@/pages/Biography"));
const Coach = React.lazy(() => import("@/pages/Coach"));
const Timeline = React.lazy(() => import("@/pages/Timeline"));
const Share = React.lazy(() => import("@/pages/Share"));
const Admin = React.lazy(() => import("@/pages/Admin"));
const Settings = React.lazy(() => import("@/pages/Settings"));
const Missions = React.lazy(() => import("@/pages/Missions"));
const Upgrade = React.lazy(() => import("@/pages/Upgrade"));
const UpgradeSuccess = React.lazy(() => import("@/pages/UpgradeSuccess"));
const Evidence = React.lazy(() => import("@/pages/Evidence"));
const Reflections = React.lazy(() => import("@/pages/Reflections"));

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <LoadingScreen />;
  if (isSignedIn) return <Redirect to="/dashboard" />;
  return <Landing />;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { data: user, isLoading: isUserLoading } = useGetMe({ query: { enabled: !!isSignedIn } });

  if (!isLoaded || (isSignedIn && isUserLoading)) return <LoadingScreen />;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  if (user && !user.onboarded && !window.location.pathname.endsWith("/onboarding")) {
    return <Redirect to="/onboarding" />;
  }
  return <Component />;
}

function AuthPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="z-10 w-full max-w-[440px]">{children}</div>
    </div>
  );
}

function ClerkQueryCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    return addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prevRef.current !== undefined && prevRef.current !== id) qc.clear();
      prevRef.current = id;
    });
  }, [addListener, qc]);
  return null;
}

function Router() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ClerkQueryCacheInvalidator />
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/sign-in/*?">
          <AuthPage>
            <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} forceRedirectUrl={`${basePath}/dashboard`} />
          </AuthPage>
        </Route>
        <Route path="/sign-up/*?">
          <AuthPage>
            <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} forceRedirectUrl={`${basePath}/onboarding`} />
          </AuthPage>
        </Route>
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
        <Route path="/future-self"><ProtectedRoute component={FutureSelf} /></Route>
        <Route path="/life-map"><ProtectedRoute component={LifeMap} /></Route>
        <Route path="/actions"><ProtectedRoute component={Actions} /></Route>
        <Route path="/chapters"><ProtectedRoute component={Chapters} /></Route>
        <Route path="/letters"><ProtectedRoute component={Letters} /></Route>
        <Route path="/biography"><ProtectedRoute component={Biography} /></Route>
        <Route path="/coach"><ProtectedRoute component={Coach} /></Route>
        <Route path="/timeline"><ProtectedRoute component={Timeline} /></Route>
        <Route path="/share"><ProtectedRoute component={Share} /></Route>
        <Route path="/missions"><ProtectedRoute component={Missions} /></Route>
        <Route path="/admin"><ProtectedRoute component={Admin} /></Route>
        <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
        <Route path="/upgrade"><ProtectedRoute component={Upgrade} /></Route>
        <Route path="/upgrade/success"><ProtectedRoute component={UpgradeSuccess} /></Route>
        <Route path="/evidence"><ProtectedRoute component={Evidence} /></Route>
        <Route path="/reflections"><ProtectedRoute component={Reflections} /></Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <Router />
    </ClerkProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
