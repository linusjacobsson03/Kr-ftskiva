"use client";

import { useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { extensionForDataUrl, saveItems } from "@/lib/download";

export interface LightboxItem {
  id: number;
  url: string;
  caption?: string;
  displayName?: string;
}

export default function Lightbox({
  items,
  index,
  onIndexChange,
  onClose,
}: {
  items: LightboxItem[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const item = items[index];

  const goPrev = useCallback(() => {
    onIndexChange((index - 1 + items.length) % items.length);
  }, [index, items.length, onIndexChange]);

  const goNext = useCallback(() => {
    onIndexChange((index + 1) % items.length);
  }, [index, items.length, onIndexChange]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, goPrev, goNext]);

  if (!item) return null;
  const isVideo = item.url.startsWith("data:video/");

  return (
    <div className="fixed left-0 top-0 z-50 h-dvh w-full overflow-hidden bg-black">
      {isVideo ? (
        <video
          key={item.id}
          src={item.url}
          controls
          autoPlay
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.url}
          alt={item.caption || ""}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Controls float directly on top of the media, edge to edge — a
          separate opaque toolbar would eat into the "fills the screen"
          feel this is going for. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/55 to-transparent p-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <button
          onClick={onClose}
          aria-label="Stäng"
          className="pointer-events-auto rounded-full bg-black/40 p-2.5 text-white backdrop-blur"
        >
          <X size={20} strokeWidth={1.75} />
        </button>
        {items.length > 1 && (
          <span className="pointer-events-auto rounded-full bg-black/40 px-3 py-1 text-sm tabular text-white backdrop-blur">
            {index + 1} / {items.length}
          </span>
        )}
        <button
          onClick={() =>
            saveItems([
              {
                dataUrl: item.url,
                filename: `kraftskiva-${item.id}.${extensionForDataUrl(item.url)}`,
              },
            ])
          }
          aria-label="Ladda ner"
          className="pointer-events-auto rounded-full bg-black/40 p-2.5 text-white backdrop-blur"
        >
          <Download size={20} strokeWidth={1.75} />
        </button>
      </div>

      {items.length > 1 && (
        <>
          <button
            onClick={goPrev}
            aria-label="Föregående"
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur"
          >
            <ChevronLeft size={22} strokeWidth={1.75} />
          </button>
          <button
            onClick={goNext}
            aria-label="Nästa"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur"
          >
            <ChevronRight size={22} strokeWidth={1.75} />
          </button>
        </>
      )}

      {/* Skipped for video: it would sit on top of the native controls bar. */}
      {!isVideo && (item.displayName || item.caption) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-center">
          {item.displayName && (
            <p className="text-sm font-medium text-white">{item.displayName}</p>
          )}
          {item.caption && <p className="mt-0.5 text-sm text-white/80">{item.caption}</p>}
        </div>
      )}
    </div>
  );
}
