"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CantComePage() {
  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col items-center justify-center px-4 py-12 text-center">
      <p className="text-3xl">😢</p>
      <p className="mt-4 max-w-xs text-sm text-muted">
        Tråkigt att du inte kan komma. Vi kommer sakna dig — hoppas vi ses snart!
      </p>
      <Link
        href="/challenges"
        className="btn-ghost mt-6 inline-flex items-center gap-1.5"
      >
        <ArrowLeft size={14} strokeWidth={1.75} />
        Tillbaka
      </Link>
    </div>
  );
}
