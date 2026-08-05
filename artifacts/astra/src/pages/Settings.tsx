import React, { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useClerk, useAuth } from "@clerk/react";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

export default function Settings() {
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    setError(null);
    try {
      // Attach the Clerk session token explicitly so the API's requireAuthWithUser
      // middleware can verify the caller — same auth model used by the rest of the app.
      const token = await getToken();
      const res = await fetch(`${BASE_URL}api/users/me`, {
        method: "DELETE",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to delete account");
      }
      await signOut({ redirectUrl: `${BASE_URL}` });
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
      setDeleting(false);
    }
  };

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

          {/* Danger Zone */}
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6">
            <h2 className="text-xl font-semibold mb-1 text-destructive">Danger Zone</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <p className="text-sm text-muted-foreground mb-4 font-medium">
              Any active subscription will be cancelled and your billing will stop. App store in-app purchases must be managed separately in your device's app store settings.
            </p>

            {!confirming ? (
              <Button
                variant="destructive"
                onClick={() => { setConfirming(true); setConfirmText(""); setError(null); }}
              >
                Delete Account
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-destructive">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm:
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full bg-background border border-destructive/50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/40"
                  autoFocus
                />
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => { setConfirming(false); setConfirmText(""); setError(null); }}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={confirmText !== "DELETE" || deleting}
                  >
                    {deleting ? "Deleting…" : "Permanently Delete"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
