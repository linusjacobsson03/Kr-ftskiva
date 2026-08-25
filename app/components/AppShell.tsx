"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Trophy, UtensilsCrossed } from "lucide-react";
import WelcomeStart from "./WelcomeStart";
import AppAccessGate from "./AppAccessGate";

const TABS = [
  { href: "/challenges", label: "Utmaningar", icon: UtensilsCrossed },
  { href: "/photos", label: "Album", icon: Camera },
  { href: "/leaderboard", label: "Topplista", icon: Trophy },
];

const NAV_CONTENT_HEIGHT = "4.25rem";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Invite-only surfaces: no tab bar, no access gate chrome.
  if (
    pathname === "/" ||
    pathname === "/inbjudan" ||
    pathname.startsWith("/i/")
  ) {
    return <div className="theme-invite min-h-dvh">{children}</div>;
  }

  // Admin has its own PIN gate inside the page.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return (
      <div className="flex min-h-dvh min-h-[100dvh] flex-col bg-bg text-cream pt-[env(safe-area-inset-top)]">
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh min-h-[100dvh] flex-col bg-bg text-cream pt-[env(safe-area-inset-top)]">
      <AppAccessGate>
        <main
          className="flex flex-1 flex-col"
          style={{
            paddingBottom: `calc(${NAV_CONTENT_HEIGHT} + env(safe-area-inset-bottom, 0px))`,
          }}
        >
          {children}
        </main>

        <WelcomeStart />

        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-white/92 backdrop-blur-xl [transform:translateZ(0)]"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          aria-label="Huvudmeny"
        >
          <div className="mx-auto flex h-[4.25rem] max-w-xl items-stretch justify-around">
            {TABS.map((tab) => {
              const active =
                tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="relative flex flex-1 flex-col items-center justify-center gap-1"
                >
                  <span
                    className={`absolute top-0 h-px w-8 rounded-full transition-opacity ${
                      active ? "bg-accent opacity-100" : "opacity-0"
                    }`}
                  />
                  <Icon
                    size={20}
                    strokeWidth={active ? 2 : 1.65}
                    className={active ? "text-accent-strong" : "text-muted"}
                  />
                  <span
                    className={`font-display text-[0.72rem] leading-none tracking-[0.03em] ${
                      active ? "font-semibold text-cream" : "font-medium text-muted"
                    }`}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-full h-[200px] bg-white"
          />
        </nav>
      </AppAccessGate>
    </div>
  );
}
