"use client";

import { useState } from "react";
import { AgendaItem } from "@/types";
import { formatDateTime } from "@/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Loader2,
  Clock,
  User,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TIPOS_BASE = [
  { value: "sesion", label: "Sesión fotográfica" },
  { value: "evento", label: "Evento" },
  { value: "licenciatura", label: "Licenciatura / Ceremonia" },
  { value: "otro", label: "Otro" },
];

const ESTADOS = [
  { value: "pendiente", label: "Pendiente", cls: "badge-yellow" },
  { value: "confirmado", label: "Confirmado", cls: "badge-green" },
  { value: "cancelado", label: "Cancelado", cls: "badge-red" },
  { value: "completado", label: "Completado", cls: "badge-blue" },
];

const TIPO_COLORS_BASE: Record<string, string> = {
  sesion: "#E8B84B",
  evento: "#3B82F6",
  licenciatura: "#A855F7",
  otro: "#6B7280",
};

// Color palette para servicios agendables extras
const SERVICIO_COLORS = [
  "#22C55E", "#EC4899", "#F97316", "#06B6D4",
  "#8B5CF6", "#EF4444", "#14B8A6", "#F59E0B",
];

interface ServicioAgendable {
  id: string;
  title: string;
}

interface AgendaClientProps {
  initialItems: AgendaItem[];
  serviciosAgendables: ServicioAgendable[];
}

