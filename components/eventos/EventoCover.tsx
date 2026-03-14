"use client";

import { Camera } from "lucide-react";
import { useState } from "react";

const R2_BASE = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(/\/$/, "");
const CLOUDINARY_CLOUD = "fotosmony";

interface EventoCoverProps {
  publicId: string | null;
  storageProvider?: string | null;
  nombre: string;
}

function buildCoverUrl(publicId: string, storageProvider?: string | null): string {
  // 1. Ya es una URL completa
  if (publicId.startsWith("http://") || publicId.startsWith("https://")) {
    return publicId;
  }
  // 2. storage_provider explícito
  if (storageProvider === "cloudflare" && R2_BASE) {
    return `${R2_BASE}/${publicId}`;
  }
  if (storageProvider === "supabase") {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fotos/${publicId}`;
  }
  // 3. Sin provider: detectar por prefijo de ruta (R2 usa carpetas conocidas)
  if (R2_BASE && /^(eventos|servicios|portfolio|home|carpetas)\//.test(publicId)) {
    return `${R2_BASE}/${publicId}`;
  }
  // 4. Cloudinary legacy
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/f_auto,q_auto,w_400/${publicId}`;
}

export default function EventoCover({ publicId, storageProvider, nombre }: EventoCoverProps) {
  const [imgError, setImgError] = useState(false);

  if (!publicId || imgError) {
    return (
      <Camera
        size={32}
        style={{ color: "var(--text-muted)", opacity: 0.3 }}
      />
    );
  }

  return (
    <img
      src={buildCoverUrl(publicId, storageProvider)}
      alt={nombre}
      className="w-full h-full object-cover"
      onError={() => setImgError(true)}
    />
  );
}
