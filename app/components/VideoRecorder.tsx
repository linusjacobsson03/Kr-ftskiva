"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Square, X } from "lucide-react";
import { createMirroredCaptureStream } from "@/lib/mirrorVideoStream";

// Vercel Functions hard-cap the request body at 4.5MB, and base64 inflates
// binary size by ~1.33x, so raw output must stay well under that. At these
// numbers, 8s tops out around (2.2 + 0.096) Mbps * 8s / 8 ≈ 2.3MB raw, i.e.
// ~3.1MB base64 — comfortable headroom below the ~3.3MB raw / 4.4MB base64
// ceiling enforced server-side (see MAX_VIDEO_CHARS in api/photos/route.ts)
// even if a busy, high-motion scene pushes the encoder above its target.
const MAX_SECONDS = 8;
const VIDEO_BITRATE = 2_200_000; // ~2.2 Mbps — the previous 1.2 Mbps looked visibly soft/blocky
const AUDIO_BITRATE = 96_000;

function pickMimeType(): string {
  const candidates = [
    "video/mp4", // Safari/iOS 14.5+
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

/**
 * Short in-app video capture (max 8s), mirroring CameraCapture's UX: same
 * full-screen camera view and front/back toggle, but with a record button
 * instead of a shutter. Deliberately short and re-encoded at a modest
 * bitrate so clips reliably fit under Vercel's 4.5MB request body limit —
 * see the constants above.
 */
export default function VideoRecorder({
  onCapture,
  onClose,
}: {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mirrorStopRef = useRef<(() => void) | null>(null);

  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);

    async function start() {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: true,
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
            "Kunde inte starta kameran. Kolla att appen/webbläsaren har fått tillåtelse att använda kamera och mikrofon."
          );
        }
      }
    }

    start();
    return () => {
      cancelled = true;
      mirrorStopRef.current?.();
      mirrorStopRef.current = null;
      stopStream();
      clearTimers();
    };
  }, [facingMode]);

  function clearTimers() {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    stopTimerRef.current = null;
    tickRef.current = null;
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function startRecording() {
    const stream = streamRef.current;
    const video = videoRef.current;
    if (!stream || !video || !ready || recording) return;
    const mimeType = pickMimeType();
    let recordStream = stream;
    if (facingMode === "user") {
      const mirrored = createMirroredCaptureStream(video, stream);
      recordStream = mirrored.stream;
      mirrorStopRef.current = mirrored.stop;
    }
    const recorder = new MediaRecorder(recordStream, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: VIDEO_BITRATE,
      audioBitsPerSecond: AUDIO_BITRATE,
    });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      mirrorStopRef.current?.();
      mirrorStopRef.current = null;
      finish(mimeType || recorder.mimeType || "video/webm");
    };
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
    setElapsed(0);

    tickRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    stopTimerRef.current = setTimeout(stopRecording, MAX_SECONDS * 1000);
  }

  function stopRecording() {
    clearTimers();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      setProcessing(true);
      recorderRef.current.stop();
    }
    setRecording(false);
  }

  function finish(mimeType: string) {
    const blob = new Blob(chunksRef.current, { type: mimeType });
    chunksRef.current = [];
    stopStream();
    const reader = new FileReader();
    reader.onload = () => {
      setProcessing(false);
      onCapture(reader.result as string);
    };
    reader.onerror = () => {
      setProcessing(false);
      setError("Kunde inte spara videon, testa igen.");
    };
    reader.readAsDataURL(blob);
  }

  function close() {
    clearTimers();
    mirrorStopRef.current?.();
    mirrorStopRef.current = null;
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
        {recording && (
          <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-sm font-medium text-white backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
            {elapsed}s / {MAX_SECONDS}s
          </span>
        )}
        <button
          onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
          aria-label="Byt kamera"
          disabled={recording}
          className="rounded-full bg-white/10 p-2.5 text-white backdrop-blur disabled:opacity-30"
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

      <div className="flex flex-col items-center gap-2 p-8 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={!ready || processing}
          aria-label={recording ? "Stoppa inspelning" : "Spela in video"}
          className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/20 transition active:scale-95 disabled:opacity-40"
        >
          {recording ? (
            <Square size={22} className="fill-danger text-danger" />
          ) : (
            <span className="h-11 w-11 rounded-full bg-danger" />
          )}
        </button>
        <p className="text-xs text-white/60">
          {processing ? "Sparar…" : recording ? "Tryck för att stoppa" : "Håll klippet kort"}
        </p>
      </div>
    </div>
  );
}
