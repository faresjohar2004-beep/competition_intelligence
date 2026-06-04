import React from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useOnboardUser } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const onboardUser = useOnboardUser();

  const handleComplete = () => {
    if (!user) return;
    
    onboardUser.mutate(
      {
        data: {
          clerkId: user.id,
          name: user.fullName || "User",
          email: user.primaryEmailAddress?.emailAddress || "",
          avatarUrl: user.imageUrl,
          age: 25,
          gender: "Prefer not to say",
          fitnessLevel: "Intermediate",
          incomeRange: "$50k - $100k",
          career: "Technology",
          mainGoals: "Grow my career and stay healthy",
          biggestStruggles: "Procrastination",
          dailyHabits: "Reading, working out",
        }
      },
      {
        onSuccess: () => {
          setLocation("/dashboard");
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background z-0 pointer-events-none"></div>
      
      <div className="z-10 w-full max-w-lg rounded-xl border border-border bg-card p-8 shadow-xl">
        <h1 className="text-3xl font-bold mb-4">Welcome to ASTRA</h1>
        <p className="text-muted-foreground mb-8">Let's set up your profile to generate your future self projection.</p>
        
        <div className="space-y-4 mb-8">
          <div className="p-4 border border-dashed border-border rounded-lg text-center text-muted-foreground">
            Onboarding Form Wizard (Demo)
          </div>
        </div>
        
        <Button 
          className="w-full h-12 text-lg font-medium" 
          onClick={handleComplete}
          disabled={onboardUser.isPending}
        >
          {onboardUser.isPending ? "Generating Projection..." : "Complete Setup"}
        </Button>
      </div>
    </div>
  );
}
