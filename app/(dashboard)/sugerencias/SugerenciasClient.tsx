"use client";

import { useState } from "react";
import { Sugerencia } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  Lightbulb,
  Plus,
  X,
  ChevronDown,
  Clock,
  Eye,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

// ─── Config de categorías y estados ──────────────────────────────────────────

const CATEGORIAS = [
  { value: "general", label: "General" },
  { value: "interfaz", label: "Interfaz" },
  { value: "funcionalidad", label: "Funcionalidad" },
  { value: "rendimiento", label: "Rendimiento" },
  { value: "correccion", label: "Corrección de error" },
  { value: "otro", label: "Otro" },
] as const;

const PRIORIDADES = [
  { value: "baja", label: "Baja", color: "var(--text-muted)" },
  { value: "media", label: "Media", color: "#F59E0B" },
  { value: "alta", label: "Alta", color: "#EF4444" },
] as const;

const ESTADOS = [
  { value: "pendiente", label: "Pendiente", icon: Clock, color: "var(--text-muted)" },
  { value: "en_revision", label: "En revisión", icon: Eye, color: "#3B82F6" },
  { value: "planificado", label: "Planificado", icon: Calendar, color: "#8B5CF6" },
  { value: "implementado", label: "Implementado", icon: CheckCircle2, color: "#10B981" },
  { value: "descartado", label: "Descartado", icon: XCircle, color: "#EF4444" },
] as const;

type EstadoValue = Sugerencia["estado"];
type CategoriaValue = Sugerencia["categoria"];
type PrioridadValue = Sugerencia["prioridad"];

function getEstado(value: EstadoValue) {
  return ESTADOS.find((e) => e.value === value)!;
}

function getPrioridad(value: PrioridadValue) {
  return PRIORIDADES.find((p) => p.value === value)!;
}

function getCategoria(value: CategoriaValue) {
  return CATEGORIAS.find((c) => c.value === value)!;
}

// ─── Modal para nueva sugerencia ──────────────────────────────────────────────

interface NuevaSugerenciaModalProps {
  onClose: () => void;
  onCreated: (s: Sugerencia) => void;
}

