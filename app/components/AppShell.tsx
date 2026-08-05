"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Camera, Home, LogOut, Settings, Star, Trophy, UtensilsCrossed } from "lucide-react";
import { useAuth } from "../providers";
import Avatar from "./Avatar";

const TABS = [
  { href: "/", label: "Hem", icon: Home },
  { href: "/challenges", label: "Utmaningar", icon: UtensilsCrossed },
  { href: "/photos", label: "Foton", icon: Camera },
  { href: "/leaderboard", label: "Topplista", icon: Trophy },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const tabs = user?.isAdmin
    ? [...TABS, { href: "/admin", label: "Admin", icon: Settings }]
    : TABS;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.06] bg-bg/85 px-4 py-3 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2.5">
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

      <main className="flex-1 pb-24">{children}</main>

      {user && (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/[0.06] bg-bg/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-xl items-stretch justify-around">
            {tabs.map((tab) => {
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
