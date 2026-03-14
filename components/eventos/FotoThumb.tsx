"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { formatCLP } from "@/lib/utils";

// Inlined en build time — garantizado en el cliente
const R2_BASE = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(/\/$/, "");
const CLOUDINARY_CLOUD = "fotosmony";

interface FotoThumbProps {
  publicId: string;
  storageProvider: string | null;
  nombreArchivo: string | null;
  precio: number;
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

export default function FotoThumb({ publicId, storageProvider, nombreArchivo, precio }: FotoThumbProps) {
  const [error, setError] = useState(false);
  const url = buildUrl(publicId, storageProvider);

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
      <div
        className="absolute bottom-0 left-0 right-0 px-1.5 py-1 text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "rgba(0,0,0,0.7)", color: "var(--accent)" }}
      >
        {formatCLP(precio)}
      </div>
    </div>
  );
}
