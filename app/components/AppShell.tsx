"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../providers";

const TABS = [
  { href: "/", label: "Hem", emoji: "🏠" },
  { href: "/challenges", label: "Utmaningar", emoji: "🎯" },
  { href: "/photos", label: "Foton", emoji: "📸" },
  { href: "/leaderboard", label: "Topplista", emoji: "🏆" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const tabs = user?.isAdmin
    ? [...TABS, { href: "/admin", label: "Admin", emoji: "🛠️" }]
    : TABS;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#1e1b4b]/90 px-4 py-3 backdrop-blur">
        <Link href="/" className="flex items-center gap-2 font-bold text-white">
          <span className="text-2xl">🦞</span>
          <span className="text-lg tracking-tight">Kräftskiva</span>
        </Link>
        {user && (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 rounded-full bg-amber-400/20 px-3 py-1 text-sm font-semibold text-amber-300">
              ⭐ {user.points}
            </span>
            <span className="hidden items-center gap-1 text-sm text-white/80 sm:flex">
              {user.avatarEmoji} {user.displayName}
            </span>
            <button
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
              aria-label="Logga ut"
              title="Logga ut"
              className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              ⎋
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 pb-24">{children}</main>

      {user && (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#1e1b4b]/95 backdrop-blur">
          <div className="mx-auto flex max-w-xl items-stretch justify-around">
            {tabs.map((tab) => {
              const active =
                tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition ${
                    active ? "text-amber-300" : "text-white/50"
                  }`}
                >
                  <span className={`text-xl transition ${active ? "scale-110" : ""}`}>
                    {tab.emoji}
                  </span>
                  {tab.label}
                </Link>
              );
            })}
          </div>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </nav>
      )}
    </div>
  );
}
