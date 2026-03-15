"use client";

import { useState } from "react";
import { Cliente } from "@/types";
import { formatDate, formatCLP, getInitials } from "@/lib/utils";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import {
  Users,
  Plus,
  X,
  Loader2,
  ShoppingCart,
  ShoppingBag,
  Search,
  Check,
  Save,
  UserPlus,
  AlertCircle,
} from "lucide-react";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProfileRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

interface OrderRow {
  user_id: string | null;
  guest_email: string | null;
  total_clp: number;
  status: string;
  created_at: string;
}

interface VentaRow {
  cliente_nombre: string | null;
  cliente_email: string | null;
  total_clp: number;
  estado: string;
  created_at: string;
}

interface ClientesClientProps {
  initialClientes: Cliente[];
  profiles: ProfileRow[];
  orders: OrderRow[];
  ventas: VentaRow[];
  emailMap: Record<string, string>;
}

// ─── Unified client view ──────────────────────────────────────────────────────

interface ClienteVista {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  compras: number;
  totalGastado: number;
  deudaFiado: number; // total de ventas con estado "fiado"
  tipo: "web" | "presencial" | "gestion";
  fechaRegistro: string;
  dbId?: string; // only for "gestion" type
}

// ─── Empty form ───────────────────────────────────────────────────────────────

