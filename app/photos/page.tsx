"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  Download,
  Images,
  Play,
  Trash2,
  Video,
  X,
} from "lucide-react";
import CameraCapture from "../components/CameraCapture";
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
      submission: Submission & { photo_data: string };
    };

function PhotosContent() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [previews, setPreviews] = useState<string[]>([]);
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
      ...submissions
        // The API only returns submissions with photo evidence, but the
        // shared Submission type also covers the profile view where a
        // photo is optional — narrow it here so the rest of this file can
        // rely on a plain `string`.
        .filter(
          (submission): submission is Submission & { photo_data: string } =>
            !!submission.photo_data
        )
        .map((submission) => ({
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
              caption: entry.photo.caption || undefined,
              displayName: entry.photo.display_name,
            }
          : {
              id: entry.id + 1_000_000,
              url: entry.submission.photo_data,
              caption: entry.submission.title,
              displayName: entry.submission.display_name,
              isChallenge: true,
              points: entry.submission.points_awarded,
            }
      ),
    [feed]
  );

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) =>
      f.type.startsWith("image/")
    );
    // Reset so the same files can be chosen again later.
    e.target.value = "";
    if (files.length === 0) return;

    setError(null);
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        urls.push(await fileToCompressedDataUrl(file));
      }
      setPreviews(urls);
    } catch {
      setError("Kunde inte läsa bilderna, testa igen.");
    } finally {
      setUploading(false);
    }
  }

  async function upload() {
    if (previews.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      let failed = 0;
      for (const imageData of previews) {
        const res = await fetch("/api/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageData, caption }),
        });
        if (!res.ok) failed += 1;
      }
      if (failed > 0 && failed === previews.length) {
        setError("Kunde inte ladda upp bilderna.");
        return;
      }
      if (failed > 0) {
        setError(`${failed} av ${previews.length} gick inte att ladda upp.`);
      }
      setPreviews([]);
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
            setPreviews([dataUrl]);
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
      {showVideoRecorder && (
        <CameraCapture
          initialMode="video"
          onCapture={(dataUrl) => {
            setPreviews([dataUrl]);
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

      <div>
        <h1 className="font-display text-2xl font-medium text-cream">Album</h1>
        <p className="mt-0.5 text-sm text-muted">
          Dina och andras foton — och alla bildbevis från utmaningarna
        </p>
      </div>

      {selectMode && (
        <div className="sticky top-0 z-20 -mx-4 bg-gradient-to-b from-bg from-70% to-transparent px-4 pb-3 pt-1">
          <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3 rounded-3xl border border-black/10 bg-white/80 p-2.5 shadow-[0_12px_32px_-16px_rgba(28,23,18,0.35)] backdrop-blur-xl">
            <button onClick={toggleSelectAll} className="btn-ghost shrink-0 px-2 text-xs">
              {selected.size === feed.length ? "Avmarkera alla" : "Markera alla"}
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectMode}
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-cream transition hover:bg-white"
              >
                Avbryt
              </button>
              <button
                onClick={() => void downloadSelected()}
                disabled={selected.size === 0}
                className="btn-primary rounded-full text-sm"
              >
                <Download size={14} strokeWidth={1.75} />
                Ladda ner {selected.size > 0 ? `(${selected.size})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {!selectMode && (user || feed.length > 0) && (
        <div className="sticky top-0 z-20 -mx-4 bg-gradient-to-b from-bg from-70% to-transparent px-4 pb-3 pt-1">
          <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-3">
            {user && (
              <div className="flex w-full items-stretch rounded-full border border-black/10 bg-white/80 p-1 shadow-[0_12px_32px_-16px_rgba(28,23,18,0.35)] backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1.5 py-2.5 text-[0.72rem] font-semibold leading-tight text-cream transition hover:bg-white active:bg-white active:text-ink"
                >
                  <Camera size={16} strokeWidth={2.5} />
                  Ta foto
                </button>
                <button
                  type="button"
                  onClick={() => setShowVideoRecorder(true)}
                  className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1.5 py-2.5 text-[0.72rem] font-semibold leading-tight text-cream transition hover:bg-white active:bg-white active:text-ink"
                >
                  <Video size={16} strokeWidth={2.5} />
                  Filma
                </button>
                <label className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full px-1.5 py-2.5 text-[0.72rem] font-semibold leading-tight text-cream transition hover:bg-white has-[:focus]:bg-white">
                  <Images size={16} strokeWidth={2.5} />
                  Galleri
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={onFileChange}
                  />
                </label>
              </div>
            )}
            {feed.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectMode}
                className="rounded-full border border-black/10 bg-white/80 px-5 py-2.5 text-sm font-medium text-cream shadow-[0_8px_24px_-14px_rgba(28,23,18,0.35)] backdrop-blur-xl transition hover:bg-white"
              >
                Välj bilder
              </button>
            )}
          </div>
        </div>
      )}

      {!selectMode && user && (
        <>
          {previews.length > 0 && (
            <div className="card space-y-3 p-4">
              {previews.length === 1 && previews[0].startsWith("data:video/") ? (
                <video
                  src={previews[0]}
                  controls
                  playsInline
                  className="max-h-72 w-full rounded-xl object-cover"
                />
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {previews.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${i}-${src.slice(0, 32)}`}
                      src={src}
                      alt={`Förhandsvisning ${i + 1}`}
                      className="aspect-square w-full rounded-xl object-cover"
                    />
                  ))}
                </div>
              )}
              <p className="text-xs text-muted">
                {previews.length === 1
                  ? "1 bild vald"
                  : `${previews.length} bilder valda`}
              </p>
              <input
                className="input-field"
                placeholder="Skriv en bildtext… (valfritt, samma för alla)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={200}
              />
              <div className="flex gap-2">
                <button onClick={() => void upload()} disabled={uploading} className="btn-primary flex-1">
                  {uploading
                    ? "Laddar upp…"
                    : previews.length === 1 && previews[0].startsWith("data:video/")
                      ? "Dela video"
                      : previews.length === 1
                        ? "Dela foto"
                        : `Dela ${previews.length} foton`}
                </button>
                <button
                  onClick={() => {
                    setPreviews([]);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="btn-secondary"
                >
                  <X size={16} strokeWidth={1.75} />
                </button>
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
            </div>
          )}
          {previews.length === 0 && error && <p className="text-sm text-danger">{error}</p>}
        </>
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
        <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4">
          {feed.map((entry, index) => {
            const isSelected = selected.has(entry.key);

            if (entry.kind === "evidence") {
              return (
                <div key={entry.key} className="relative flex h-full flex-col">
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
                </div>
              );
            }

            const photo = entry.photo;
            const isVideo = photo.image_data.startsWith("data:video/");
            const isOwn = user?.id === photo.user_id;
            return (
              <div key={entry.key} className="relative flex h-full flex-col">
                <div className="flex h-full flex-col overflow-hidden rounded-2xl shadow-[0_2px_10px_-4px_rgba(28,23,18,0.12)]">
                  <button
                    type="button"
                    onClick={() => onThumbnailClick(index, entry.key)}
                    className="relative block w-full shrink-0 bg-black/[0.04] text-left"
                  >
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
                  </button>
                  <div className="flex flex-1 flex-col border border-t-0 border-black/[0.06] bg-white px-3 py-2.5 sm:px-4 sm:py-3">
                    <button
                      type="button"
                      onClick={() => onThumbnailClick(index, entry.key)}
                      className="text-left"
                    >
                      <p className="line-clamp-3 text-sm font-medium leading-snug text-ink">
                        {photo.caption?.trim() || photo.display_name}
                      </p>
                      {photo.caption?.trim() && (
                        <p className="mt-0.5 text-xs text-muted">{photo.display_name}</p>
                      )}
                    </button>
                    {!selectMode && isOwn && (
                      <button
                        type="button"
                        onClick={() => void remove(photo.id)}
                        aria-label="Ta bort foto"
                        className="mt-auto pt-2 text-left text-xs text-muted transition hover:text-danger"
                      >
                        <Trash2 size={12} strokeWidth={1.75} className="mr-1 inline" />
                        Ta bort
                      </button>
                    )}
                  </div>
                </div>
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
