"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft, Plus, Loader2, UploadCloud, Image as ImageIcon } from "lucide-react";
import UploadProgressBar from "@/components/ui/UploadProgressBar";
import { uploadEventoImage, batchBytesPercent } from "@/lib/upload-evento-client";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type PendingFoto = {
  url: string;
  key: string;
  nombreArchivo: string;
};

type SubEventoForm = {
  nombre: string;
  fotos: PendingFoto[];
};

function FotoChips({
  fotos,
  onRemove,
  disabled,
}: {
  fotos: PendingFoto[];
  onRemove: (i: number) => void;
  disabled?: boolean;
}) {
  if (!fotos.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {fotos.map((f, i) => (
        <div
          key={`${f.key}-${i}`}
          className="relative group w-16 h-16 rounded-lg overflow-hidden shrink-0"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <img src={f.url} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRemove(i)}
            className="absolute top-0.5 right-0.5 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold opacity-90 hover:opacity-100 transition-opacity disabled:opacity-40"
            style={{ background: "rgba(0,0,0,0.65)", color: "#fff" }}
            aria-label="Quitar foto"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export default function NuevoEventoPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [precioDefault, setPrecioDefault] = useState(5000);
  const [subEventos, setSubEventos] = useState<SubEventoForm[]>([{ nombre: "", fotos: [] }]);
  const [fotosPrincipal, setFotosPrincipal] = useState<PendingFoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<"principal" | number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; detail: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputPrincipalRef = useRef<HTMLInputElement>(null);
  const inputSubRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleNombreChange(value: string) {
    setNombre(value);
    setSlug(slugify(value));
  }

  function addSubEvento() {
    setSubEventos([...subEventos, { nombre: "", fotos: [] }]);
  }

  function removeSubEvento(i: number) {
    setSubEventos(subEventos.filter((_, idx) => idx !== i));
  }

  function updateSubNombre(i: number, value: string) {
    const updated = [...subEventos];
    updated[i] = { ...updated[i], nombre: value };
    setSubEventos(updated);
  }

  function removeFotoPrincipal(i: number) {
    setFotosPrincipal((prev) => prev.filter((_, idx) => idx !== i));
  }

  function removeFotoSub(subIndex: number, fotoIndex: number) {
    setSubEventos((prev) => {
      const next = [...prev];
      next[subIndex] = {
        ...next[subIndex],
        fotos: next[subIndex].fotos.filter((_, fi) => fi !== fotoIndex),
      };
      return next;
    });
  }

  async function onFilesSelected(files: FileList | null, target: "principal" | number) {
    if (!files?.length) return;
    setError(null);
    setUploading(target);
    const fileArr = Array.from(files);
    const totalBytes = fileArr.reduce((s, f) => s + f.size, 0);
    let completedBefore = 0;
    setUploadProgress({ percent: 0, detail: `Preparando ${fileArr.length} imagen(es)…` });

    try {
      const uploaded: PendingFoto[] = [];
      for (let i = 0; i < fileArr.length; i++) {
        const file = fileArr[i];
        const item = await uploadEventoImage(file, (loaded) => {
          const pct = batchBytesPercent(completedBefore, loaded, totalBytes);
          setUploadProgress({
            percent: pct,
            detail: `Imagen ${i + 1} de ${fileArr.length}: ${file.name}`,
          });
        });
        uploaded.push({
          url: item.url,
          key: item.key,
          nombreArchivo: item.nombreArchivo,
        });
        completedBefore += file.size;
      }
      setUploadProgress({ percent: 100, detail: "Subida completa" });
      if (target === "principal") {
        setFotosPrincipal((prev) => [...prev, ...uploaded]);
      } else {
        setSubEventos((prev) => {
          const next = [...prev];
          const row = next[target];
          if (!row) return prev;
          next[target] = { ...row, fotos: [...row.fotos, ...uploaded] };
          return next;
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir imágenes");
    } finally {
      setUploading(null);
      setUploadProgress(null);
      if (target === "principal") inputPrincipalRef.current && (inputPrincipalRef.current.value = "");
      else {
        const el = inputSubRefs.current[target];
        if (el) el.value = "";
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !slug.trim()) return;

    for (let i = 0; i < subEventos.length; i++) {
      const row = subEventos[i];
      if (!row.nombre.trim() && row.fotos.length > 0) {
        setError('Si agregas fotos a un sub-evento, indica también su nombre.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const precio = Math.max(0, Math.floor(Number(precioDefault)) || 0);

    const { data: evento, error: eventError } = await supabase
      .from("eventos")
      .insert({ nombre: nombre.trim(), slug: slug.trim() })
      .select()
      .single();

    if (eventError) {
      setError(eventError.message);
      setLoading(false);
      return;
    }

    const subsConNombre = subEventos.filter((s) => s.nombre.trim());
    let subsCreados: { id: string }[] = [];

    if (subsConNombre.length > 0) {
      const { data: insertedSubs, error: subError } = await supabase
        .from("sub_eventos")
        .insert(
          subsConNombre.map((s) => ({
            evento_id: evento.id,
            nombre: s.nombre.trim(),
            slug: slugify(s.nombre),
          }))
        )
        .select("id");

      if (subError) {
        setError(subError.message);
        setLoading(false);
        return;
      }
      subsCreados = insertedSubs ?? [];
    }

    const filasFotos: {
      public_id: string;
      storage_provider: string;
      precio: number;
      nombre_archivo: string | null;
      evento_id: string;
      sub_evento_id: string | null;
    }[] = [];

    for (const f of fotosPrincipal) {
      filasFotos.push({
        public_id: f.key,
        storage_provider: "cloudflare",
        precio,
        nombre_archivo: f.nombreArchivo,
        evento_id: evento.id,
        sub_evento_id: null,
      });
    }

    subsConNombre.forEach((s, i) => {
      const subId = subsCreados[i]?.id;
      if (!subId) return;
      for (const f of s.fotos) {
        filasFotos.push({
          public_id: f.key,
          storage_provider: "cloudflare",
          precio,
          nombre_archivo: f.nombreArchivo,
          evento_id: evento.id,
          sub_evento_id: subId,
        });
      }
    });

    if (filasFotos.length > 0) {
      const { error: fotosErr } = await supabase.from("fotos").insert(filasFotos);
      if (fotosErr) {
        setError(fotosErr.message);
        setLoading(false);
        return;
      }
    }

    router.push(`/eventos/${evento.id}`);
  }

  const busy = loading || uploading !== null;

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <Link
          href="/eventos"
          className="inline-flex items-center gap-1.5 text-sm mb-3 transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={15} />
          Volver a eventos
        </Link>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Nuevo Evento
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Nombre del evento *
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => handleNombreChange(e.target.value)}
            className="input-field"
            placeholder="Ej: Licenciatura Escuela San Pedro 2025"
            required
            disabled={busy}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Slug (URL)
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="input-field font-mono text-sm"
            placeholder="licenciatura-escuela-san-pedro-2025"
            disabled={busy}
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            fotosmony.cl/eventos/{slug || "..."}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Precio por defecto de las fotos (CLP)
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={precioDefault}
            onChange={(e) => setPrecioDefault(parseInt(e.target.value, 10) || 0)}
            className="input-field max-w-xs"
            disabled={busy}
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Se aplicará a todas las imágenes que subas en este paso. Puedes afinar precios después en el sitio si lo necesitas.
          </p>
        </div>

        {/* Fotos evento principal */}
        <div
          className="rounded-xl p-4 space-y-2"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Fotos del evento principal
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Galería general del evento (no ligada a un sub-evento concreto).
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => inputPrincipalRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0"
              style={{
                background: "var(--bg-card)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              {uploading === "principal" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <UploadCloud size={14} />
              )}
              Subir
            </button>
          </div>
          <input
            ref={inputPrincipalRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => onFilesSelected(e.target.files, "principal")}
          />
          {uploading === "principal" && uploadProgress ? (
            <UploadProgressBar percent={uploadProgress.percent} detail={uploadProgress.detail} className="mt-2" />
          ) : null}
          {!fotosPrincipal.length && (
            <div className="flex items-center gap-2 text-xs py-2" style={{ color: "var(--text-muted)" }}>
              <ImageIcon size={16} className="opacity-40" />
              Opcional — puedes agregarlas luego desde la ficha del evento.
            </div>
          )}
          <FotoChips fotos={fotosPrincipal} onRemove={removeFotoPrincipal} disabled={busy} />
        </div>

        {/* Sub-eventos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Sub-eventos (opcional)
            </label>
            <button
              type="button"
              onClick={addSubEvento}
              className="text-xs"
              style={{ color: "var(--accent)" }}
              disabled={busy}
            >
              + Agregar
            </button>
          </div>
          <div className="space-y-4">
            {subEventos.map((sub, i) => (
              <div
                key={i}
                className="rounded-xl p-4 space-y-3"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sub.nombre}
                    onChange={(e) => updateSubNombre(i, e.target.value)}
                    className="input-field flex-1"
                    placeholder={`Nombre del sub-evento ${i + 1}`}
                    disabled={busy}
                  />
                  {subEventos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSubEvento(i)}
                      className="px-2 text-sm rounded-lg shrink-0"
                      style={{
                        background: "var(--bg-primary)",
                        color: "var(--danger)",
                        border: "1px solid var(--border)",
                      }}
                      disabled={busy}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Fotos solo de este sub-evento
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => inputSubRefs.current[i]?.click()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{
                      background: "var(--bg-card)",
                      color: "var(--accent)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {uploading === i ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <UploadCloud size={13} />
                    )}
                    Subir fotos
                  </button>
                  <input
                    ref={(el) => {
                      inputSubRefs.current[i] = el;
                    }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={(e) => onFilesSelected(e.target.files, i)}
                  />
                </div>
                {uploading === i && uploadProgress ? (
                  <UploadProgressBar percent={uploadProgress.percent} detail={uploadProgress.detail} />
                ) : null}
                <FotoChips fotos={sub.fotos} onRemove={(fi) => removeFotoSub(i, fi)} disabled={busy} />
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div
            className="text-sm px-3 py-2 rounded-lg"
            style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={busy} className="btn-primary">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Crear evento
          </button>
          <Link href="/eventos" className="btn-secondary">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
