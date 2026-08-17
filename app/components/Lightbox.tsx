"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, X } from "lucide-react";
import { extensionForDataUrl, saveItems } from "@/lib/download";

export interface LightboxItem {
  id: number;
  url: string;
  caption?: string;
  displayName?: string;
  /** Challenge evidence in album */
  isChallenge?: boolean;
  points?: number;
  mirrored?: boolean;
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const ignoreScrollRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const item = items[index];

  // Jump to the opened slide (and when arrows/keyboard change index).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !mounted) return;
    ignoreScrollRef.current = true;
    el.scrollTo({ left: index * el.clientWidth, behavior: "auto" });
    const t = window.setTimeout(() => {
      ignoreScrollRef.current = false;
    }, 80);
    return () => window.clearTimeout(t);
  }, [index, mounted, items.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") {
        onIndexChange((index - 1 + items.length) % items.length);
      }
      if (e.key === "ArrowRight") {
        onIndexChange((index + 1) % items.length);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onIndexChange, index, items.length]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      scrollY: window.scrollY,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";
    // Freeze page scroll so vertical swipes on the lightbox can't move the album.
    body.style.position = "fixed";
    body.style.top = `-${prev.scrollY}px`;
    body.style.width = "100%";

    let startX = 0;
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("video, input, textarea")) return;
      const dx = Math.abs(e.touches[0].clientX - startX);
      const dy = Math.abs(e.touches[0].clientY - startY);
      // Kill vertical rubber-band; keep horizontal swipe between photos.
      if (dy > dx) e.preventDefault();
    };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.overscrollBehavior = prev.bodyOverscroll;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.width = prev.bodyWidth;
      window.scrollTo(0, prev.scrollY);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  const onScroll = useCallback(() => {
    if (ignoreScrollRef.current) return;
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index && next >= 0 && next < items.length) {
      onIndexChange(next);
    }
  }, [index, items.length, onIndexChange]);

  if (!item || !mounted) return null;

  return createPortal(
    <div className="fixed left-0 top-0 z-50 flex h-dvh w-full flex-col overflow-hidden overscroll-none bg-black [touch-action:none]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/55 to-transparent p-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
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
            void saveItems([
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

      {/* Native horizontal swipe only — no vertical scroll */}
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain overscroll-y-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
      >
        {items.map((slide) => {
          const isVideo = slide.url.startsWith("data:video/") || slide.url.startsWith("blob:");
          return (
            <div
              key={slide.id}
              className="flex h-full w-full shrink-0 snap-center snap-always items-center justify-center overflow-hidden px-3 [touch-action:pan-x]"
            >
              <div
                className={`relative max-h-[min(88dvh,100%)] max-w-full overflow-hidden ${
                  slide.isChallenge
                    ? "rounded-[1.75rem] shadow-[0_12px_40px_-6px_rgba(196,48,54,0.65),0_6px_20px_-4px_rgba(124,45,58,0.45)] sm:rounded-[2rem]"
                    : ""
                }`}
              >
                {isVideo ? (
                  <video
                    src={slide.url}
                    controls
                    playsInline
                    className={`max-h-[min(88dvh,100%)] max-w-full rounded-[1.75rem] object-contain sm:rounded-[2rem] ${
                      slide.mirrored ? "scale-x-[-1]" : ""
                    }`}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slide.url}
                    alt={slide.caption || ""}
                    className="pointer-events-none max-h-[min(88dvh,100%)] max-w-full select-none rounded-[1.75rem] object-contain sm:rounded-[2rem]"
                    draggable={false}
                  />
                )}
                {slide.isChallenge && (
                  <>
                    <span className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-lg bg-white px-2.5 py-1 text-[0.7rem] font-semibold tracking-wide text-ink shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
                      Utmaning
                    </span>
                    {typeof slide.points === "number" && (
                      <span className="absolute right-3 top-3 z-10 flex h-8 min-w-8 items-center justify-center rounded-full bg-white px-2.5 text-sm font-semibold tabular text-ink shadow-[0_2px_10px_rgba(0,0,0,0.25)]">
                        {slide.points}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/70 to-transparent p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-center">
        {item.displayName && (
          <p className="text-sm font-medium text-white">{item.displayName}</p>
        )}
        {item.caption && (
          <p className="mt-0.5 text-sm text-white/80">{item.caption}</p>
        )}
      </div>
    </div>,
    document.body
  );
}
