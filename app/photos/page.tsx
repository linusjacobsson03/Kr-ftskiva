"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AuthGate from "../components/AuthGate";
import { useAuth } from "../providers";
import { fileToCompressedDataUrl } from "@/lib/compressImage";
import type { PhotoItem } from "@/lib/types";

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

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <div>
        <h1 className="text-2xl font-extrabold">📸 Dagens foton</h1>
        <p className="text-white/60">Dela bilder från kvällen med hela gänget</p>
      </div>

      <div className="card space-y-3 p-4">
        {preview ? (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Förhandsvisning" className="max-h-72 w-full rounded-xl object-cover" />
            <input
              className="input-field"
              placeholder="Skriv en rolig bildtext… (valfritt)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
            />
            <div className="flex gap-2">
              <button onClick={upload} disabled={uploading} className="btn-primary flex-1">
                {uploading ? "Laddar upp…" : "Dela foto 🎉"}
              </button>
              <button
                onClick={() => {
                  setPreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="btn-secondary"
              >
                Avbryt
              </button>
            </div>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 py-8 text-center transition hover:border-amber-300/50">
            <span className="text-4xl">📷</span>
            <span className="font-semibold">Lägg till ett foto</span>
            <span className="text-xs text-white/50">Tryck för kamera eller galleri</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onFileChange}
            />
          </label>
        )}
        {error && <p className="text-sm text-red-300">{error}</p>}
      </div>

      {loading ? (
        <p className="text-center text-white/50">Laddar foton…</p>
      ) : photos.length === 0 ? (
        <p className="text-center text-white/50">Inga foton än — bli den första! 🎊</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <div key={photo.id} className="card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.image_data}
                alt={photo.caption || "Fest-foto"}
                className="aspect-square w-full object-cover"
              />
              <div className="space-y-0.5 p-2">
                <p className="truncate text-xs font-semibold">
                  {photo.avatar_emoji} {photo.display_name}
                </p>
                {photo.caption && (
                  <p className="line-clamp-2 text-xs text-white/70">{photo.caption}</p>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-white/40">{timeAgo(photo.created_at)}</p>
                  {(user?.username === photo.username || user?.isAdmin) && (
                    <button
                      onClick={() => remove(photo.id)}
                      className="text-[10px] text-red-300/80 hover:text-red-300"
                    >
                      Ta bort
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PhotosPage() {
  return (
    <AuthGate>
      <PhotosContent />
    </AuthGate>
  );
}
