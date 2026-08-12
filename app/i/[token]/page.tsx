"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import InviteHero from "../../components/InviteHero";
import { useAuth } from "../../providers";

/**
 * Personal invite from SMS: /i/<token>
 * Shows the photo invite with "Hej, {name}" and claims their account session.
 */
export default function PersonalInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { refresh } = useAuth();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [rsvp, setRsvp] = useState<"yes" | "maybe" | "no" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function openInvite() {
      try {
        const res = await fetch(`/api/invite/${encodeURIComponent(token)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(data.error || "Inbjudan hittades inte.");
          return;
        }
        if (!cancelled) {
          setFirstName(data.firstName ?? null);
          setDisplayName(data.displayName ?? null);
          setRsvp(data.rsvpStatus ?? null);
          setReady(true);
        }
        await refresh();
      } catch {
        if (!cancelled) setError("Kunde inte öppna inbjudan.");
      }
    }
    void openInvite();
    return () => {
      cancelled = true;
    };
  }, [token, refresh]);

  async function saveRsvp(value: "yes" | "maybe" | "no") {
    setRsvp(value);
    try {
      await fetch(`/api/invite/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rsvpStatus: value }),
      });
    } catch {
      // selection still shows locally
    }
  }

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-display text-xl text-cream">Oj, länken funkar inte</p>
        <p className="max-w-xs text-sm text-muted">{error}</p>
        <Link href="/inbjudan" className="btn-secondary">
          Till inbjudan
        </Link>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-accent/40" />
      </div>
    );
  }

  return (
    <InviteHero
      guestFirstName={firstName}
      guestDisplayName={displayName}
      initialRsvp={rsvp}
      onRsvp={saveRsvp}
    />
  );
}
