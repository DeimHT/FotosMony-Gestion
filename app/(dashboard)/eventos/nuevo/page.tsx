"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function NuevoEventoPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [subEventos, setSubEventos] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNombreChange(value: string) {
    setNombre(value);
    setSlug(slugify(value));
  }

  function addSubEvento() {
    setSubEventos([...subEventos, ""]);
  }

  function removeSubEvento(i: number) {
    setSubEventos(subEventos.filter((_, idx) => idx !== i));
  }

  function updateSubEvento(i: number, value: string) {
    const updated = [...subEventos];
    updated[i] = value;
    setSubEventos(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !slug.trim()) return;

    setLoading(true);
    setError(null);
    const supabase = createClient();

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

    // Create sub-eventos
    const validSubs = subEventos.filter((s) => s.trim());
    if (validSubs.length > 0) {
      const { error: subError } = await supabase.from("sub_eventos").insert(
        validSubs.map((nombre) => ({
          evento_id: evento.id,
          nombre: nombre.trim(),
          slug: slugify(nombre),
        }))
      );
      if (subError) {
        setError(subError.message);
        setLoading(false);
        return;
      }
    }

    router.push(`/eventos/${evento.id}`);
  }

  return (
    <div className="max-w-xl space-y-5">
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
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            fotosmony.cl/eventos/{slug || "..."}
          </p>
        </div>

        {/* Sub-eventos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Sub-eventos (opcional)
            </label>
            <button type="button" onClick={addSubEvento} className="text-xs" style={{ color: "var(--accent)" }}>
              + Agregar
            </button>
          </div>
          <div className="space-y-2">
            {subEventos.map((sub, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={sub}
                  onChange={(e) => updateSubEvento(i, e.target.value)}
                  className="input-field"
                  placeholder={`Sub-evento ${i + 1}`}
                />
                {subEventos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSubEvento(i)}
                    className="px-2 text-sm rounded-lg shrink-0"
                    style={{ background: "var(--bg-primary)", color: "var(--danger)", border: "1px solid var(--border)" }}
                  >
                    ✕
                  </button>
                )}
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
          <button type="submit" disabled={loading} className="btn-primary">
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
