"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
      router.replace("/");
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
      router.push("/");
    } catch {
      setError("Kunde inte nå servern. Testa igen.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || user) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="animate-pulse text-4xl">🦞</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <div className="text-6xl">🦞</div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Kräftskiva</h1>
        <p className="mt-1 text-white/60">Utmaningar, foton &amp; topplista i kväll</p>
      </div>

      <div className="card w-full max-w-sm p-6">
        <div className="mb-5 flex rounded-full bg-white/5 p-1 text-sm font-semibold">
          <button
            type="button"
            className={`flex-1 rounded-full py-2 transition ${
              mode === "register" ? "bg-white/15 text-white" : "text-white/50"
            }`}
            onClick={() => setMode("register")}
          >
            Skapa konto
          </button>
          <button
            type="button"
            className={`flex-1 rounded-full py-2 transition ${
              mode === "login" ? "bg-white/15 text-white" : "text-white/50"
            }`}
            onClick={() => setMode("login")}
          >
            Logga in
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-white/60">
                Förnamn
              </label>
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
              <label className="mb-1 block text-xs font-medium text-white/60">
                Efternamn
              </label>
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
            <label className="mb-1 block text-xs font-medium text-white/60">
              Lösenord
            </label>
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
            <p className="rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn-primary mt-2 w-full">
            {busy
              ? "Ett ögonblick…"
              : mode === "register"
                ? "🎉 Gå med i festen"
                : "Logga in"}
          </button>
        </form>
      </div>

      <p className="mt-6 max-w-xs text-center text-xs text-white/40">
        Tips: lägg till appen på hemskärmen för notiser om nya utmaningar! 📲
      </p>
    </div>
  );
}
