"use client";

import { useState, useEffect } from "react";
import { Pencil, X, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface SubEvento {
  id: string;
  nombre: string;
}

interface EventoEditModalProps {
  eventoId: string;
  eventoNombre: string;
  subEventos: SubEvento[];
}

export default function EventoEditModal({
  eventoId,
  eventoNombre,
  subEventos: initialSubs,
}: EventoEditModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState(eventoNombre);
  const [subs, setSubs] = useState<SubEvento[]>(initialSubs);

  // Re-sync when props change (router.refresh reloads server component)
  useEffect(() => {
    setNombre(eventoNombre);
    setSubs(initialSubs);
  }, [eventoNombre, initialSubs]);

  function updateSubNombre(id: string, value: string) {
    setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, nombre: value } : s)));
  }

  async function handleSave() {
    setError(null);
    if (!nombre.trim()) {
      setError("El nombre del evento no puede estar vacío.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    // Update event name
    const { error: evErr } = await supabase
      .from("eventos")
      .update({ nombre: nombre.trim() })
      .eq("id", eventoId);

    if (evErr) {
      setError("Error al guardar el nombre del evento.");
      setSaving(false);
      return;
    }

    // Update each sub-evento name
    for (const sub of subs) {
      if (!sub.nombre.trim()) continue;
      const { error: subErr } = await supabase
        .from("sub_eventos")
        .update({ nombre: sub.nombre.trim() })
        .eq("id", sub.id);

      if (subErr) {
        setError(`Error al guardar el sub-evento "${sub.nombre}".`);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        style={{
          background: "var(--bg-card)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border)",
        }}
      >
        <Pencil size={14} />
        Editar evento
      </button>

      {/* Modal backdrop + dialog */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => !saving && setOpen(false)}
          />

          {/* Dialog */}
          <div
            className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Editar evento
              </h2>
              <button
                onClick={() => !saving && setOpen(false)}
                className="p-1 rounded-lg transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Nombre del evento */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Nombre del evento
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
                  disabled={saving}
                />
              </div>

              {/* Sub-eventos */}
              {subs.length > 0 && (
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                    Sub-eventos ({subs.length})
                  </label>
                  <div className="space-y-2">
                    {subs.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={sub.nombre}
                          onChange={(e) => updateSubNombre(sub.id, e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                          style={{
                            background: "var(--bg-primary)",
                            border: "1px solid var(--border)",
                            color: "var(--text-primary)",
                          }}
                          disabled={saving}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm" style={{ color: "var(--danger)" }}>
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-end gap-2 px-5 py-4"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <button
                onClick={() => setOpen(false)}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: "var(--bg-primary)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                style={{ background: "var(--accent)", color: "#0D0D14" }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
