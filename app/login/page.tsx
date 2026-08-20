"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MessageSquare, Smartphone } from "lucide-react";
import { useAuth } from "../providers";

/**
 * Guests don't self-register anymore — admin creates each account and shares
 * a unique /i/<token> link (typically via SMS). This page only explains that.
 */
export default function LoginPage() {
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

  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col items-center justify-center px-4 py-12">
      <div className="mb-9 flex flex-col items-center text-center">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={64}
          height={64}
          className="rounded-2xl shadow-[0_20px_50px_-20px_rgba(46,130,214,0.45)]"
        />
        <h1 className="font-display mt-5 text-4xl font-medium tracking-tight text-cream">
          Lilla Brattön
        </h1>
        <p className="mt-2 font-display text-[0.95rem] italic text-muted">
          Utmaningar, foton &amp; topplista i kväll
        </p>
      </div>

      <div className="card w-full max-w-sm space-y-4 p-7 text-center">
        <MessageSquare size={22} strokeWidth={1.75} className="mx-auto text-accent" />
        <p className="text-sm font-semibold text-cream">Öppna din inbjudan</p>
        <p className="text-sm leading-relaxed text-muted">
          Du får en personlig länk via SMS från värden. Öppna den så loggas du
          in automatiskt med ditt namn — inget konto att skapa.
        </p>
      </div>

      <p className="mt-7 flex max-w-xs items-center gap-1.5 text-center text-xs text-muted">
        <Smartphone size={14} strokeWidth={1.75} className="shrink-0" />
        Lägg till appen på hemskärmen för notiser om nya utmaningar
      </p>
    </div>
  );
}
