"use client";

import { useRef, useState, useCallback } from "react";
import { UploadCloud, X, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  /** URL actual de la imagen (controlado externamente) */
  value: string;
  /** Se llama con la nueva URL una vez subida, o con "" si se elimina */
  onChange: (url: string) => void;
  /** Carpeta destino en el bucket R2 (default: "gestion") */
  folder?: string;
  /** Texto descriptivo bajo el ícono */
  hint?: string;
  className?: string;
}

export default function ImageUpload({
  value,
  onChange,
  folder = "gestion",
  hint = "PNG, JPG, WebP · máx. 8 MB",
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", folder);
        if (value) fd.append("old_url", value);

        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Error al subir");
        onChange(json.url as string);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al subir la imagen");
      } finally {
        setUploading(false);
      }
    },
    [folder, value, onChange]
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  }

  function handleRemove() {
    onChange("");
    setError(null);
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Preview */}
      {value ? (
        <div className="relative w-full rounded-xl overflow-hidden group" style={{ background: "var(--bg-primary)" }}>
          <img
            src={value}
            alt="Preview"
            className="w-full max-h-48 object-cover block"
          />
          {/* Overlay con botón eliminar */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.55)" }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
              Cambiar
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: "rgba(239,68,68,0.8)", color: "#fff" }}
            >
              <X size={13} />
              Eliminar
            </button>
          </div>
        </div>
      ) : (
        /* Drop zone */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          disabled={uploading}
          className={cn(
            "w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 px-4 transition-all cursor-pointer",
            dragOver ? "border-[var(--accent)] bg-[var(--accent-muted)]" : "border-[var(--border)] hover:border-[var(--accent)]"
          )}
        >
          {uploading ? (
            <Loader2 size={28} className="animate-spin" style={{ color: "var(--accent)" }} />
          ) : (
            <UploadCloud size={28} style={{ color: dragOver ? "var(--accent)" : "var(--text-muted)" }} />
          )}
          <span className="text-sm font-medium" style={{ color: uploading ? "var(--accent)" : "var(--text-secondary)" }}>
            {uploading ? "Subiendo imagen…" : dragOver ? "Suelta aquí" : "Haz clic o arrastra una imagen"}
          </span>
          {!uploading && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{hint}</span>
          )}
        </button>
      )}

      {/* Input oculto */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* URL de respaldo (muestra la URL si ya existe) */}
      {value && (
        <input
          type="text"
          readOnly
          value={value}
          className="input-field text-xs font-mono"
          style={{ color: "var(--text-muted)", cursor: "default" }}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          title="URL de la imagen en R2"
        />
      )}

      {/* Error */}
      {error && (
        <p className="text-xs px-2 py-1.5 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