const EMPTY_FORM = { nombre: "", email: "", telefono: "", notas: "" };

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClientesClient({
  initialClientes,
  profiles,
  orders,
  ventas,
  emailMap,
}: ClientesClientProps) {
  const [clientes, setClientes] = useState<Cliente[]>(initialClientes);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"all" | "web" | "presencial" | "gestion">("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteVista | null>(null);

  // Panel de edición inline (derecha)
  const [panelForm, setPanelForm] = useState(EMPTY_FORM);
  const [panelEditing, setPanelEditing] = useState(false);   // true = mostrando form editable
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelSaved, setPanelSaved] = useState(false);

  // ── Build unified list ──────────────────────────────────────────────────────

  const webVistas: ClienteVista[] = profiles.map((p) => {
    const userOrders = orders.filter((o) => o.user_id === p.id && o.status === "paid");
    const email = emailMap[p.id] ?? "";
    return {
      id: `web-${p.id}`,
      nombre: p.full_name || email.split("@")[0] || "Sin nombre",
      email,
      telefono: p.phone || "",
      compras: userOrders.length,
      totalGastado: userOrders.reduce((s, o) => s + o.total_clp, 0),
      deudaFiado: 0,
      tipo: "web",
      fechaRegistro: p.created_at,
    };
  });

  const gestionVistas: ClienteVista[] = clientes.map((c) => {
    const ventasCliente = ventas.filter(
      (v) =>
        v.cliente_email === c.email ||
        v.cliente_nombre?.toLowerCase() === c.nombre.toLowerCase()
    );
    return {
      id: `gest-${c.id}`,
      nombre: c.nombre,
      email: c.email || "",
      telefono: c.telefono || "",
      compras: ventasCliente.length,
      totalGastado: ventasCliente.reduce((s, v) => s + v.total_clp, 0),
      deudaFiado: ventasCliente.filter((v) => v.estado === "fiado").reduce((s, v) => s + v.total_clp, 0),
      tipo: "gestion",
      fechaRegistro: c.created_at,
      dbId: c.id,
    };
  });

  // Presential clients from ventas not in gestion list
  const gestionEmails = new Set(clientes.map((c) => c.email?.toLowerCase()).filter(Boolean));
  const gestionNombres = new Set(clientes.map((c) => c.nombre.toLowerCase()));
  const presMap = new Map<string, ClienteVista>();
  ventas.forEach((v) => {
    if (!v.cliente_nombre?.trim()) return;
    const key = v.cliente_email?.toLowerCase() || v.cliente_nombre.toLowerCase();
    if (
      gestionEmails.has(v.cliente_email?.toLowerCase() || "") ||
      gestionNombres.has(v.cliente_nombre.toLowerCase())
    )
      return;
    const existing = presMap.get(key);
      if (existing) {
        existing.compras += 1;
        existing.totalGastado += v.total_clp;
        if (v.estado === "fiado") existing.deudaFiado += v.total_clp;
    } else {
      presMap.set(key, {
          id: `pres-${key}`,
          nombre: v.cliente_nombre,
          email: v.cliente_email || "",
          telefono: "",
          compras: 1,
          totalGastado: v.total_clp,
          deudaFiado: v.estado === "fiado" ? v.total_clp : 0,
          tipo: "presencial",
          fechaRegistro: v.created_at,
        });
    }
  });
  const presVistas = Array.from(presMap.values());

  const allVistas = [...gestionVistas, ...webVistas, ...presVistas].sort(
    (a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime()
  );

  const filtered = allVistas.filter((c) => {
    if (filtroTipo !== "all" && c.tipo !== filtroTipo) return false;
    if (!busqueda) return true;
    const t = busqueda.toLowerCase();
    return c.nombre.toLowerCase().includes(t) || c.email.toLowerCase().includes(t);
  });

  // ── CRUD ────────────────────────────────────────────────────────────────────

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setSaved(false);
    setShowForm(true);
    setSelectedCliente(null);
  }

  // Seleccionar un cliente y abrir el panel lateral editable
  function selectCliente(c: ClienteVista) {
    if (selectedCliente?.id === c.id) {
      setSelectedCliente(null);
      setPanelEditing(false);
      return;
    }
    setSelectedCliente(c);
    setPanelError(null);
    setPanelSaved(false);
    // Pre-llenar panel con datos disponibles
    const dbRecord = c.dbId ? clientes.find((x) => x.id === c.dbId) : null;
    setPanelForm({
      nombre: c.nombre,
      email: c.email || "",
      telefono: c.telefono || "",
      notas: dbRecord?.notas || "",
    });
    // Abrir directamente en modo edición
    setPanelEditing(true);
  }

  // Guardar desde el panel lateral
  async function handlePanelSave() {
    if (!selectedCliente) return;
    if (!panelForm.nombre.trim()) {
      setPanelError("El nombre es obligatorio");
      return;
    }
    setPanelLoading(true);
    setPanelError(null);
    const supabase = createSupabaseClient();
    const payload = {
      nombre: panelForm.nombre.trim(),
      email: panelForm.email.trim() || null,
      telefono: panelForm.telefono.trim() || null,
      notas: panelForm.notas.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (selectedCliente.tipo === "gestion" && selectedCliente.dbId) {
      // Actualizar registro existente
      const { data, error: err } = await supabase
        .from("clientes")
        .update(payload)
        .eq("id", selectedCliente.dbId)
        .select()
        .single();
      if (err) { setPanelError(err.message); setPanelLoading(false); return; }
      setClientes(clientes.map((c) => (c.id === selectedCliente.dbId ? data : c)));
    } else {
      // Crear nuevo registro de gestión con los datos pre-llenados
      const { data, error: err } = await supabase
        .from("clientes")
        .insert(payload)
        .select()
        .single();
      if (err) { setPanelError(err.message); setPanelLoading(false); return; }
      setClientes([data, ...clientes]);
    }

    setPanelSaved(true);
    setPanelLoading(false);
    setTimeout(() => {
      setPanelSaved(false);
      setPanelEditing(false);
      setSelectedCliente(null);
    }, 900);
  }

  // Mantener openEdit para el modal independiente (crear desde cero)
  function openEdit(c: ClienteVista) {
    if (c.tipo !== "gestion" || !c.dbId) return;
    const db = clientes.find((x) => x.id === c.dbId)!;
    setEditingId(c.dbId);
    setForm({
      nombre: db.nombre,
      email: db.email || "",
      telefono: db.telefono || "",
      notas: db.notas || "",
    });
    setError(null);
    setSaved(false);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createSupabaseClient();
    const payload = {
      nombre: form.nombre.trim(),
      email: form.email.trim() || null,
      telefono: form.telefono.trim() || null,
      notas: form.notas.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { data, error: err } = await supabase
        .from("clientes")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single();
      if (err) { setError(err.message); setLoading(false); return; }
      setClientes(clientes.map((c) => (c.id === editingId ? data : c)));
    } else {
      const { data, error: err } = await supabase
        .from("clientes")
        .insert(payload)
        .select()
        .single();
      if (err) { setError(err.message); setLoading(false); return; }
      setClientes([data, ...clientes]);
    }

    setSaved(true);
    setLoading(false);
    setTimeout(() => {
      setShowForm(false);
      setSaved(false);
    }, 800);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este cliente?")) return;
    const supabase = createSupabaseClient();
    await supabase.from("clientes").delete().eq("id", id);
    setClientes(clientes.filter((c) => c.id !== id));
    setShowForm(false);
    setSelectedCliente(null);
  }

  // ── Tipo labels ─────────────────────────────────────────────────────────────

  const TIPO_BADGE: Record<string, string> = {
    web: "badge-blue",
    presencial: "badge-gold",
    gestion: "badge-green",
  };
  const TIPO_LABEL: Record<string, string> = {
    web: "Web",
    presencial: "Presencial",
    gestion: "Gestión",
  };

  const totales = {
    all: allVistas.length,
    web: webVistas.length,
    presencial: presVistas.length,
    gestion: gestionVistas.length,
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold flex items-center gap-2"
            style={{ color: "var(--text-primary)" }}
          >
            <Users size={22} style={{ color: "var(--accent)" }} />
            Clientes
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {allVistas.length} clientes en total
          </p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus size={16} />
          Nuevo cliente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: "all", label: "Total", icon: Users, color: "var(--accent)" },
          { key: "web", label: "Web", icon: ShoppingCart, color: "var(--info)" },
          { key: "presencial", label: "Presencial", icon: ShoppingBag, color: "var(--warning)" },
          { key: "gestion", label: "Gestión", icon: Users, color: "var(--success)" },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setFiltroTipo(s.key as typeof filtroTipo)}
            className="card text-left transition-all"
            style={{
              borderLeft: `3px solid ${filtroTipo === s.key ? s.color : "var(--border)"}`,
              opacity: filtroTipo !== "all" && filtroTipo !== s.key ? 0.5 : 1,
            }}
          >
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {s.label}
            </p>
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              {totales[s.key as keyof typeof totales]}
            </p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* List */}
        <div className="lg:col-span-2 space-y-3">
          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <Search size={15} style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="bg-transparent outline-none text-sm flex-1"
              style={{ color: "var(--text-primary)" }}
            />
            {busqueda && (
              <button onClick={() => setBusqueda("")} style={{ color: "var(--text-muted)" }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Table */}
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: "rgba(0,0,0,0.2)",
                    }}
                  >
                    {["Cliente", "Tipo", "Compras", "Total", "Registro", ""].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      className="transition-colors cursor-pointer"
                      style={{
                        borderBottom: "1px solid var(--border)",
                        background:
                          selectedCliente?.id === c.id
                            ? "var(--accent-muted)"
                            : "transparent",
                      }}
                      onClick={() => selectCliente(c)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{
                              background: c.deudaFiado > 0 ? "rgba(239,68,68,0.15)" : "var(--accent-muted)",
                              color: c.deudaFiado > 0 ? "var(--danger)" : "var(--accent)",
                            }}
                          >
                            {getInitials(c.nombre)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p
                                className="font-medium"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {c.nombre}
                              </p>
                              {c.deudaFiado > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                  style={{ background: "rgba(239,68,68,0.12)", color: "var(--danger)" }}
                                >
                                  <AlertCircle size={9} />
                                  Deudor
                                </span>
                              )}
                            </div>
                            {c.email && (
                              <p
                                className="text-xs"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {c.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${TIPO_BADGE[c.tipo]}`}>
                          {TIPO_LABEL[c.tipo]}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {c.compras}
                      </td>
                      <td
                        className="px-4 py-3 font-semibold"
                        style={{ color: c.totalGastado > 0 ? "var(--accent)" : "var(--text-muted)" }}
                      >
                        {c.totalGastado > 0 ? formatCLP(c.totalGastado) : "—"}
                      </td>
                      <td
                        className="px-4 py-3 text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {formatDate(c.fechaRegistro)}
                      </td>
                      <td className="px-4 py-3" />
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div
                  className="text-center py-10"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Users size={28} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">
                    {busqueda ? `Sin resultados para "${busqueda}"` : "No hay clientes"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel lateral editable */}
        <div>
          {selectedCliente ? (
            <div className="card space-y-4">
              {/* Encabezado del panel */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold shrink-0"
                    style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
                  >
                    {getInitials(selectedCliente.nombre)}
                  </div>
                  <div>
                    <p className="font-bold text-sm leading-tight" style={{ color: "var(--text-primary)" }}>
                      {selectedCliente.nombre}
                    </p>
                    <span className={`badge ${TIPO_BADGE[selectedCliente.tipo]} text-[10px] mt-0.5`}>
                      {TIPO_LABEL[selectedCliente.tipo]}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedCliente(null); setPanelEditing(false); }}
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Compras", value: selectedCliente.compras, color: "var(--accent)" },
                  {
                    label: "Total gastado",
                    value: selectedCliente.totalGastado > 0 ? formatCLP(selectedCliente.totalGastado) : "—",
                    color: "var(--accent)",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-lg px-3 py-2"
                    style={{ background: "var(--bg-primary)" }}
                  >
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                    <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
              {selectedCliente.deudaFiado > 0 && (
                <div
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} style={{ color: "var(--danger)" }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--danger)" }}>
                      Deuda al fiado
                    </span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: "var(--danger)" }}>
                    {formatCLP(selectedCliente.deudaFiado)}
                  </span>
                </div>
              )}

              {/* Formulario editable */}
              <div
                className="space-y-3 pt-3"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                {selectedCliente.tipo !== "gestion" && (
                  <div
                    className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
                    style={{ background: "rgba(59,130,246,0.08)", color: "#60A5FA", border: "1px solid rgba(59,130,246,0.2)" }}
                  >
                    <UserPlus size={13} className="shrink-0 mt-0.5" />
                    Al guardar se creará un registro de gestión con estos datos.
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={panelForm.nombre}
                    onChange={(e) => setPanelForm({ ...panelForm, nombre: e.target.value })}
                    className="input-field text-sm py-1.5"
                    disabled={panelLoading}
                  />
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={panelForm.email}
                      onChange={(e) => setPanelForm({ ...panelForm, email: e.target.value })}
                      className="input-field text-sm py-1.5"
                      placeholder="email@ejemplo.com"
                      disabled={panelLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={panelForm.telefono}
                      onChange={(e) => setPanelForm({ ...panelForm, telefono: e.target.value })}
                      className="input-field text-sm py-1.5"
                      placeholder="+56 9 ..."
                      disabled={panelLoading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    Notas
                  </label>
                  <textarea
                    value={panelForm.notas}
                    onChange={(e) => setPanelForm({ ...panelForm, notas: e.target.value })}
                    className="input-field text-sm py-1.5 h-16 resize-none"
                    placeholder="Observaciones, preferencias..."
                    disabled={panelLoading}
                  />
                </div>

                {panelError && (
                  <p className="text-xs" style={{ color: "var(--danger)" }}>{panelError}</p>
                )}

                <button
                  onClick={handlePanelSave}
                  disabled={panelLoading || panelSaved}
                  className="btn-primary w-full justify-center"
                >
                  {panelLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : panelSaved ? (
                    <Check size={14} />
                  ) : (
                    <Save size={14} />
                  )}
                  {panelSaved
                    ? "Guardado"
                    : selectedCliente.tipo === "gestion"
                      ? "Guardar cambios"
                      : "Guardar en gestión"}
                </button>

                {selectedCliente.tipo === "gestion" && selectedCliente.dbId && (
                  <button
                    onClick={() => handleDelete(selectedCliente.dbId!)}
                    className="text-xs w-full text-center"
                    style={{ color: "var(--danger)" }}
                  >
                    Eliminar cliente
                  </button>
                )}

                <p className="text-[11px] text-center" style={{ color: "var(--text-muted)" }}>
                  Registrado el {formatDate(selectedCliente.fechaRegistro)}
                </p>
              </div>
            </div>
          ) : (
            <div
              className="card flex items-center justify-center text-center"
              style={{ minHeight: 200, color: "var(--text-muted)" }}
            >
              <div>
                <Users size={28} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">Selecciona un cliente para editar su información</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {editingId ? "Editar cliente" : "Nuevo cliente"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                style={{ color: "var(--text-muted)" }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Nombre *
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="input-field"
                  placeholder="Nombre completo"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-field"
                    placeholder="email@ejemplo.com"
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className="input-field"
                    placeholder="+56 9 ..."
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Notas
                </label>
                <textarea
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  className="input-field h-20 resize-none"
                  placeholder="Observaciones, preferencias, etc."
                />
              </div>

              {error && (
                <div
                  className="text-sm px-3 py-2 rounded-lg"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    color: "var(--danger)",
                    border: "1px solid rgba(239,68,68,0.2)",
                  }}
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
                  disabled={loading || saved}
                  className="btn-primary"
                >
                  {loading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : saved ? (
                    <Check size={15} />
                  ) : null}
                  {saved ? "Guardado" : editingId ? "Guardar cambios" : "Crear cliente"}
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
