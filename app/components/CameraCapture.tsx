"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { Images, RefreshCw, Square, X } from "lucide-react";
import {
  fileToCompressedDataUrl,
  videoFrameToCompressedDataUrl,
} from "@/lib/compressImage";
import {
  AUDIO_BITRATE,
  MAX_VIDEO_BYTES,
  pickRecorderMimeType,
  VIDEO_BITRATE,
  VIDEO_MAX_SECONDS,
  videoCaptureConstraints,
} from "@/lib/cameraVideo";
import Countdown from "./Countdown";

export type CaptureMeta = {
  blob?: Blob;
  mirrored?: boolean;
};

/**
 * Full-screen in-app camera (photo + video + gallery). Portaled to body so
 * iOS Safari doesn't clip it inside cards / overflow. Preview covers the
 * whole screen; controls sit on top.
 */
export default function CameraCapture({
  onCapture,
  onClose,
  initialMode = "photo",
  challenge,
}: {
  onCapture: (dataUrl: string, meta?: CaptureMeta) => void;
  onClose: () => void;
  initialMode?: "photo" | "video";
  challenge?: {
    title: string;
    description?: string;
    points?: number;
    deadlineIso?: string;
  };
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"photo" | "video">(initialMode);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      scrollY: window.scrollY,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${prev.scrollY}px`;
    body.style.width = "100%";
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.width = prev.bodyWidth;
      window.scrollTo(0, prev.scrollY);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);

    async function start() {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video:
            mode === "video"
              ? videoCaptureConstraints(facingMode)
              : {
                  facingMode: { ideal: facingMode },
                  width: { ideal: 2560 },
                  height: { ideal: 1440 },
                },
          audio: mode === "video",
        });
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && mode === "video") {
          if ("contentHint" in videoTrack) {
            (videoTrack as MediaStreamTrack & { contentHint: string }).contentHint = "motion";
          }
          try {
            await videoTrack.applyConstraints({
              width: 1920,
              height: 1080,
              frameRate: 30,
            });
          } catch {
            // Device may not support exact 1080p — keep the ideal constraints.
          }
        }
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
            mode === "video"
              ? "Kunde inte starta kameran. Kolla att appen har fått tillåtelse att använda kamera och mikrofon."
              : "Kunde inte starta kameran. Kolla att appen/webbläsaren har fått tillåtelse att använda den."
          );
        }
      }
    }

    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facingMode, mode]);

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

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !ready) return;
    const dataUrl = videoFrameToCompressedDataUrl(video, { mirror: facingMode === "user" });
    stopStream();
    onCapture(dataUrl);
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream || !ready || recording) return;
    const mimeType = pickRecorderMimeType();
    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: VIDEO_BITRATE,
      audioBitsPerSecond: AUDIO_BITRATE,
    });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => finish(mimeType || recorder.mimeType || "video/mp4");
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
    setElapsed(0);
    tickRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    stopTimerRef.current = setTimeout(stopRecording, VIDEO_MAX_SECONDS * 1000);
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
    const type = mimeType.split(";")[0] || "video/mp4";
    const blob = new Blob(chunksRef.current, { type });
    chunksRef.current = [];
    stopStream();
    if (blob.size < 500) {
      setProcessing(false);
      setError("Kunde inte spara videon, testa igen.");
      return;
    }
    if (blob.size > MAX_VIDEO_BYTES) {
      setProcessing(false);
      setError("Klippet blev för stort — spela in ett kortare.");
      return;
    }
    setProcessing(false);
    onCapture(URL.createObjectURL(blob), {
      blob,
      mirrored: facingMode === "user",
    });
  }

  function close() {
    clearTimers();
    stopStream();
    onClose();
  }

  function switchMode(next: "photo" | "video") {
    if (recording || processing || next === mode) return;
    setMode(next);
  }

  async function onGallery(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setProcessing(true);
      const dataUrl = await fileToCompressedDataUrl(file);
      stopStream();
      onCapture(dataUrl);
    } catch {
      setError("Kunde inte läsa bilden, testa en annan.");
      setProcessing(false);
    }
  }

  if (!mounted) return null;

  const ui = (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black overscroll-none"
      style={{
        width: "100vw",
        height: "100dvh",
        minHeight: "-webkit-fill-available",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Kamera"
    >
      <div className="relative mx-3 mt-[calc(env(safe-area-inset-top,0px)+0.65rem)] min-h-0 flex-1 overflow-hidden rounded-[1.75rem] bg-zinc-900">
        {error ? (
          <p className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-white/80">
            {error}
          </p>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 h-full w-full object-cover ${
              facingMode === "user" ? "scale-x-[-1]" : ""
            }`}
          />
        )}

        <div className="absolute inset-x-0 top-0 z-10 px-3 pt-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={close}
              aria-label="Stäng kameran"
              className="rounded-full bg-black/40 p-2.5 text-white backdrop-blur"
            >
              <X size={20} strokeWidth={1.75} />
            </button>
            {mode === "video" && recording ? (
              <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-sm font-medium text-white backdrop-blur">
                <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
                {elapsed}s / {VIDEO_MAX_SECONDS}s
              </span>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
              aria-label="Byt kamera"
              disabled={recording}
              className="rounded-full bg-black/40 p-2.5 text-white backdrop-blur disabled:opacity-30"
            >
              <RefreshCw size={20} strokeWidth={1.75} />
            </button>
          </div>
          {challenge && (
            <div className="mt-3 rounded-2xl bg-black/55 px-3.5 py-2.5 text-white backdrop-blur-md">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 font-display text-base font-medium leading-snug">
                  {challenge.title}
                </p>
                {challenge.deadlineIso && (
                  <Countdown
                    deadlineIso={challenge.deadlineIso}
                    className="shrink-0 text-lg text-white"
                  />
                )}
              </div>
              {challenge.description ? (
                <p className="mt-1 line-clamp-2 text-xs leading-snug text-white/75">
                  {challenge.description}
                </p>
              ) : null}
              {typeof challenge.points === "number" ? (
                <p className="mt-1 text-[0.7rem] font-semibold tracking-wide text-accent">
                  Värd {challenge.points} poäng
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="z-10 flex shrink-0 flex-col items-center gap-4 px-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] pt-4">
        <div className="flex items-center gap-8">
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            disabled={recording || processing}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur disabled:opacity-30"
            aria-label="Galleri"
          >
            <Images size={18} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={
              mode === "photo" ? capturePhoto : recording ? stopRecording : startRecording
            }
            disabled={!ready || processing}
            aria-label={
              mode === "photo" ? "Ta bild" : recording ? "Stoppa inspelning" : "Spela in video"
            }
            className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-[3px] border-white bg-white/15 transition active:scale-95 disabled:opacity-40"
          >
            {mode === "video" ? (
              recording ? (
                <Square size={22} className="fill-danger text-danger" />
              ) : (
                <span className="h-12 w-12 rounded-full bg-danger" />
              )
            ) : (
              <span className="h-12 w-12 rounded-full bg-white" />
            )}
          </button>
          <span className="h-11 w-11" aria-hidden />
        </div>

        <div className="flex items-center gap-1 rounded-full bg-black/45 p-1 backdrop-blur">
          <button
            type="button"
            disabled={recording || processing}
            onClick={() => switchMode("photo")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              mode === "photo" ? "bg-white text-ink" : "text-white/80"
            }`}
          >
            Foto
          </button>
          <button
            type="button"
            disabled={recording || processing}
            onClick={() => switchMode("video")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              mode === "video" ? "bg-white text-ink" : "text-white/80"
            }`}
          >
            Video
          </button>
        </div>
        <p className="text-xs text-white/70">
          {processing
            ? "Sparar…"
            : mode === "video"
              ? recording
                ? "Tryck för att stoppa"
                : `Filma upp till ${VIDEO_MAX_SECONDS} sekunder i 1080p`
              : "Foto, video eller galleri"}
        </p>
      </div>

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onGallery(e)}
      />
    </div>
  );

  return createPortal(ui, document.body);
}
