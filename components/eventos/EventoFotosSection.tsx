"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import FotoThumb from "@/components/eventos/FotoThumb";
import UploadProgressBar from "@/components/ui/UploadProgressBar";
import { uploadEventoImage, batchBytesPercent } from "@/lib/upload-evento-client";
import { Image, Loader2, UploadCloud } from "lucide-react";

export type EventoFotoRow = {
  id: string;
  public_id: string;
  storage_provider: string | null;
  nombre_archivo: string | null;
  precio: number;
  sub_evento_id: string | null;
};

type SubOpt = { id: string; nombre: string };

function esPortadaDelEvento(
  foto: EventoFotoRow,
  coverPublicId: string | null | undefined,
  coverStorageProvider: string | null | undefined
): boolean {
  if (!coverPublicId || !foto.public_id) return false;
  if (foto.public_id !== coverPublicId) return false;
  const fp = foto.storage_provider ?? null;
  const cp = coverStorageProvider ?? null;
  return fp === cp;
}

interface EventoFotosSectionProps {
  eventoId: string;
  subEventos: SubOpt[];
  fotos: EventoFotoRow[];
  totalFotos: number;
  selectedSub: string;
  page: number;
  totalPages: number;
  coverPublicId: string | null;
  coverStorageProvider: string | null;
}

