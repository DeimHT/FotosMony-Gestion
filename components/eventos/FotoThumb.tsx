"use client";

import { useState } from "react";
import { Image as ImageIcon, Trash2, Loader2, Star } from "lucide-react";
import { formatCLP } from "@/lib/utils";

// Inlined en build time — garantizado en el cliente
const R2_BASE = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(/\/$/, "");
const CLOUDINARY_CLOUD = "fotosmony";

interface FotoThumbProps {
  publicId: string;
  storageProvider: string | null;
  nombreArchivo: string | null;
  precio: number;
  /** Etiqueta tipo "Evento principal" / nombre del sub-evento */
  ubicacionLabel?: string | null;
  /** Acciones de backoffice: eliminar */
  onDelete?: () => void;
  deleting?: boolean;
  /** Esta miniatura es la portada del evento */
  isCover?: boolean;
  /** Marcar como portada (solo si no es portada ya) */
  onSetAsCover?: () => void;
  settingCover?: boolean;
}

function buildUrl(publicId: string, storageProvider: string | null): string {
  if (storageProvider === "cloudflare" && R2_BASE) {
    return `${R2_BASE}/${publicId}`;
  }
  if (storageProvider === "supabase") {
    // Supabase Storage — el public_id ya es la ruta en el bucket "fotos"
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fotos/${publicId}`;
  }
  // Cloudinary (legacy o sin provider)
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/f_auto,q_auto,w_200/${publicId}`;
}

export default function FotoThumb({
  publicId,
  storageProvider,
  nombreArchivo,
  precio,
  ubicacionLabel,
  onDelete,
  deleting,
  isCover,
  onSetAsCover,
  settingCover,
}: FotoThumbProps) {
  const [error, setError] = useState(false);
  const url = buildUrl(publicId, storageProvider);
  const showManage = Boolean(onDelete || (onSetAsCover && !isCover));

  return (
    <div
      className="aspect-square rounded-lg overflow-hidden relative group"
      style={{ background: "var(--bg-primary)" }}
    >
      {!error ? (
        <img
          src={url}
          alt={nombreArchivo || publicId}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon size={20} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
        </div>
      )}
      {ubicacionLabel || isCover ? (
        <div
          className="absolute top-0 left-0 right-0 px-1 py-0.5 flex items-center gap-1 text-[9px] font-medium"
          style={{ background: "rgba(0,0,0,0.75)", color: "var(--accent)" }}
        >
          <span className="truncate flex-1 min-w-0" title={ubicacionLabel ?? undefined}>
            {ubicacionLabel ?? "\u00A0"}
          </span>
          {isCover ? (
            <span className="shrink-0 inline-flex items-center gap-0.5 font-bold" title="Portada del evento">
              <Star size={10} fill="currentColor" />
              Portada
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        className="absolute bottom-0 left-0 right-0 px-1.5 py-1 text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "rgba(0,0,0,0.7)", color: "var(--accent)" }}
      >
        {formatCLP(precio)}
      </div>
      {showManage ? (
        <div
          className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto"
          style={{ background: "rgba(0,0,0,0.45)" }}
        >
          {onSetAsCover && !isCover ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSetAsCover();
              }}
              disabled={Boolean(settingCover || deleting)}
              className="pointer-events-auto p-2 rounded-lg transition-colors disabled:opacity-50"
              style={{ background: "rgba(232,184,75,0.95)", color: "#0D0D14" }}
              title="Usar como portada del evento"
            >
              {settingCover ? <Loader2 size={16} className="animate-spin" /> : <Star size={16} />}
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
              disabled={Boolean(deleting || settingCover)}
              className="pointer-events-auto p-2 rounded-lg transition-colors disabled:opacity-50"
              style={{ background: "rgba(239,68,68,0.9)", color: "#fff" }}
              title="Eliminar foto"
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
