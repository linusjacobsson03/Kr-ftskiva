"use client";

import { Play } from "lucide-react";

/** Completed challenge photo: rounded image, points badge, white title plate. */
export default function EvidenceCard({
  photoUrl,
  title,
  points,
  onClick,
  className = "",
  compact = false,
  mirrored = false,
  isVideo = false,
}: {
  photoUrl: string;
  title: string;
  points: number;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
  mirrored?: boolean;
  isVideo?: boolean;
}) {
  const isVideoMedia =
    isVideo ||
    photoUrl.startsWith("data:video/") ||
    photoUrl.startsWith("blob:");
  const mediaClass = `w-full object-cover ${compact ? "aspect-square" : "aspect-[4/5]"} ${
    mirrored ? "scale-x-[-1]" : ""
  }`;

  const inner = (
    <div
      className={`flex h-full flex-col rounded-2xl shadow-[0_10px_32px_-8px_rgba(196,48,54,0.55),0_4px_14px_-4px_rgba(124,45,58,0.35)] ${className}`}
    >
      <div className="relative shrink-0">
        <div className="overflow-hidden rounded-t-2xl bg-black/[0.04]">
          {isVideoMedia ? (
            <video src={photoUrl} muted playsInline preload="metadata" className={mediaClass} />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={photoUrl} alt={title} className={`${mediaClass} [content-visibility:auto]`} loading="lazy" />
          )}
        </div>
        {isVideoMedia && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-black/45 p-2 backdrop-blur">
              <Play size={compact ? 12 : 16} className="fill-white text-white" />
            </span>
          </span>
        )}
        <span
          className={`absolute flex items-center justify-center rounded-full bg-white font-semibold tabular text-ink shadow-[0_2px_10px_rgba(0,0,0,0.18)] ${
            compact
              ? "right-1 top-1 h-5 min-w-5 px-1 text-[0.6rem]"
              : "right-2.5 top-2.5 h-8 min-w-8 px-2.5 text-sm"
          }`}
        >
          {points}
        </span>
        {!compact && (
          <span className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2 rounded-lg bg-white px-2.5 py-1 text-[0.65rem] font-semibold tracking-wide text-ink shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
            Utmaning
          </span>
        )}
      </div>
      <div
        className={`flex flex-1 flex-col rounded-b-2xl border border-t-0 border-black/[0.06] bg-white ${
          compact ? "px-1.5 pb-1 pt-1.5" : "px-3 pb-2.5 pt-4 sm:px-4 sm:pb-3 sm:pt-5"
        }`}
      >
        <p
          className={`font-medium leading-snug text-ink ${
            compact ? "line-clamp-1 text-[0.62rem]" : "line-clamp-3 text-sm"
          }`}
        >
          {title}
        </p>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="flex h-full w-full flex-col text-left">
        {inner}
      </button>
    );
  }

  return <div className="flex h-full w-full flex-col">{inner}</div>;
}
