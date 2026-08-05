"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="animate-pulse text-4xl">🦞</div>
      </div>
    );
  }

  if (adminOnly && !user.isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-white">
        <p className="text-4xl">🚫</p>
        <p className="mt-4 text-lg font-semibold">Bara för admin</p>
        <p className="mt-1 text-white/60">
          Du har inte behörighet att se den här sidan.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
