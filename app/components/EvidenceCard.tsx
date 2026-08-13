"use client";

/** Completed challenge photo: rounded image, points badge, white title plate. */
export default function EvidenceCard({
  photoUrl,
  title,
  points,
  onClick,
  className = "",
}: {
  photoUrl: string;
  title: string;
  points: number;
  onClick?: () => void;
  className?: string;
}) {
  const inner = (
    <div
      className={`flex h-full flex-col rounded-2xl shadow-[0_10px_32px_-8px_rgba(196,48,54,0.55),0_4px_14px_-4px_rgba(124,45,58,0.35)] ${className}`}
    >
      <div className="relative shrink-0">
        <div className="overflow-hidden rounded-t-2xl bg-black/[0.04]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt={title}
            className="aspect-[4/5] w-full object-cover"
          />
        </div>
        <span className="absolute right-2.5 top-2.5 flex h-8 min-w-8 items-center justify-center rounded-full bg-white px-2.5 text-sm font-semibold tabular text-ink shadow-[0_2px_10px_rgba(0,0,0,0.18)]">
          {points}
        </span>
        <span className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2 rounded-lg bg-white px-2.5 py-1 text-[0.65rem] font-semibold tracking-wide text-ink shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
          Utmaning
        </span>
      </div>
      <div className="flex flex-1 flex-col rounded-b-2xl border border-t-0 border-black/[0.06] bg-white px-3 pb-2.5 pt-4 sm:px-4 sm:pb-3 sm:pt-5">
        <p className="line-clamp-3 text-sm font-medium leading-snug text-ink">{title}</p>
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
