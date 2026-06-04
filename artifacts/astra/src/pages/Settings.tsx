import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";

export default function Settings() {
  return (
    <AppLayout>
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block text-muted-foreground">Name</label>
                <input type="text" className="w-full bg-background border border-border rounded-md px-3 py-2" defaultValue="User" />
              </div>
              <Button>Save Changes</Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
