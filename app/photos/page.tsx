"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import Avatar from "../components/Avatar";
import CameraCapture from "../components/CameraCapture";
import VideoRecorder from "../components/VideoRecorder";
import Lightbox from "../components/Lightbox";
import { useAuth } from "../providers";
import { fileToCompressedDataUrl } from "@/lib/compressImage";
import { extensionForDataUrl, saveItems } from "@/lib/download";
import type { PhotoItem } from "@/lib/types";
import Link from "next/link";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso + "Z").getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "nyss";
  if (mins < 60) return `${mins} min sedan`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} tim sedan`;
  return `${Math.floor(hours / 24)} d sedan`;
}

function PhotosContent() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/photos", { cache: "no-store" });
    const data = await res.json();
    setPhotos(data.photos ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

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

  function toggleSelected(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === photos.length ? new Set() : new Set(photos.map((p) => p.id))));
  }

  async function downloadSelected() {
    const items = photos
      .filter((p) => selected.has(p.id))
      .map((p) => ({
        dataUrl: p.image_data,
        filename: `kraftskiva-${p.id}.${extensionForDataUrl(p.image_data)}`,
      }));
    await saveItems(items);
  }

  function onThumbnailClick(index: number, id: number) {
    if (selectMode) {
      toggleSelected(id);
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
          items={photos.map((p) => ({
            id: p.id,
            url: p.image_data,
            caption: p.caption,
            displayName: p.display_name,
          }))}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium text-cream">Dagens foton</h1>
          <p className="mt-0.5 text-sm text-muted">
            Dela foton och korta klipp från kvällen med hela gänget
          </p>
        </div>
        {photos.length > 0 && (
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
            {selected.size === photos.length ? "Avmarkera alla" : "Markera alla"}
          </button>
          <button
            onClick={downloadSelected}
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
                <button onClick={upload} disabled={uploading} className="btn-primary flex-1">
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
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.14] py-9 text-center">
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
          className="card block p-4 text-center text-sm text-muted transition hover:bg-white/[0.04]"
        >
          Öppna din inbjudan för att ladda upp foton
        </Link>
      )}

      {loading ? (
        <p className="text-center text-sm text-muted">Laddar foton…</p>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Camera size={26} strokeWidth={1.25} className="text-muted" />
          <p className="text-sm text-muted">Inga foton än — bli den första</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => {
            const isVideo = photo.image_data.startsWith("data:video/");
            const isSelected = selected.has(photo.id);
            return (
              <div key={photo.id} className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => onThumbnailClick(index, photo.id)}
                  className="relative block w-full"
                >
                  {isVideo ? (
                    <video
                      src={photo.image_data}
                      muted
                      playsInline
                      preload="metadata"
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={photo.image_data}
                      alt={photo.caption || "Fest-foto"}
                      className="aspect-square w-full object-cover"
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
                      className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border backdrop-blur ${
                        isSelected
                          ? "border-accent bg-accent text-ink"
                          : "border-white/60 bg-black/30 text-transparent"
                      }`}
                    >
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </button>
                <div className="space-y-1 p-2.5">
                  <div className="flex items-center gap-1.5">
                    <Avatar name={photo.display_name} size={16} />
                    <p className="truncate text-xs font-medium text-cream">
                      {photo.display_name}
                    </p>
                  </div>
                  {photo.caption && (
                    <p className="line-clamp-2 text-xs text-muted">{photo.caption}</p>
                  )}
                  <div className="flex items-center justify-between pt-0.5">
                    <p className="text-[10px] text-muted/70">{timeAgo(photo.created_at)}</p>
                    {!selectMode && (user?.id === photo.user_id || user?.isAdmin) && (
                      <button
                        onClick={() => remove(photo.id)}
                        aria-label="Ta bort foto"
                        className="text-muted/70 transition hover:text-danger"
                      >
                        <Trash2 size={12} strokeWidth={1.75} />
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
