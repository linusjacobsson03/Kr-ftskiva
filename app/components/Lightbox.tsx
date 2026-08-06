"use client";

import { useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { downloadDataUrl, extensionForDataUrl } from "@/lib/download";

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
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <button
          onClick={onClose}
          aria-label="Stäng"
          className="rounded-full bg-white/10 p-2.5 text-white backdrop-blur"
        >
          <X size={20} strokeWidth={1.75} />
        </button>
        {items.length > 1 && (
          <span className="text-sm tabular text-white/60">
            {index + 1} / {items.length}
          </span>
        )}
        <button
          onClick={() => downloadDataUrl(item.url, `kraftskiva-${item.id}.${extensionForDataUrl(item.url)}`)}
          aria-label="Ladda ner"
          className="rounded-full bg-white/10 p-2.5 text-white backdrop-blur"
        >
          <Download size={20} strokeWidth={1.75} />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-3">
        {items.length > 1 && (
          <button
            onClick={goPrev}
            aria-label="Föregående"
            className="absolute left-2 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur"
          >
            <ChevronLeft size={22} strokeWidth={1.75} />
          </button>
        )}

        {isVideo ? (
          <video
            key={item.id}
            src={item.url}
            controls
            autoPlay
            playsInline
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.caption || ""}
            className="max-h-full max-w-full object-contain"
          />
        )}

        {items.length > 1 && (
          <button
            onClick={goNext}
            aria-label="Nästa"
            className="absolute right-2 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur"
          >
            <ChevronRight size={22} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {(item.displayName || item.caption) && (
        <div className="p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-center">
          {item.displayName && <p className="text-sm font-medium text-white">{item.displayName}</p>}
          {item.caption && <p className="mt-0.5 text-sm text-white/60">{item.caption}</p>}
        </div>
      )}
    </div>
  );
}
