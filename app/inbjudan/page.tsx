"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import InviteHero from "../components/InviteHero";
import { useAuth } from "../providers";

/** Public invite landing (no personal token). Logged-in guests go to the app. */
export default function InvitePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/challenges");
    }
  }, [loading, user, router]);

  if (loading || user) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-pulse rounded-full bg-accent/40" />
      </div>
    );
  }

  return <InviteHero />;
}