export default function EventoFotosSection({
  eventoId,
  subEventos,
  fotos,
  totalFotos,
  selectedSub,
  page,
  totalPages,
  coverPublicId,
  coverStorageProvider,
}: EventoFotosSectionProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [destino, setDestino] = useState<string>("principal");
  const [precio, setPrecio] = useState(5000);
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; detail: string } | null>(null);
  const uploading = uploadProgress !== null;
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [coverFotoId, setCoverFotoId] = useState<string | null>(null);
  const [clearingCover, setClearingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subNombrePorId = Object.fromEntries(subEventos.map((s) => [s.id, s.nombre]));

  function labelUbicacion(f: EventoFotoRow): string {
    if (!f.sub_evento_id) return "Principal";
    return subNombrePorId[f.sub_evento_id] ?? "Sub-evento";
  }

  async function handleDelete(fotoId: string) {
    if (!confirm("¿Eliminar esta foto de la galería? Esta acción no se puede deshacer.")) return;

    const foto = fotos.find((f) => f.id === fotoId);
    const eraPortada = foto ? esPortadaDelEvento(foto, coverPublicId, coverStorageProvider) : false;

    setError(null);
    setDeletingId(fotoId);
    const supabase = createClient();

    const { count, error: countErr } = await supabase
      .from("order_items")
      .select("*", { count: "exact", head: true })
      .eq("foto_id", fotoId);

    if (countErr) {
      setError(countErr.message);
      setDeletingId(null);
      return;
    }
    if (count && count > 0) {
      setError("No se puede eliminar: la foto ya figura en un pedido vendido.");
      setDeletingId(null);
      return;
    }

    const { error: delErr } = await supabase.from("fotos").delete().eq("id", fotoId);
    if (delErr) {
      setDeletingId(null);
      setError(delErr.message);
      return;
    }

    if (eraPortada) {
      const { error: covErr } = await supabase
        .from("eventos")
        .update({ cover_public_id: null, cover_storage_provider: null })
        .eq("id", eventoId);
      if (covErr) {
        setDeletingId(null);
        setError(covErr.message);
        return;
      }
    }

    setDeletingId(null);
    router.refresh();
  }

  async function handleSetCover(foto: EventoFotoRow) {
    setError(null);
    setCoverFotoId(foto.id);
    const supabase = createClient();
    const { error: updErr } = await supabase
      .from("eventos")
      .update({
        cover_public_id: foto.public_id,
        cover_storage_provider: foto.storage_provider,
      })
      .eq("id", eventoId);
    setCoverFotoId(null);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    router.refresh();
  }

  async function handleClearCover() {
    if (!confirm("¿Quitar la imagen de portada del evento?")) return;
    setError(null);
    setClearingCover(true);
    const supabase = createClient();
    const { error: updErr } = await supabase
      .from("eventos")
      .update({ cover_public_id: null, cover_storage_provider: null })
      .eq("id", eventoId);
    setClearingCover(false);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    router.refresh();
  }

  async function onFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    setError(null);
    const supabase = createClient();
    const precioClamped = Math.max(0, Math.floor(Number(precio)) || 0);
    const sub_evento_id = destino === "principal" ? null : destino;

    const fileArr = Array.from(files);
    const totalBytes = fileArr.reduce((s, f) => s + f.size, 0);
    let completedBefore = 0;
    setUploadProgress({ percent: 0, detail: `Preparando ${fileArr.length} imagen(es)…` });

    const rows: {
      public_id: string;
      storage_provider: string;
      precio: number;
      nombre_archivo: string | null;
      evento_id: string;
      sub_evento_id: string | null;
    }[] = [];

    try {
      for (let i = 0; i < fileArr.length; i++) {
        const file = fileArr[i];
        const up = await uploadEventoImage(file, (loaded) => {
          const pct = batchBytesPercent(completedBefore, loaded, totalBytes);
          setUploadProgress({
            percent: pct,
            detail: `Imagen ${i + 1} de ${fileArr.length}: ${file.name}`,
          });
        });
        rows.push({
          public_id: up.key,
          storage_provider: "cloudflare",
          precio: precioClamped,
          nombre_archivo: up.nombreArchivo,
          evento_id: eventoId,
          sub_evento_id,
        });
        completedBefore += file.size;
      }

      setUploadProgress({ percent: 100, detail: "Guardando en la galería…" });

      const { error: insErr } = await supabase.from("fotos").insert(rows);
      if (insErr) {
        setError(insErr.message);
        return;
      }
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploadProgress(null);
    }
  }

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
          Fotos ({totalFotos})
        </h2>
        {totalPages > 1 && (
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            Página {page} de {totalPages}
          </div>
        )}
      </div>

      {coverPublicId ? (
        <div
          className="flex flex-wrap items-center gap-2 text-xs mb-3 px-3 py-2 rounded-lg"
          style={{ background: "var(--accent-muted)", border: "1px solid rgba(232,184,75,0.25)", color: "var(--text-secondary)" }}
        >
          <span>Portada del evento definida.</span>
          <button
            type="button"
            disabled={clearingCover || uploading || coverFotoId !== null}
            onClick={handleClearCover}
            className="underline font-medium disabled:opacity-50"
            style={{ color: "var(--accent)" }}
          >
            {clearingCover ? "Quitando…" : "Quitar portada"}
          </button>
        </div>
      ) : (
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          Elige una foto con la estrella en la galería para usarla como portada en el listado y en la web.
        </p>
      )}

      <div
        className="rounded-xl p-4 mb-4 space-y-3"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          Subir fotos nuevas
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
              Pertenece a
            </label>
            <select
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              disabled={uploading}
              className="input-field w-full text-sm"
            >
              <option value="principal">Evento principal (galería general)</option>
              {subEventos.map((s) => (
                <option key={s.id} value={s.id}>
                  Sub-evento: {s.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-36">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
              Precio (CLP)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={precio}
              onChange={(e) => setPrecio(parseInt(e.target.value, 10) || 0)}
              disabled={uploading}
              className="input-field w-full text-sm"
            />
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={onFilesChange}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="btn-primary inline-flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              {uploading ? "Subiendo…" : "Elegir archivos"}
            </button>
          </div>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Puedes elegir varias imágenes a la vez. Se suben a la galería indicada arriba.
        </p>
        {uploadProgress ? (
          <UploadProgressBar percent={uploadProgress.percent} detail={uploadProgress.detail} />
        ) : null}
        {error ? (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>
            {error}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {fotos.map((foto) => (
          <FotoThumb
            key={foto.id}
            publicId={foto.public_id}
            storageProvider={foto.storage_provider}
            nombreArchivo={foto.nombre_archivo}
            precio={foto.precio}
            ubicacionLabel={labelUbicacion(foto)}
            isCover={esPortadaDelEvento(foto, coverPublicId, coverStorageProvider)}
            onSetAsCover={() => handleSetCover(foto)}
            settingCover={coverFotoId === foto.id}
            onDelete={() => handleDelete(foto.id)}
            deleting={deletingId === foto.id}
          />
        ))}
      </div>

      {!fotos.length && (
        <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>
          <Image size={32} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm">No hay fotos en esta vista</p>
        </div>
      )}

      {totalPages > 1 && (
        <div
          className="flex items-center justify-center gap-2 mt-4 pt-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {page > 1 && (
            <Link
              href={`/eventos/${eventoId}?sub=${selectedSub}&page=${page - 1}`}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              ← Anterior
            </Link>
          )}
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/eventos/${eventoId}?sub=${selectedSub}&page=${page + 1}`}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Siguiente →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
