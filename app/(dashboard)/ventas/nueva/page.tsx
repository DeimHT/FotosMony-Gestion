"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Service } from "@/types";
import { formatCLP } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Loader2, ShoppingBag } from "lucide-react";
import ClienteSelector, { ClienteSeleccionado } from "@/components/clientes/ClienteSelector";

interface LineItem {
  servicio_nombre: string;
  cantidad: number;
  precio_unitario: number;
}

const METODOS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
];

export default function NuevaVentaPage() {
  const router = useRouter();
  const [cliente, setCliente] = useState<ClienteSeleccionado>({ nombre: "", email: "" });
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { servicio_nombre: "", cantidad: 1, precio_unitario: 0 },
  ]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadServices() {
      const supabase = createClient();
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      setServices(data ?? []);
    }
    loadServices();
  }, []);

  function addItem() {
    setItems([...items, { servicio_nombre: "", cantidad: 1, precio_unitario: 0 }]);
  }

  function removeItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: keyof LineItem, value: string | number) {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: value };
    setItems(updated);
  }

  function applyService(i: number, serviceId: string) {
    const svc = services.find((s) => s.id === serviceId);
    if (svc) {
      const updated = [...items];
      updated[i] = {
        ...updated[i],
        servicio_nombre: svc.title,
        precio_unitario: svc.price_clp,
      };
      setItems(updated);
    }
  }

  const total = items.reduce((s, item) => s + item.cantidad * item.precio_unitario, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (total <= 0) {
      setError("El total debe ser mayor a 0");
      return;
    }
    const validItems = items.filter((i) => i.servicio_nombre.trim() && i.cantidad > 0 && i.precio_unitario > 0);
    if (!validItems.length) {
      setError("Agrega al menos un ítem válido");
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data: venta, error: ventaError } = await supabase
      .from("ventas_presenciales")
      .insert({
        cliente_nombre: cliente.nombre.trim() || null,
        cliente_email: cliente.email.trim() || null,
        total_clp: total,
        metodo_pago: metodoPago,
        notas: notas.trim() || null,
      })
      .select()
      .single();

    if (ventaError) {
      setError(ventaError.message);
      setLoading(false);
      return;
    }

    const { error: itemsError } = await supabase.from("venta_presencial_items").insert(
      validItems.map((item) => ({
        venta_id: venta.id,
        servicio_nombre: item.servicio_nombre,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.cantidad * item.precio_unitario,
      }))
    );

    if (itemsError) {
      setError(itemsError.message);
      setLoading(false);
      return;
    }

    router.push("/ventas");
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <Link
          href="/ventas"
          className="inline-flex items-center gap-1.5 text-sm mb-3 transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={15} />
          Volver a ventas
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <ShoppingBag size={20} style={{ color: "var(--accent)" }} />
          Registrar Venta Presencial
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Client selector */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
              Cliente
            </h2>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              opcional
            </span>
          </div>
          <ClienteSelector value={cliente} onChange={setCliente} />
        </div>

        {/* Items */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
              Productos / Servicios
            </h2>
            {services.length > 0 && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Selecciona para autocompletar
              </p>
            )}
          </div>

          <div className="space-y-3">
            {items.map((item, i) => (
              <div
                key={i}
                className="p-3 rounded-xl space-y-2"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                    Ítem {i + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="p-1"
                      style={{ color: "var(--danger)" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {/* Quick service select */}
                {services.length > 0 && (
                  <select
                    className="input-field text-xs"
                    onChange={(e) => applyService(i, e.target.value)}
                    defaultValue=""
                  >
                    <option value="">— Seleccionar servicio existente —</option>
                    {services.map((svc) => (
                      <option key={svc.id} value={svc.id}>
                        {svc.title} ({formatCLP(svc.price_clp)})
                      </option>
                    ))}
                  </select>
                )}

                <input
                  type="text"
                  value={item.servicio_nombre}
                  onChange={(e) => updateItem(i, "servicio_nombre", e.target.value)}
                  className="input-field"
                  placeholder="Nombre del servicio o producto"
                  required
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={item.cantidad}
                      onChange={(e) => updateItem(i, "cantidad", parseInt(e.target.value) || 1)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                      Precio unitario (CLP)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={item.precio_unitario}
                      onChange={(e) => updateItem(i, "precio_unitario", parseInt(e.target.value) || 0)}
                      className="input-field"
                    />
                  </div>
                </div>

                {item.precio_unitario > 0 && (
                  <div className="flex justify-end">
                    <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                      Subtotal: {formatCLP(item.cantidad * item.precio_unitario)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button type="button" onClick={addItem} className="btn-secondary w-full justify-center text-sm">
            <Plus size={14} />
            Agregar ítem
          </button>

          {/* Total */}
          <div
            className="flex justify-between items-center px-3 py-2 rounded-lg"
            style={{ background: "var(--accent-muted)", border: "1px solid rgba(232,184,75,0.2)" }}
          >
            <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              TOTAL
            </span>
            <span className="text-xl font-bold" style={{ color: "var(--accent)" }}>
              {formatCLP(total)}
            </span>
          </div>
        </div>

        {/* Payment method & notes */}
        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
              Método de pago
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {METODOS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMetodoPago(m.value)}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: metodoPago === m.value ? "var(--accent-muted)" : "var(--bg-primary)",
                    color: metodoPago === m.value ? "var(--accent)" : "var(--text-secondary)",
                    border: metodoPago === m.value ? "1px solid rgba(232,184,75,0.3)" : "1px solid var(--border)",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Notas (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="input-field h-20 resize-none"
              placeholder="Observaciones, detalles del pedido..."
            />
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

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ShoppingBag size={16} />}
            Registrar venta
          </button>
          <Link href="/ventas" className="btn-secondary">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
