"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { useAuth } from "../providers";

export default function AuthGate({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/inbjudan");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-pulse rounded-full bg-accent/40" />
      </div>
    );
  }

  if (adminOnly && !user.isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldOff size={30} strokeWidth={1.25} className="mx-auto text-muted" />
        <p className="font-display mt-4 text-lg font-medium text-cream">Bara för admin</p>
        <p className="mt-1 text-sm text-muted">Du har inte behörighet att se den här sidan.</p>
      </div>
    );
  }

  return <>{children}</>;
}
