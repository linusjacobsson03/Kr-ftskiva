"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { videoFrameToCompressedDataUrl } from "@/lib/compressImage";

/**
 * A full-screen in-app camera view, used instead of handing off to the
 * native camera app (`<input capture>`). Building our own means we control
 * exactly what gets saved — in particular, the front camera's preview is
 * shown mirrored (natural, like looking in a mirror while framing
 * yourself) but the captured photo is un-mirrored before it's handed back,
 * the same convention Snapchat etc. use. `<input capture>` gives no such
 * control — whether the saved file comes back mirrored is entirely up to
 * the phone's own camera app and varies by device.
 */
export default function CameraCapture({
  onCapture,
  onClose,
}: {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);

    async function start() {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) {
          setError(
            "Kunde inte starta kameran. Kolla att appen/webbläsaren har fått tillåtelse att använda den."
          );
        }
      }
    }

    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facingMode]);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !ready) return;
    const dataUrl = videoFrameToCompressedDataUrl(video, { mirror: facingMode === "user" });
    stopStream();
    onCapture(dataUrl);
  }

  function close() {
    stopStream();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <button
          onClick={close}
          aria-label="Stäng kameran"
          className="rounded-full bg-white/10 p-2.5 text-white backdrop-blur"
        >
          <X size={20} strokeWidth={1.75} />
        </button>
        <button
          onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
          aria-label="Byt kamera"
          className="rounded-full bg-white/10 p-2.5 text-white backdrop-blur"
        >
          <RefreshCw size={20} strokeWidth={1.75} />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {error ? (
          <p className="max-w-xs px-6 text-center text-sm text-white/80">{error}</p>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
          />
        )}
      </div>

      <div className="flex items-center justify-center p-8 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <button
          onClick={capture}
          disabled={!ready}
          aria-label="Ta bild"
          className="h-16 w-16 rounded-full border-4 border-white bg-white/20 transition active:scale-95 disabled:opacity-40"
        />
      </div>
    </div>
  );
}
