"use client";

/** Completed challenge photo: rounded image, points badge, white title plate. */
export default function EvidenceCard({
  photoUrl,
  title,
  points,
  onClick,
}: {
  photoUrl: string;
  title: string;
  points: number;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-black/[0.04]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt={title}
          className="aspect-[4/5] w-full object-cover"
        />
        <span className="absolute right-2.5 top-2.5 flex h-8 min-w-8 items-center justify-center rounded-full bg-white px-2.5 text-sm font-semibold tabular text-ink shadow-[0_2px_10px_rgba(0,0,0,0.18)]">
          {points}
        </span>
      </div>
      <div className="mt-2 rounded-2xl border border-black/[0.06] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(28,23,18,0.04)]">
        <p className="text-sm font-medium leading-snug text-ink">{title}</p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full text-left">
        {inner}
      </button>
    );
  }

  return <div className="w-full">{inner}</div>;
}