function NuevaSugerenciaModal({ onClose, onCreated }: NuevaSugerenciaModalProps) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState<CategoriaValue>("general");
  const [prioridad, setPrioridad] = useState<PrioridadValue>("media");
  const [autorNombre, setAutorNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !descripcion.trim()) {
      setError("El título y la descripción son obligatorios.");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("sugerencias")
      .insert({
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        categoria,
        prioridad,
        autor_nombre: autorNombre.trim() || null,
      })
      .select()
      .single();

    if (err || !data) {
      setError("Error al guardar la sugerencia. Intenta de nuevo.");
      setLoading(false);
      return;
    }
    onCreated(data as Sugerencia);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2 className="font-bold text-base flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Lightbulb size={18} style={{ color: "var(--accent)" }} />
            Nueva Sugerencia
          </h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Título *
            </label>
            <input
              className="input-field w-full"
              placeholder="Ej: Agregar exportación a PDF en ventas"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={120}
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Descripción *
            </label>
            <textarea
              className="input-field w-full resize-none"
              rows={4}
              placeholder="Describe la mejora con el mayor detalle posible: ¿qué problema resuelve? ¿cómo debería funcionar?"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          {/* Categoría + Prioridad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Categoría
              </label>
              <div className="relative">
                <select
                  className="input-field w-full appearance-none pr-8"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as CategoriaValue)}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Prioridad
              </label>
              <div className="relative">
                <select
                  className="input-field w-full appearance-none pr-8"
                  value={prioridad}
                  onChange={(e) => setPrioridad(e.target.value as PrioridadValue)}
                >
                  {PRIORIDADES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
              </div>
            </div>
          </div>

          {/* Autor */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Tu nombre <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(opcional)</span>
            </label>
            <input
              className="input-field w-full"
              placeholder="Ej: Mónica"
              value={autorNombre}
              onChange={(e) => setAutorNombre(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm flex items-center gap-1.5" style={{ color: "#EF4444" }}>
              <AlertCircle size={14} />
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Lightbulb size={15} />}
              Enviar sugerencia
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface SugerenciasClientProps {
  initialSugerencias: Sugerencia[];
}

export default function SugerenciasClient({ initialSugerencias }: SugerenciasClientProps) {
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>(initialSugerencias);
  const [selected, setSelected] = useState<Sugerencia | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterEstado, setFilterEstado] = useState<EstadoValue | "todas">("todas");
  const [filterCategoria, setFilterCategoria] = useState<CategoriaValue | "todas">("todas");

  // Estado de edición del panel de desarrollador
  const [editingEstado, setEditingEstado] = useState<EstadoValue | null>(null);
  const [editingNotas, setEditingNotas] = useState<string>("");
  const [savingDev, setSavingDev] = useState(false);

  const filtered = sugerencias.filter((s) => {
    if (filterEstado !== "todas" && s.estado !== filterEstado) return false;
    if (filterCategoria !== "todas" && s.categoria !== filterCategoria) return false;
    return true;
  });

  const pendienteCount = sugerencias.filter((s) => s.estado === "pendiente").length;

  function openSugerencia(s: Sugerencia) {
    setSelected(s);
    setEditingEstado(s.estado);
    setEditingNotas(s.notas_desarrollador ?? "");
  }

  function handleCreated(s: Sugerencia) {
    setSugerencias([s, ...sugerencias]);
  }

  async function handleSaveDeveloper() {
    if (!selected || !editingEstado) return;
    setSavingDev(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sugerencias")
      .update({
        estado: editingEstado,
        notas_desarrollador: editingNotas.trim() || null,
      })
      .eq("id", selected.id)
      .select()
      .single();

    if (!error && data) {
      const updated = data as Sugerencia;
      setSugerencias(sugerencias.map((s) => (s.id === updated.id ? updated : s)));
      setSelected(updated);
    }
    setSavingDev(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta sugerencia? Esta acción no se puede deshacer.")) return;
    const supabase = createClient();
    await supabase.from("sugerencias").delete().eq("id", id);
    setSugerencias(sugerencias.filter((s) => s.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  const devDirty =
    selected &&
    (editingEstado !== selected.estado || editingNotas !== (selected.notas_desarrollador ?? ""));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1
            className="text-xl font-bold flex items-center gap-2"
            style={{ color: "var(--text-primary)" }}
          >
            <Lightbulb size={22} style={{ color: "var(--accent)" }} />
            Sugerencias
            {pendienteCount > 0 && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "var(--accent)", color: "#0D0D14" }}
              >
                {pendienteCount} pendiente{pendienteCount !== 1 ? "s" : ""}
              </span>
            )}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {sugerencias.length} sugerencia{sugerencias.length !== 1 ? "s" : ""} en total
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={15} />
          Nueva sugerencia
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Estado */}
        <div className="flex gap-1">
          {([
            { value: "todas", label: "Todos los estados" },
            ...ESTADOS.map((e) => ({ value: e.value, label: e.label })),
          ] as { value: EstadoValue | "todas"; label: string }[]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterEstado(opt.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: filterEstado === opt.value ? "var(--accent-muted)" : "var(--bg-card)",
                color: filterEstado === opt.value ? "var(--accent)" : "var(--text-secondary)",
                border:
                  filterEstado === opt.value
                    ? "1px solid rgba(232,184,75,0.3)"
                    : "1px solid var(--border)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Categoría filter */}
      <div className="flex flex-wrap gap-2">
        {([
          { value: "todas", label: "Todas las categorías" },
          ...CATEGORIAS.map((c) => ({ value: c.value, label: c.label })),
        ] as { value: CategoriaValue | "todas"; label: string }[]).map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterCategoria(opt.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: filterCategoria === opt.value ? "var(--bg-primary)" : "transparent",
              color:
                filterCategoria === opt.value ? "var(--text-primary)" : "var(--text-muted)",
              border:
                filterCategoria === opt.value
                  ? "1px solid var(--border)"
                  : "1px solid transparent",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Lista */}
        <div
          className="lg:col-span-2 rounded-xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {filtered.length === 0 ? (
            <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
              <Lightbulb size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">No hay sugerencias</p>
            </div>
          ) : (
            filtered.map((s) => {
              const estado = getEstado(s.estado);
              const prioridad = getPrioridad(s.prioridad);
              const EstadoIcon = estado.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => openSugerencia(s)}
                  className={cn(
                    "w-full text-left p-4 transition-all",
                    selected?.id === s.id
                      ? "bg-(--accent-muted)"
                      : "hover:bg-(--bg-card-hover)"
                  )}
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "var(--bg-primary)", color: estado.color }}
                    >
                      <EstadoIcon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {s.titulo}
                      </p>
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                        {s.descripcion}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{ background: "var(--bg-primary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                        >
                          {getCategoria(s.categoria).label}
                        </span>
                        <span className="text-[10px] font-semibold" style={{ color: prioridad.color }}>
                          ● {prioridad.label}
                        </span>
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {formatDateTime(s.created_at)}
                        </span>
                      </div>
                      {s.autor_nombre && (
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                          por {s.autor_nombre}
                        </p>
                      )}
                    </div>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                      style={{ color: estado.color, background: "var(--bg-primary)", border: "1px solid var(--border)" }}
                    >
                      {estado.label}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Detalle */}
        {selected ? (
          <div
            className="lg:col-span-3 rounded-xl flex flex-col"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            {/* Header del detalle */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <h2 className="font-semibold text-sm flex-1 min-w-0 mr-3 truncate" style={{ color: "var(--text-primary)" }}>
                {selected.titulo}
              </h2>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="btn-secondary text-xs px-2 py-1"
                  style={{ color: "#EF4444", borderColor: "#EF444430" }}
                >
                  <X size={13} />
                  Eliminar
                </button>
                <button onClick={() => setSelected(null)} style={{ color: "var(--text-muted)" }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5 flex-1 overflow-y-auto">
              {/* Meta info */}
              <div
                className="flex flex-wrap gap-3 p-3 rounded-xl"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
              >
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Categoría</p>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {getCategoria(selected.categoria).label}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Prioridad</p>
                  <p className="text-sm font-medium" style={{ color: getPrioridad(selected.prioridad).color }}>
                    {getPrioridad(selected.prioridad).label}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Enviada</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {formatDateTime(selected.created_at)}
                  </p>
                </div>
                {selected.autor_nombre && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Autor</p>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {selected.autor_nombre}
                    </p>
                  </div>
                )}
              </div>

              {/* Descripción */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                  Descripción
                </p>
                <div
                  className="p-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap"
                  style={{
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {selected.descripcion}
                </div>
              </div>

              {/* Panel desarrollador */}
              <div
                className="rounded-xl p-4 space-y-4"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid rgba(232,184,75,0.2)",
                }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                  style={{ color: "var(--accent)" }}
                >
                  <Lightbulb size={13} />
                  Panel del desarrollador
                </p>

                {/* Cambiar estado */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Estado
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ESTADOS.map((e) => {
                      const Icon = e.icon;
                      const active = editingEstado === e.value;
                      return (
                        <button
                          key={e.value}
                          onClick={() => setEditingEstado(e.value)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={{
                            background: active ? "var(--bg-card)" : "transparent",
                            color: active ? e.color : "var(--text-muted)",
                            border: active ? `1px solid ${e.color}40` : "1px solid var(--border)",
                          }}
                        >
                          <Icon size={13} />
                          {e.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notas del desarrollador */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Notas internas
                  </label>
                  <textarea
                    className="input-field w-full resize-none text-sm"
                    rows={3}
                    placeholder="Agrega notas sobre el análisis, decisiones o avance de esta sugerencia…"
                    value={editingNotas}
                    onChange={(e) => setEditingNotas(e.target.value)}
                  />
                </div>

                {/* Guardar */}
                {devDirty && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveDeveloper}
                      className="btn-primary text-sm"
                      disabled={savingDev}
                    >
                      {savingDev ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Guardar cambios
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="lg:col-span-3 rounded-xl flex items-center justify-center"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              minHeight: 300,
            }}
          >
            <div className="text-center" style={{ color: "var(--text-muted)" }}>
              <Lightbulb size={36} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">Selecciona una sugerencia para ver los detalles</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 btn-primary text-sm"
              >
                <Plus size={14} />
                Agregar sugerencia
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <NuevaSugerenciaModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
