"use client";

import { useEffect, useState } from "react";

function computeRemaining(deadlineIso: string) {
  return Math.max(0, Math.floor((new Date(deadlineIso).getTime() - Date.now()) / 1000));
}

export default function Countdown({
  deadlineIso,
  onExpire,
  className = "",
}: {
  deadlineIso: string;
  onExpire?: () => void;
  className?: string;
}) {
  const [remaining, setRemaining] = useState(() => computeRemaining(deadlineIso));

  useEffect(() => {
    setRemaining(computeRemaining(deadlineIso));
    const id = setInterval(() => {
      const r = computeRemaining(deadlineIso);
      setRemaining(r);
      if (r <= 0) {
        clearInterval(id);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineIso]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const urgent = remaining <= 30;

  return (
    <span
      className={`inline-block w-[4.75rem] shrink-0 text-right font-display font-medium tabular-nums ${urgent ? "text-danger" : ""} ${className}`}
    >
      {String(minutes).padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
    </span>
  );
}
