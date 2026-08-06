"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Smartphone } from "lucide-react";
import { useAuth } from "../providers";

export default function LoginPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/hem");
    }
  }, [loading, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Något gick fel.");
        return;
      }
      await refresh();
      router.push("/hem");
    } catch {
      setError("Kunde inte nå servern. Testa igen.");
    } finally {
      setBusy(false);
    }
  }

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
          className="rounded-2xl shadow-[0_20px_50px_-20px_rgba(201,161,90,0.4)]"
        />
        <h1 className="font-display mt-5 text-4xl font-medium tracking-tight text-cream">
          Kräftskiva
        </h1>
        <p className="mt-2 font-display text-[0.95rem] italic text-muted">
          Utmaningar, foton &amp; topplista i kväll
        </p>
      </div>

      <div className="card w-full max-w-sm p-7">
        <div className="mb-6 flex gap-6 border-b border-white/[0.08]">
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`relative pb-3 text-sm font-medium transition ${
              mode === "register" ? "text-cream" : "text-muted"
            }`}
          >
            Skapa konto
            {mode === "register" && (
              <span className="absolute inset-x-0 -bottom-px h-px bg-accent" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`relative pb-3 text-sm font-medium transition ${
              mode === "login" ? "text-cream" : "text-muted"
            }`}
          >
            Logga in
            {mode === "login" && (
              <span className="absolute inset-x-0 -bottom-px h-px bg-accent" />
            )}
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-muted">Förnamn</label>
              <input
                className="input-field"
                placeholder="Linus"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={40}
                required
              />
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-muted">Efternamn</label>
              <input
                className="input-field"
                placeholder="Jacobsson"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                maxLength={40}
                required
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Lösenord</label>
            <input
              className="input-field"
              placeholder="••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={4}
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}

          <button type="submit" disabled={busy} className="btn-primary mt-1 w-full">
            {busy ? (
              "Ett ögonblick…"
            ) : mode === "register" ? (
              <>
                Gå med i festen <ArrowRight size={16} strokeWidth={2} />
              </>
            ) : (
              "Logga in"
            )}
          </button>
        </form>
      </div>

      <p className="mt-7 flex max-w-xs items-center gap-1.5 text-center text-xs text-muted">
        <Smartphone size={14} strokeWidth={1.75} className="shrink-0" />
        Lägg till appen på hemskärmen för notiser om nya utmaningar
      </p>
    </div>
  );
}
