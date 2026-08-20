"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../providers";
import PasscodeGate from "./PasscodeGate";

/**
 * App is only open for:
 * - guests with a valid personal invite session, or
 * - anyone who unlocks with the shared ADMIN_PASSCODE.
 * Personal /i/<token> links bypass this (handled outside AppShell).
 */
export default function AppAccessGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [adminOk, setAdminOk] = useState<boolean | null>(null);

  const checkAdmin = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/session", { cache: "no-store" });
      const data = await res.json();
      setAdminOk(!!data.unlocked);
    } catch {
      setAdminOk(false);
    }
  }, []);

  useEffect(() => {
    if (loading || user) {
      setAdminOk(null);
      return;
    }
    void checkAdmin();
  }, [loading, user, checkAdmin]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-pulse rounded-full bg-accent/40" />
      </div>
    );
  }

  if (user) return <>{children}</>;

  if (adminOk === null) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-pulse rounded-full bg-accent/40" />
      </div>
    );
  }

  if (adminOk) return <>{children}</>;

  return (
    <PasscodeGate
      title="Lilla Brattön"
      subtitle="Öppna din personliga inbjudningslänk, eller ange koden"
      onUnlocked={() => setAdminOk(true)}
    />
  );
}