export default function AgendaClient({ initialItems, serviciosAgendables }: AgendaClientProps) {
  // Combinar tipos base con servicios agendables
  const TIPOS = [
    ...TIPOS_BASE,
    ...serviciosAgendables.map((s) => ({ value: s.title, label: s.title })),
  ];

  const TIPO_COLORS: Record<string, string> = {
    ...TIPO_COLORS_BASE,
    ...Object.fromEntries(
      serviciosAgendables.map((s, i) => [
        s.title,
        SERVICIO_COLORS[i % SERVICIO_COLORS.length],
      ])
    ),
  };

  const [items, setItems] = useState<AgendaItem[]>(initialItems);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("sesion");
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [notas, setNotas] = useState("");
  const [estado, setEstado] = useState("pendiente");

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getItemsForDay = (day: Date) =>
    items.filter((item) => isSameDay(new Date(item.fecha_inicio), day));

  function openNewForm(date?: Date) {
    setEditingItem(null);
    setTitulo("");
    setTipo("sesion");
    setClienteNombre("");
    setClienteEmail("");
    setFechaInicio(date ? format(date, "yyyy-MM-dd'T'09:00") : "");
    setFechaFin(date ? format(date, "yyyy-MM-dd'T'10:00") : "");
    setUbicacion("");
    setNotas("");
    setEstado("pendiente");
    setError(null);
    setShowForm(true);
  }

  function openEditForm(item: AgendaItem) {
    setEditingItem(item);
    setTitulo(item.titulo);
    setTipo(item.tipo);
    setClienteNombre(item.cliente_nombre || "");
    setClienteEmail(item.cliente_email || "");
    setFechaInicio(item.fecha_inicio.slice(0, 16));
    setFechaFin(item.fecha_fin?.slice(0, 16) || "");
    setUbicacion(item.ubicacion || "");
    setNotas(item.notas || "");
    setEstado(item.estado);
    setError(null);
    setShowForm(true);
  }

  async function handleSave() {
    if (!titulo.trim() || !fechaInicio) {
      setError("Título y fecha de inicio son obligatorios");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      titulo: titulo.trim(),
      tipo,
      cliente_nombre: clienteNombre.trim() || null,
      cliente_email: clienteEmail.trim() || null,
      fecha_inicio: new Date(fechaInicio).toISOString(),
      fecha_fin: fechaFin ? new Date(fechaFin).toISOString() : null,
      ubicacion: ubicacion.trim() || null,
      notas: notas.trim() || null,
      estado,
    };

    if (editingItem) {
      const { data, error: err } = await supabase
        .from("agenda")
        .update(payload)
        .eq("id", editingItem.id)
        .select()
        .single();
      if (err) { setError(err.message); setLoading(false); return; }
      setItems(items.map((i) => (i.id === editingItem.id ? data : i)));
    } else {
      const { data, error: err } = await supabase
        .from("agenda")
        .insert(payload)
        .select()
        .single();
      if (err) { setError(err.message); setLoading(false); return; }
      setItems([...items, data]);
    }

    setShowForm(false);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este evento de la agenda?")) return;
    const supabase = createClient();
    await supabase.from("agenda").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
    setShowForm(false);
  }

  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  // Upcoming items
  const upcoming = items
    .filter((i) => new Date(i.fecha_inicio) >= new Date() && i.estado !== "cancelado")
    .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <CalendarDays size={22} style={{ color: "var(--accent)" }} />
          Agenda
        </h1>
        <button onClick={() => openNewForm()} className="btn-primary">
          <Plus size={16} />
          Nueva sesión
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Calendar */}
        <div className="card xl:col-span-2">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-secondary)", background: "var(--bg-primary)" }}
            >
              <ChevronLeft size={16} />
            </button>
            <h2 className="font-semibold capitalize" style={{ color: "var(--text-primary)" }}>
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-secondary)", background: "var(--bg-primary)" }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 mb-1">
            {dayNames.map((d) => (
              <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: "var(--text-muted)" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day) => {
              const dayItems = getItemsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const today = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    setSelectedDate(day);
                    if (dayItems.length === 0) openNewForm(day);
                  }}
                  className={cn(
                    "min-h-[64px] p-1 rounded-lg text-left transition-all",
                    isSelected ? "ring-1 ring-[var(--accent)]" : ""
                  )}
                  style={{
                    background: isSelected
                      ? "var(--accent-muted)"
                      : today
                        ? "rgba(232,184,75,0.05)"
                        : "transparent",
                    opacity: isCurrentMonth ? 1 : 0.3,
                  }}
                >
                  <span
                    className={cn(
                      "inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-medium mb-1",
                      today ? "text-[#0D0D14] font-bold" : "text-[var(--text-secondary)]"
                    )}
                    style={today ? { background: "var(--accent)" } : {}}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="space-y-0.5">
                    {dayItems.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        className="text-[9px] font-medium px-1 py-0.5 rounded truncate cursor-pointer"
                        style={{
                          background: `${TIPO_COLORS[item.tipo]}25`,
                          color: TIPO_COLORS[item.tipo],
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditForm(item);
                        }}
                      >
                        {item.titulo}
                      </div>
                    ))}
                    {dayItems.length > 2 && (
                      <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                        +{dayItems.length - 2} más
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Upcoming */}
        <div className="card">
          <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Próximos eventos
          </h2>
          <div className="space-y-2">
            {upcoming.map((item) => {
              const estadoInfo = ESTADOS.find((e) => e.value === item.estado);
              return (
                <button
                  key={item.id}
                  onClick={() => openEditForm(item)}
                  className="w-full text-left p-3 rounded-xl transition-all hover:border-[var(--accent)]"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div
                        className="w-2 h-2 rounded-full inline-block mr-1.5 mb-0.5"
                        style={{ background: TIPO_COLORS[item.tipo] }}
                      />
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {item.titulo}
                      </span>
                    </div>
                    {estadoInfo && (
                      <span className={`badge ${estadoInfo.cls} text-[10px] shrink-0`}>
                        {estadoInfo.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock size={11} style={{ color: "var(--text-muted)" }} />
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {formatDateTime(item.fecha_inicio)}
                    </span>
                  </div>
                  {item.cliente_nombre && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <User size={11} style={{ color: "var(--text-muted)" }} />
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {item.cliente_nombre}
                      </span>
                    </div>
                  )}
                  {item.ubicacion && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin size={11} style={{ color: "var(--text-muted)" }} />
                      <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                        {item.ubicacion}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
            {upcoming.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
                No hay eventos próximos
              </p>
            )}
          </div>
        </div>
      </div>

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
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {editingItem ? "Editar evento" : "Nuevo evento"}
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
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="input-field"
                  placeholder="Ej: Sesión familiar Martínez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Tipo
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="input-field"
                >
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Inicio *
                  </label>
                  <input
                    type="datetime-local"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Fin
                  </label>
                  <input
                    type="datetime-local"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Ubicación / Lugar
                </label>
                <input
                  type="text"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  className="input-field"
                  placeholder="Ej: Estudio, Parque O'Higgins, Casa cliente..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Cliente
                  </label>
                  <input
                    type="text"
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    className="input-field"
                    placeholder="Nombre"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Email cliente
                  </label>
                  <input
                    type="email"
                    value={clienteEmail}
                    onChange={(e) => setClienteEmail(e.target.value)}
                    className="input-field"
                    placeholder="email@..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Estado
                </label>
                <div className="flex flex-wrap gap-2">
                  {ESTADOS.map((e) => (
                    <button
                      key={e.value}
                      type="button"
                      onClick={() => setEstado(e.value)}
                      className={`badge ${e.cls} cursor-pointer`}
                      style={{
                        opacity: estado === e.value ? 1 : 0.4,
                        transform: estado === e.value ? "scale(1.05)" : "scale(1)",
                        transition: "all 0.15s",
                      }}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Notas
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="input-field h-20 resize-none"
                  placeholder="Detalles, instrucciones, observaciones..."
                />
              </div>

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
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {editingItem ? "Guardar cambios" : "Crear evento"}
                </button>
                <button onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancelar
                </button>
              </div>
              {editingItem && (
                <button
                  onClick={() => handleDelete(editingItem.id)}
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
