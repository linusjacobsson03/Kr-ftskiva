"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Generic invite is closed — send everyone through the app access gate. */
export default function InvitePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/challenges");
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <div className="h-8 w-8 animate-pulse rounded-full bg-accent/40" />
    </div>
  );
}
