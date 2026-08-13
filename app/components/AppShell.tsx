"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Camera, LogOut, Star, Trophy, UtensilsCrossed } from "lucide-react";
import { useAuth } from "../providers";
import Avatar from "./Avatar";

// Just the three things people need during the party. Hem is still reachable
// via the logo in the header (see the Link below); Admin now lives behind a
// button on the Topplista page instead of its own tab — it isn't gated by an
// account flag (see AdminPasscodeGate), so where you enter from doesn't matter.
const TABS = [
  { href: "/challenges", label: "Utmaningar", icon: UtensilsCrossed },
  { href: "/photos", label: "Album", icon: Camera },
  { href: "/leaderboard", label: "Topplista", icon: Trophy },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // The welcome screen ("/") wants to be the full-bleed photo card on its
  // own, edge to edge including behind the status bar/notch — no app chrome
  // on top of it at all, not even the logo bar.
  const isWelcome = pathname === "/";

  return (
    <div className="flex min-h-dvh flex-col">
      {!isWelcome && (
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.06] bg-bg/85 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-md">
          <Link href={user ? "/hem" : "/"} className="flex items-center gap-2.5">
            <Image src="/icons/icon-192.png" alt="" width={28} height={28} className="rounded-lg" />
            <span className="font-display text-lg font-medium tracking-tight text-cream">
              Kräftskiva
            </span>
          </Link>
          {user && (
            <div className="flex items-center gap-2.5">
              <span className="chip">
                <Star size={13} strokeWidth={2.25} className="fill-accent-strong text-accent-strong" />
                {user.points}
              </span>
              <Avatar name={user.displayName} size={30} className="hidden sm:inline-flex" />
              <button
                onClick={async () => {
                  await logout();
                  router.push("/login");
                }}
                aria-label="Logga ut"
                title="Logga ut"
                className="rounded-full p-2 text-muted transition hover:bg-white/[0.06] hover:text-cream"
              >
                <LogOut size={17} strokeWidth={1.75} />
              </button>
            </div>
          )}
        </header>
      )}

      {/* pb-24 only when the bottom nav is actually showing (logged-in users)
          — otherwise it leaves a dead gap of empty space below the content
          on public pages like the welcome screen. */}
      <main className={`flex-1 ${user ? "pb-24" : ""}`}>{children}</main>

      {user && (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/[0.06] bg-bg/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-xl items-stretch justify-around">
            {TABS.map((tab) => {
              const active =
                tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="relative flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition"
                >
                  <span
                    className={`absolute top-0 h-px w-8 rounded-full transition-opacity ${
                      active ? "bg-accent opacity-100" : "opacity-0"
                    }`}
                  />
                  <Icon
                    size={19}
                    strokeWidth={1.75}
                    className={active ? "text-accent-strong" : "text-muted"}
                  />
                  <span className={active ? "text-cream" : "text-muted"}>{tab.label}</span>
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
