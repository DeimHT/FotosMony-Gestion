"use client";

import { useState } from "react";
import { Cliente } from "@/types";
import { formatDate, formatCLP, getInitials } from "@/lib/utils";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import {
  Users,
  Plus,
  Pencil,
  X,
  Loader2,
  ShoppingCart,
  ShoppingBag,
  Search,
  Phone,
  Mail,
  StickyNote,
  Check,
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
  created_at: string;
}

interface ClientesClientProps {
  initialClientes: Cliente[];
  profiles: ProfileRow[];
  orders: OrderRow[];
  ventas: VentaRow[];
}

// ─── Unified client view ──────────────────────────────────────────────────────

interface ClienteVista {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  compras: number;
  totalGastado: number;
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

  // ── Build unified list ──────────────────────────────────────────────────────

  const webVistas: ClienteVista[] = profiles.map((p) => {
    const userOrders = orders.filter((o) => o.user_id === p.id && o.status === "paid");
    return {
      id: `web-${p.id}`,
      nombre: p.full_name || "Sin nombre",
      email: "",
      telefono: p.phone || "",
      compras: userOrders.length,
      totalGastado: userOrders.reduce((s, o) => s + o.total_clp, 0),
      tipo: "web",
      fechaRegistro: p.created_at,
    };
  });

  const gestionVistas: ClienteVista[] = clientes.map((c) => ({
    id: `gest-${c.id}`,
    nombre: c.nombre,
    email: c.email || "",
    telefono: c.telefono || "",
    compras: ventas.filter(
      (v) =>
        v.cliente_email === c.email ||
        v.cliente_nombre?.toLowerCase() === c.nombre.toLowerCase()
    ).length,
    totalGastado: ventas
      .filter(
        (v) =>
          v.cliente_email === c.email ||
          v.cliente_nombre?.toLowerCase() === c.nombre.toLowerCase()
      )
      .reduce((s, v) => s + v.total_clp, 0),
    tipo: "gestion",
    fechaRegistro: c.created_at,
    dbId: c.id,
  }));

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
    } else {
      presMap.set(key, {
        id: `pres-${key}`,
        nombre: v.cliente_nombre,
        email: v.cliente_email || "",
        telefono: "",
        compras: 1,
        totalGastado: v.total_clp,
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
                      onClick={() =>
                        setSelectedCliente(selectedCliente?.id === c.id ? null : c)
                      }
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{
                              background: "var(--accent-muted)",
                              color: "var(--accent)",
                            }}
                          >
                            {getInitials(c.nombre)}
                          </div>
                          <div>
                            <p
                              className="font-medium"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {c.nombre}
                            </p>
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
                      <td className="px-4 py-3">
                        {c.tipo === "gestion" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(c);
                            }}
                            className="p-1 rounded"
                            style={{ color: "var(--text-muted)" }}
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                      </td>
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

        {/* Detail panel */}
        <div>
          {selectedCliente ? (
            <div className="card space-y-4">
              <div className="flex items-start justify-between">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                  style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
                >
                  {getInitials(selectedCliente.nombre)}
                </div>
                <div className="flex items-center gap-1.5">
                  {selectedCliente.tipo === "gestion" && (
                    <button
                      onClick={() => openEdit(selectedCliente)}
                      className="btn-secondary text-xs px-2.5 py-1.5"
                    >
                      <Pencil size={12} />
                      Editar
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedCliente(null)}
                    style={{ color: "var(--text-muted)" }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div>
                <h3
                  className="font-bold text-base"
                  style={{ color: "var(--text-primary)" }}
                >
                  {selectedCliente.nombre}
                </h3>
                <span className={`badge ${TIPO_BADGE[selectedCliente.tipo]} mt-1`}>
                  {TIPO_LABEL[selectedCliente.tipo]}
                </span>
              </div>

              <div className="space-y-2.5">
                {selectedCliente.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={13} style={{ color: "var(--text-muted)" }} />
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {selectedCliente.email}
                    </span>
                  </div>
                )}
                {selectedCliente.telefono && (
                  <div className="flex items-center gap-2">
                    <Phone size={13} style={{ color: "var(--text-muted)" }} />
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {selectedCliente.telefono}
                    </span>
                  </div>
                )}
                {selectedCliente.tipo === "gestion" && (() => {
                  const db = clientes.find((c) => c.id === selectedCliente.dbId);
                  return db?.notas ? (
                    <div className="flex items-start gap-2">
                      <StickyNote size={13} className="mt-0.5" style={{ color: "var(--text-muted)" }} />
                      <span
                        className="text-sm whitespace-pre-wrap"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {db.notas}
                      </span>
                    </div>
                  ) : null;
                })()}
              </div>

              <div
                className="grid grid-cols-2 gap-3 pt-3"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                {[
                  { label: "Compras", value: selectedCliente.compras },
                  {
                    label: "Total gastado",
                    value:
                      selectedCliente.totalGastado > 0
                        ? formatCLP(selectedCliente.totalGastado)
                        : "—",
                  },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {s.label}
                    </p>
                    <p
                      className="text-base font-bold"
                      style={{ color: "var(--accent)" }}
                    >
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Registrado el {formatDate(selectedCliente.fechaRegistro)}
              </p>

              {selectedCliente.tipo === "gestion" && selectedCliente.dbId && (
                <button
                  onClick={() => handleDelete(selectedCliente.dbId!)}
                  className="text-xs w-full text-center pt-1"
                  style={{ color: "var(--danger)" }}
                >
                  Eliminar cliente
                </button>
              )}
            </div>
          ) : (
            <div
              className="card flex items-center justify-center text-center"
              style={{ minHeight: 200, color: "var(--text-muted)" }}
            >
              <div>
                <Users size={28} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">Selecciona un cliente para ver su detalle</p>
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
