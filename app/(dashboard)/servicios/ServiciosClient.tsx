"use client";

import { useState } from "react";
import { Service } from "@/types";
import { formatCLP } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import ImageUpload from "@/components/ui/ImageUpload";
import {
  Briefcase,
  Plus,
  Pencil,
  X,
  Loader2,
  Eye,
  EyeOff,
  Star,
  Image,
  CalendarDays,
} from "lucide-react";

interface ServiciosClientProps {
  initialServices: Service[];
}

const EMPTY_FORM = {
  title: "",
  description: "",
  price_clp: 0,
  active: true,
  destacado: false,
  agendable: false,
  sort_order: 0,
  image_url: "",
};

export default function ServiciosClient({ initialServices }: ServiciosClientProps) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openNew() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, sort_order: services.length });
    setError(null);
    setShowForm(true);
  }

  function openEdit(svc: Service) {
    setEditingId(svc.id);
    setForm({
      title: svc.title,
      description: svc.description || "",
      price_clp: svc.price_clp,
      active: svc.active,
      destacado: svc.destacado ?? false,
      agendable: svc.agendable ?? false,
      sort_order: svc.sort_order,
      image_url: svc.image_url || "",
    });
    setError(null);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError("El título es obligatorio");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      price_clp: form.price_clp,
      active: form.active,
      destacado: form.destacado,
      agendable: form.agendable,
      sort_order: form.sort_order,
      image_url: form.image_url.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { data, error: err } = await supabase
        .from("services")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single();
      if (err) { setError(err.message); setLoading(false); return; }
      setServices(services.map((s) => (s.id === editingId ? data : s)));
    } else {
      const { data, error: err } = await supabase
        .from("services")
        .insert(payload)
        .select()
        .single();
      if (err) { setError(err.message); setLoading(false); return; }
      setServices([...services, data]);
    }

    setShowForm(false);
    setLoading(false);
  }

  async function toggleActive(svc: Service) {
    const supabase = createClient();
    const { data } = await supabase
      .from("services")
      .update({ active: !svc.active, updated_at: new Date().toISOString() })
      .eq("id", svc.id)
      .select()
      .single();
    if (data) setServices(services.map((s) => (s.id === svc.id ? data : s)));
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este servicio?")) return;
    const supabase = createClient();
    await supabase.from("services").delete().eq("id", id);
    setServices(services.filter((s) => s.id !== id));
    setShowForm(false);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Briefcase size={22} style={{ color: "var(--accent)" }} />
            Servicios
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {services.filter((s) => s.active).length} activos · {services.length} total
          </p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus size={16} />
          Nuevo servicio
        </button>
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {services.map((svc) => (
          <div
            key={svc.id}
            className="card"
            style={{ opacity: svc.active ? 1 : 0.6 }}
          >
            {/* Image */}
            <div
              className="w-full h-28 rounded-lg mb-3 flex items-center justify-center overflow-hidden"
              style={{ background: "var(--bg-primary)" }}
            >
              {svc.image_url ? (
                <img src={svc.image_url} alt={svc.title} className="w-full h-full object-cover" />
              ) : (
                <Image size={28} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
              )}
            </div>

            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                    {svc.title}
                  </h3>
                  {svc.destacado && (
                    <Star size={12} style={{ color: "var(--accent)" }} className="shrink-0" />
                  )}
                </div>
                {svc.description && (
                  <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                    {svc.description}
                  </p>
                )}
              </div>
              <span className="font-bold text-sm shrink-0" style={{ color: "var(--accent)" }}>
                {formatCLP(svc.price_clp)}
              </span>
            </div>

            <div
              className="flex items-center justify-between mt-3 pt-3"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <div className="flex gap-1.5 flex-wrap">
                    <span className={`badge ${svc.active ? "badge-green" : "badge-gray"}`}>
                      {svc.active ? "Activo" : "Inactivo"}
                    </span>
                    {svc.agendable && (
                      <span className="badge badge-gold flex items-center gap-1">
                        <CalendarDays size={10} />
                        Agendable
                      </span>
                    )}
                    <span className="badge badge-gray text-xs">#{svc.sort_order}</span>
                  </div>
              <div className="flex gap-1">
                <button
                  onClick={() => toggleActive(svc)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  title={svc.active ? "Desactivar" : "Activar"}
                >
                  {svc.active ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  onClick={() => openEdit(svc)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Pencil size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {services.length === 0 && (
        <div className="card text-center py-12" style={{ color: "var(--text-muted)" }}>
          <Briefcase size={36} className="mx-auto mb-3 opacity-20" />
          <p>No hay servicios. Crea el primero.</p>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {editingId ? "Editar servicio" : "Nuevo servicio"}
              </h3>
              <button onClick={() => setShowForm(false)} style={{ color: "var(--text-muted)" }}>
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Título *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input-field"
                  placeholder="Ej: Sesión fotográfica familiar"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Descripción
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field h-20 resize-none"
                  placeholder="Describe el servicio..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Precio CLP
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.price_clp}
                    onChange={(e) => setForm({ ...form, price_clp: parseInt(e.target.value) || 0 })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Orden de visualización
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Imagen del servicio
                </label>
                <ImageUpload
                  value={form.image_url}
                  onChange={(url) => setForm({ ...form, image_url: url })}
                  folder="servicios"
                />
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="w-4 h-4 accent-[var(--accent)]"
                  />
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Activo en la web</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.destacado}
                    onChange={(e) => setForm({ ...form, destacado: e.target.checked })}
                    className="w-4 h-4 accent-[var(--accent)]"
                  />
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Destacado</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.agendable}
                    onChange={(e) => setForm({ ...form, agendable: e.target.checked })}
                    className="w-4 h-4 accent-[var(--accent)]"
                  />
                  <span className="text-sm flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
                    <CalendarDays size={13} style={{ color: "var(--accent)" }} />
                    Agendable
                  </span>
                </label>
              </div>
              {form.agendable && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "1px solid rgba(232,184,75,0.2)" }}>
                  Este servicio aparecerá como opción en el campo "Tipo" al crear una nueva sesión en la Agenda.
                </p>
              )}

              {error && (
                <div
                  className="text-sm px-3 py-2 rounded-lg"
                  style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  {error}
                </div>
              )}
            </div>

            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={loading} className="btn-primary">
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {editingId ? "Guardar" : "Crear"}
                </button>
                <button onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancelar
                </button>
              </div>
              {editingId && (
                <button
                  onClick={() => handleDelete(editingId)}
                  className="text-sm"
                  style={{ color: "var(--danger)" }}
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
