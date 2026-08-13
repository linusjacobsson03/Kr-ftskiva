"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  Download,
  ImagePlus,
  Images,
  ListChecks,
  Play,
  Trash2,
  Video,
  X,
} from "lucide-react";
import CameraCapture from "../components/CameraCapture";
import VideoRecorder from "../components/VideoRecorder";
import Lightbox from "../components/Lightbox";
import EvidenceCard from "../components/EvidenceCard";
import { useAuth } from "../providers";
import { fileToCompressedDataUrl } from "@/lib/compressImage";
import { extensionForDataUrl, saveItems } from "@/lib/download";
import type { PhotoItem, Submission } from "@/lib/types";
import Link from "next/link";

type AlbumEntry =
  | {
      key: string;
      kind: "photo";
      id: number;
      sortAt: number;
      photo: PhotoItem;
    }
  | {
      key: string;
      kind: "evidence";
      id: number;
      sortAt: number;
      submission: Submission;
    };

function PhotosContent() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [photosRes, subsRes] = await Promise.all([
      fetch("/api/photos", { cache: "no-store" }),
      fetch("/api/challenges/submissions", { cache: "no-store" }),
    ]);
    const photosData = await photosRes.json();
    const subsData = await subsRes.json();
    setPhotos(photosData.photos ?? []);
    setSubmissions(subsData.submissions ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 15000);
    return () => clearInterval(id);
  }, [load]);

  const feed = useMemo<AlbumEntry[]>(() => {
    const items: AlbumEntry[] = [
      ...photos.map((photo) => ({
        key: `photo-${photo.id}`,
        kind: "photo" as const,
        id: photo.id,
        sortAt: new Date(photo.created_at.replace(" ", "T") + "Z").getTime(),
        photo,
      })),
      ...submissions.map((submission) => ({
        key: `evidence-${submission.id}`,
        kind: "evidence" as const,
        id: submission.id,
        sortAt: new Date(submission.completed_at.replace(" ", "T") + "Z").getTime(),
        submission,
      })),
    ];
    return items.sort((a, b) => b.sortAt - a.sortAt);
  }, [photos, submissions]);

  const lightboxItems = useMemo(
    () =>
      feed.map((entry) =>
        entry.kind === "photo"
          ? {
              id: entry.id,
              url: entry.photo.image_data,
              caption: entry.photo.caption || entry.photo.display_name,
              displayName: entry.photo.display_name,
            }
          : {
              id: entry.id + 1_000_000,
              url: entry.submission.photo_data,
              caption: entry.submission.title,
              displayName: entry.submission.display_name,
            }
      ),
    [feed]
  );

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setPreview(dataUrl);
    } catch {
      setError("Kunde inte läsa bilden, testa en annan.");
    }
  }

  async function upload() {
    if (!preview) return;
    setUploading(true);
    setError(null);
    try {
      const res = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: preview, caption }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Kunde inte ladda upp bilden.");
        return;
      }
      setPreview(null);
      setCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Ta bort bilden?")) return;
    await fetch(`/api/photos/${id}`, { method: "DELETE" });
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelected(new Set());
  }

  function toggleSelected(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === feed.length ? new Set() : new Set(feed.map((e) => e.key))
    );
  }

  async function downloadSelected() {
    const items = feed
      .filter((e) => selected.has(e.key))
      .map((e) =>
        e.kind === "photo"
          ? {
              dataUrl: e.photo.image_data,
              filename: `kraftskiva-${e.id}.${extensionForDataUrl(e.photo.image_data)}`,
            }
          : {
              dataUrl: e.submission.photo_data,
              filename: `kraftskiva-bevis-${e.id}.${extensionForDataUrl(e.submission.photo_data)}`,
            }
      );
    await saveItems(items);
  }

  function onThumbnailClick(index: number, key: string) {
    if (selectMode) {
      toggleSelected(key);
    } else {
      setLightboxIndex(index);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-7">
      {showCamera && (
        <CameraCapture
          onCapture={(dataUrl) => {
            setPreview(dataUrl);
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
      {showVideoRecorder && (
        <VideoRecorder
          onCapture={(dataUrl) => {
            setPreview(dataUrl);
            setShowVideoRecorder(false);
          }}
          onClose={() => setShowVideoRecorder(false)}
        />
      )}
      {lightboxIndex !== null && (
        <Lightbox
          items={lightboxItems}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium text-cream">Album</h1>
          <p className="mt-0.5 text-sm text-muted">
            Dina och andras foton — och alla bildbevis från utmaningarna
          </p>
        </div>
        {feed.length > 0 && (
          <button onClick={toggleSelectMode} className="btn-secondary shrink-0 text-sm">
            {selectMode ? (
              <X size={14} strokeWidth={1.75} />
            ) : (
              <ListChecks size={14} strokeWidth={1.75} />
            )}
            {selectMode ? "Avbryt" : "Välj"}
          </button>
        )}
      </div>

      {selectMode && (
        <div className="card flex items-center justify-between gap-3 p-3">
          <button onClick={toggleSelectAll} className="btn-ghost text-xs">
            {selected.size === feed.length ? "Avmarkera alla" : "Markera alla"}
          </button>
          <button
            onClick={() => void downloadSelected()}
            disabled={selected.size === 0}
            className="btn-primary text-sm"
          >
            <Download size={14} strokeWidth={1.75} />
            Ladda ner {selected.size > 0 ? `(${selected.size})` : ""}
          </button>
        </div>
      )}

      {!selectMode && user && (
        <div className="card space-y-3 p-4">
          {preview ? (
            <div className="space-y-3">
              {preview.startsWith("data:video/") ? (
                <video
                  src={preview}
                  controls
                  playsInline
                  className="max-h-72 w-full rounded-xl object-cover"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={preview}
                  alt="Förhandsvisning"
                  className="max-h-72 w-full rounded-xl object-cover"
                />
              )}
              <input
                className="input-field"
                placeholder="Skriv en bildtext… (valfritt)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={200}
              />
              <div className="flex gap-2">
                <button onClick={() => void upload()} disabled={uploading} className="btn-primary flex-1">
                  {uploading
                    ? "Laddar upp…"
                    : preview.startsWith("data:video/")
                      ? "Dela video"
                      : "Dela foto"}
                </button>
                <button
                  onClick={() => {
                    setPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="btn-secondary"
                >
                  <X size={16} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-black/15 py-9 text-center">
              <ImagePlus size={26} strokeWidth={1.25} className="text-accent-strong" />
              <span className="text-sm font-medium text-cream">Lägg till ett foto eller en video</span>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="btn-primary text-sm"
                >
                  <Camera size={16} strokeWidth={1.75} />
                  Ta foto
                </button>
                <button
                  type="button"
                  onClick={() => setShowVideoRecorder(true)}
                  className="btn-secondary text-sm"
                >
                  <Video size={16} strokeWidth={1.75} />
                  Filma
                </button>
                <label className="btn-secondary cursor-pointer text-sm">
                  <Images size={16} strokeWidth={1.75} />
                  Galleri
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onFileChange}
                  />
                </label>
              </div>
            </div>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      )}

      {!selectMode && !user && (
        <Link
          href="/inbjudan"
          className="card block p-4 text-center text-sm text-muted transition hover:bg-black/[0.03]"
        >
          Öppna din inbjudan för att ladda upp foton
        </Link>
      )}

      {loading ? (
        <p className="text-center text-sm text-muted">Laddar album…</p>
      ) : feed.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Camera size={26} strokeWidth={1.25} className="text-muted" />
          <p className="text-sm text-muted">Inga foton än — bli den första</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {feed.map((entry, index) => {
            const isSelected = selected.has(entry.key);

            if (entry.kind === "evidence") {
              return (
                <div key={entry.key} className="relative">
                  <EvidenceCard
                    photoUrl={entry.submission.photo_data}
                    title={entry.submission.title}
                    points={entry.submission.points_awarded}
                    onClick={() => onThumbnailClick(index, entry.key)}
                  />
                  {selectMode && (
                    <button
                      type="button"
                      onClick={() => toggleSelected(entry.key)}
                      className={`absolute left-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border backdrop-blur ${
                        isSelected
                          ? "border-accent bg-accent text-ink"
                          : "border-white/60 bg-black/30 text-transparent"
                      }`}
                      aria-label="Markera"
                    >
                      <Check size={12} strokeWidth={3} />
                    </button>
                  )}
                  <p className="mt-1.5 px-1 text-xs text-muted">
                    {entry.submission.display_name}
                  </p>
                </div>
              );
            }

            const photo = entry.photo;
            const isVideo = photo.image_data.startsWith("data:video/");
            return (
              <div key={entry.key} className="relative">
                <button
                  type="button"
                  onClick={() => onThumbnailClick(index, entry.key)}
                  className="block w-full text-left"
                >
                  <div className="relative overflow-hidden rounded-2xl bg-black/[0.04]">
                    {isVideo ? (
                      <video
                        src={photo.image_data}
                        muted
                        playsInline
                        preload="metadata"
                        className="aspect-[4/5] w-full object-cover"
                      />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={photo.image_data}
                        alt={photo.caption || "Fest-foto"}
                        className="aspect-[4/5] w-full object-cover"
                      />
                    )}
                    {isVideo && (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="rounded-full bg-black/45 p-2.5 backdrop-blur">
                          <Play size={16} className="fill-white text-white" />
                        </span>
                      </span>
                    )}
                    {selectMode && (
                      <span
                        className={`absolute left-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full border backdrop-blur ${
                          isSelected
                            ? "border-accent bg-accent text-ink"
                            : "border-white/60 bg-black/30 text-transparent"
                        }`}
                      >
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div className="mt-2 rounded-2xl border border-black/[0.06] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(28,23,18,0.04)]">
                    <p className="text-sm font-medium leading-snug text-ink">
                      {photo.caption?.trim() || photo.display_name}
                    </p>
                    {photo.caption?.trim() && (
                      <p className="mt-0.5 text-xs text-muted">{photo.display_name}</p>
                    )}
                  </div>
                </button>
                {!selectMode && (user?.id === photo.user_id || user?.isAdmin) && (
                  <button
                    onClick={() => void remove(photo.id)}
                    aria-label="Ta bort foto"
                    className="mt-1.5 px-1 text-xs text-muted transition hover:text-danger"
                  >
                    <Trash2 size={12} strokeWidth={1.75} className="inline" /> Ta bort
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PhotosPage() {
  return <PhotosContent />;
}
