"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, X, Loader2 } from "lucide-react";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface CrearSubEventoModalProps {
  eventoId: string;
}

export default function CrearSubEventoModal({ eventoId }: CrearSubEventoModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (!saving) {
      setOpen(false);
      setNombre("");
      setError(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("Indica un nombre para el sub-evento.");
      return;
    }

    setError(null);
    setSaving(true);
    const supabase = createClient();
    const slug = slugify(nombre);

    const { error: insErr } = await supabase.from("sub_eventos").insert({
      evento_id: eventoId,
      nombre: nombre.trim(),
      slug: slug || "sub-evento",
    });

    setSaving(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }

    close();
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        style={{
          background: "var(--accent-muted)",
          color: "var(--accent)",
          border: "1px solid rgba(232,184,75,0.35)",
        }}
      >
        <Plus size={14} />
        Crear sub-evento
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)" }} onClick={close} />
          <div
            className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="crear-sub-titulo"
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <h2 id="crear-sub-titulo" className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Nuevo sub-evento
              </h2>
              <button type="button" onClick={close} className="p-1 rounded-lg transition-colors" style={{ color: "var(--text-muted)" }} disabled={saving}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Nombre *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                  placeholder="Ej: Ceremonia, Gala, Curso A"
                  disabled={saving}
                  autoFocus
                />
                {nombre.trim() ? (
                  <p className="text-[11px] mt-1.5 font-mono" style={{ color: "var(--text-muted)" }}>
                    Slug URL: {slugify(nombre) || "…"}
                  </p>
                ) : null}
              </div>

              {error ? (
                <p className="text-sm" style={{ color: "var(--danger)" }}>
                  {error}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={close}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{
                    background: "var(--bg-primary)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold"
                  style={{ background: "var(--accent)", color: "#0D0D14" }}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {saving ? "Creando…" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
