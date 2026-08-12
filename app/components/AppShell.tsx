"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Home, Settings, Trophy, UtensilsCrossed } from "lucide-react";

// Admin isn't gated by an account flag — it's its own passcode-protected
// area (see AdminPasscodeGate) that anyone who knows the passcode can open,
// so the tab is always here rather than conditioned on the logged-in user.
const TABS = [
  { href: "/", label: "Hem", icon: Home },
  { href: "/challenges", label: "Utmaningar", icon: UtensilsCrossed },
  { href: "/photos", label: "Foton", icon: Camera },
  { href: "/leaderboard", label: "Topplista", icon: Trophy },
  { href: "/admin", label: "Admin", icon: Settings },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Full-bleed invite screens — no app chrome at all.
  const isInvite = pathname === "/inbjudan" || pathname.startsWith("/i/");
  if (isInvite) {
    return <div className="min-h-dvh">{children}</div>;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 pb-24">{children}</main>

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
    </div>
  );
}
