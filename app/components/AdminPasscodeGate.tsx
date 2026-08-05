"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";

/**
 * Gates the /admin area behind a single shared passcode instead of a
 * particular user account's is_admin flag — anyone who knows the passcode
 * gets in, whether or not they're also logged in as a regular party guest.
 * See lib/auth.ts (getAdminSession) and app/api/admin/*.
 */
export default function AdminPasscodeGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setUnlocked(!!data.unlocked))
      .catch(() => setUnlocked(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Fel lösenord.");
        return;
      }
      setUnlocked(true);
    } finally {
      setBusy(false);
    }
  }

  if (unlocked === null) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-pulse rounded-full bg-accent/40" />
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="flex min-h-[calc(100dvh-64px)] flex-col items-center justify-center px-4 py-12">
        <div className="card w-full max-w-sm space-y-4 p-7 text-center">
          <Lock size={26} strokeWidth={1.25} className="mx-auto text-accent-strong" />
          <div>
            <p className="font-display text-lg font-medium text-cream">Admin</p>
            <p className="mt-1 text-sm text-muted">
              Ange lösenordet för att komma åt admin-delen.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-3 text-left">
            <input
              type="password"
              className="input-field"
              placeholder="Lösenord"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              autoFocus
              required
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? "Kollar…" : "Lås upp"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
