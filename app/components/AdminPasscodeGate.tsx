"use client";

import { useEffect, useState } from "react";
import PasscodeGate from "./PasscodeGate";

/**
 * Gates /admin behind ADMIN_PASSCODE (same PIN as the rest of the app lock).
 * Always asks for the PIN on each visit — does not auto-unlock from cookie.
 */
export default function AdminPasscodeGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);

  if (!unlocked) {
    return (
      <PasscodeGate
        title="Admin"
        subtitle="Ange koden för att komma in"
        onUnlocked={() => setUnlocked(true)}
      />
    );
  }

  return <>{children}</>;
}
