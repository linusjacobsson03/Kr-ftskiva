"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Trophy, UtensilsCrossed } from "lucide-react";

// Just the three things people need during the party. Hem no longer has a
// tab — the pre-party landing/hub now lives at "/" but is reached via
// /inbjudan or a personal /i/<token> link rather than from inside the app —
// and Admin lives behind a button on the Topplista page instead (see
// app/leaderboard/page.tsx): it isn't gated by an account flag (see
// AdminPasscodeGate), so where you enter from doesn't matter.
const TABS = [
  { href: "/challenges", label: "Utmaningar", icon: UtensilsCrossed },
  { href: "/photos", label: "Album", icon: Camera },
  { href: "/leaderboard", label: "Topplista", icon: Trophy },
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
      {/* No pb-24 here anymore — that was only ever needed because a
          `fixed` nav overlays content and would otherwise hide the last
          bit of it. `sticky` nav is back in normal document flow, so
          content just ends where the nav begins with no reserved gap.
          flex-col so a page's own root element can itself be flex-1 and
          reliably fill the remaining height (e.g. for a full-bleed
          background) — percentage heights like `min-h-full` don't resolve
          dependably against a flex-grow parent's computed height, flex-grow
          chaining does. */}
      <main className="flex flex-1 flex-col">{children}</main>

      {/* sticky, not fixed: on iOS Safari a `fixed` element near the bottom
          gets visually dragged along with the browser's own address-bar
          show/hide animation on scroll, which is exactly the "flies up on
          scroll down, vanishes on scroll up" behavior reported. `sticky`
          stays anchored to the flex layout instead of being taken out of
          flow relative to the viewport, so it doesn't get caught up in
          that animation — it just stays put. */}
      <nav className="sticky bottom-0 z-20 w-full border-t border-white/[0.06] bg-bg/90 backdrop-blur-md">
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
