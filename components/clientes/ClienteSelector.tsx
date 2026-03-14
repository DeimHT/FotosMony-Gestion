"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, UserPlus, X, Check, Loader2, User } from "lucide-react";

export interface ClienteSeleccionado {
  nombre: string;
  email: string;
}

interface ClienteOpcion {
  id: string;
  nombre: string;
  email: string;
  tipo: "web" | "presencial";
}

interface ClienteSelectorProps {
  value: ClienteSeleccionado;
  onChange: (cliente: ClienteSeleccionado) => void;
}

export default function ClienteSelector({ value, onChange }: ClienteSelectorProps) {
  const [clientes, setClientes] = useState<ClienteOpcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadClientes() {
      const supabase = createClient();

      const [{ data: clientesDB }, { data: profiles }, { data: ventas }] = await Promise.all([
        supabase.from("clientes").select("id, nombre, email").order("nombre"),
        supabase
          .from("profiles")
          .select("id, full_name")
          .not("full_name", "is", null)
          .order("full_name"),
        supabase
          .from("ventas_presenciales")
          .select("cliente_nombre, cliente_email")
          .not("cliente_nombre", "is", null),
      ]);

      // 1. Clientes de gestión (tabla clientes)
      const gestClientes: ClienteOpcion[] = (clientesDB ?? []).map((c) => ({
        id: `gest-${c.id}`,
        nombre: c.nombre,
        email: c.email || "",
        tipo: "presencial" as const,
      }));

      const gestEmails = new Set(gestClientes.map((c) => c.email.toLowerCase()).filter(Boolean));
      const gestNombres = new Set(gestClientes.map((c) => c.nombre.toLowerCase()));

      // 2. Clientes web (profiles)
      const webClientes: ClienteOpcion[] = (profiles ?? [])
        .filter((p) => p.full_name?.trim())
        .map((p) => ({
          id: `web-${p.id}`,
          nombre: p.full_name!,
          email: "",
          tipo: "web" as const,
        }));

      // 3. Presenciales históricos no en gestión
      const presMap = new Map<string, ClienteOpcion>();
      (ventas ?? []).forEach((v) => {
        if (!v.cliente_nombre?.trim()) return;
        const emailKey = v.cliente_email?.toLowerCase() || "";
        const nombreKey = v.cliente_nombre.toLowerCase();
        if (gestEmails.has(emailKey) || gestNombres.has(nombreKey)) return;
        const key = emailKey || nombreKey;
        if (!presMap.has(key)) {
          presMap.set(key, {
            id: `pres-${key}`,
            nombre: v.cliente_nombre,
            email: v.cliente_email || "",
            tipo: "presencial" as const,
          });
        }
      });

      const webEmails = new Set(webClientes.map((c) => c.email.toLowerCase()).filter(Boolean));
      const presClientes = Array.from(presMap.values()).filter(
        (c) => !c.email || !webEmails.has(c.email.toLowerCase())
      );

      setClientes([...gestClientes, ...webClientes, ...presClientes]);
      setLoading(false);
    }
    loadClientes();
  }, []);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = clientes.filter((c) => {
    const term = busqueda.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term)
    );
  });

  function seleccionar(c: ClienteOpcion) {
    onChange({ nombre: c.nombre, email: c.email });
    setBusqueda("");
    setOpen(false);
  }

  function limpiar() {
    onChange({ nombre: "", email: "" });
    setBusqueda("");
  }

  function abrirModal() {
    setNuevoNombre("");
    setNuevoEmail("");
    setOpen(false);
    setShowModal(true);
  }

  function confirmarNuevo() {
    if (!nuevoNombre.trim()) return;
    onChange({ nombre: nuevoNombre.trim(), email: nuevoEmail.trim() });
    setShowModal(false);
  }

  const hasValue = !!value.nombre;

  return (
    <>
      <div ref={containerRef} className="relative">
        {/* Display selected or input */}
        {hasValue ? (
          <div
            className="flex items-center gap-3 input-field cursor-pointer"
            onClick={() => { limpiar(); setOpen(true); }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
            >
              {value.nombre[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                {value.nombre}
              </p>
              {value.email && (
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                  {value.email}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); limpiar(); }}
              className="shrink-0"
              style={{ color: "var(--text-muted)" }}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <div
              className="flex items-center gap-2 input-field flex-1 cursor-text"
              onClick={() => setOpen(true)}
            >
              <Search size={14} className="shrink-0" style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => { setBusqueda(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                placeholder="Buscar cliente existente..."
                className="bg-transparent outline-none text-sm flex-1 min-w-0"
                style={{ color: "var(--text-primary)" }}
              />
              {loading && <Loader2 size={13} className="animate-spin shrink-0" style={{ color: "var(--text-muted)" }} />}
            </div>
            <button
              type="button"
              onClick={abrirModal}
              className="btn-secondary px-3 shrink-0"
              title="Crear nuevo cliente"
            >
              <UserPlus size={15} />
            </button>
          </div>
        )}

        {/* Dropdown */}
        {open && !hasValue && (
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-2xl z-50 overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="max-h-56 overflow-y-auto">
              {filtered.length > 0 ? (
                filtered.slice(0, 20).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => seleccionar(c)}
                    className="flex items-center gap-3 w-full text-left px-3 py-2.5 transition-colors hover:bg-[var(--bg-card-hover)]"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
                    >
                      {c.nombre[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {c.nombre}
                      </p>
                      {c.email && (
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                          {c.email}
                        </p>
                      )}
                    </div>
                    <span
                      className={`badge text-[10px] shrink-0 ${c.tipo === "web" ? "badge-blue" : "badge-gold"}`}
                    >
                      {c.tipo === "web" ? "Web" : "Presencial"}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
                  {loading ? "Cargando clientes..." : `Sin resultados para "${busqueda}"`}
                </div>
              )}
            </div>

            {/* Footer: create new */}
            <button
              type="button"
              onClick={abrirModal}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium transition-colors"
              style={{
                borderTop: "1px solid var(--border)",
                color: "var(--accent)",
                background: "var(--accent-muted)",
              }}
            >
              <UserPlus size={14} />
              Crear nuevo cliente
              {busqueda && (
                <span style={{ color: "var(--text-muted)" }}>
                  &quot;{busqueda}&quot;
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Modal nuevo cliente */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <User size={16} style={{ color: "var(--accent)" }} />
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  Nuevo cliente
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} style={{ color: "var(--text-muted)" }}>
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
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirmarNuevo()}
                  className="input-field"
                  placeholder="Nombre completo"
                  autoFocus
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Email
                  <span className="ml-1 font-normal" style={{ color: "var(--text-muted)" }}>
                    (opcional)
                  </span>
                </label>
                <input
                  type="email"
                  value={nuevoEmail}
                  onChange={(e) => setNuevoEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirmarNuevo()}
                  className="input-field"
                  placeholder="cliente@email.com"
                />
              </div>
            </div>

            <div
              className="flex gap-2 px-5 py-4"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <button
                type="button"
                onClick={confirmarNuevo}
                disabled={!nuevoNombre.trim()}
                className="btn-primary flex-1 justify-center"
                style={{ opacity: nuevoNombre.trim() ? 1 : 0.5 }}
              >
                <Check size={15} />
                Usar este cliente
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
