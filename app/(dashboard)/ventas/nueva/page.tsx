"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ProductoVariante, ProductoWithVariantes } from "@/types";
import { formatCLP } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Loader2, ShoppingBag, AlertCircle } from "lucide-react";
import NumericInput from "@/components/ui/NumericInput";
import ClienteSelector, { ClienteSeleccionado } from "@/components/clientes/ClienteSelector";

interface LineItem {
  producto_id: string;
  variante_id: string;
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
  const [esfiado, setEsFiado] = useState(false);
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { producto_id: "", variante_id: "", servicio_nombre: "", cantidad: 1, precio_unitario: 0 },
  ]);
  const [productos, setProductos] = useState<ProductoWithVariantes[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("productos")
        .select("*, producto_variantes(*)")
        .eq("activo", true)
        .order("nombre");
      const filtered = (data ?? []).map((p) => ({
        ...p,
        producto_variantes: p.producto_variantes
          .filter((v: ProductoVariante) => v.activo)
          .sort((a: ProductoVariante, b: ProductoVariante) => a.nombre.localeCompare(b.nombre)),
      }));
      setProductos(filtered);
    }
    load();
  }, []);

  function addItem() {
    setItems([
      ...items,
      { producto_id: "", variante_id: "", servicio_nombre: "", cantidad: 1, precio_unitario: 0 },
    ]);
  }

  function removeItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: keyof LineItem, value: string | number) {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: value };
    setItems(updated);
  }

  function handleProductoChange(i: number, productoId: string) {
    const updated = [...items];
    updated[i] = {
      ...updated[i],
      producto_id: productoId,
      variante_id: "",
      servicio_nombre: "",
      precio_unitario: 0,
    };
    setItems(updated);
  }

  function handleVarianteChange(i: number, varianteId: string) {
    const item = items[i];
    const producto = productos.find((p) => p.id === item.producto_id);
    const variante = producto?.producto_variantes.find((v) => v.id === varianteId);
    if (!producto || !variante) return;
    const updated = [...items];
    updated[i] = {
      ...updated[i],
      variante_id: variante.id,
      precio_unitario: variante.precio_clp,
      servicio_nombre: `${producto.nombre} – ${variante.nombre}`,
    };
    setItems(updated);
  }

  const total = items.reduce((s, item) => s + item.cantidad * item.precio_unitario, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (total <= 0) {
      setError("El total debe ser mayor a 0");
      return;
    }
    const validItems = items.filter(
      (i) => i.variante_id && i.cantidad > 0 && i.precio_unitario > 0
    );
    if (!validItems.length) {
      setError("Agrega al menos un ítem válido con producto y variante seleccionados");
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
        estado: esfiado ? "fiado" : "pagado",
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
        variante_id: item.variante_id || null,
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
        {/* Cliente */}
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

                {/* Producto selector */}
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                    Producto
                  </label>
                  <select
                    className="input-field"
                    value={item.producto_id}
                    onChange={(e) => handleProductoChange(i, e.target.value)}
                  >
                    <option value="">— Seleccionar producto —</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Variante selector — only shown once a product is picked */}
                {item.producto_id && (
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                      Variante
                    </label>
                    <select
                      className="input-field"
                      value={item.variante_id}
                      onChange={(e) => handleVarianteChange(i, e.target.value)}
                    >
                      <option value="">— Seleccionar variante —</option>
                      {productos
                        .find((p) => p.id === item.producto_id)
                        ?.producto_variantes.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.nombre} ({formatCLP(v.precio_clp)})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                      Cantidad
                    </label>
                    <NumericInput
                      value={item.cantidad}
                      onChange={(val) => updateItem(i, "cantidad", Math.max(1, val))}
                      min={1}
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                      Precio unitario (CLP)
                    </label>
                    <NumericInput
                      value={item.precio_unitario}
                      onChange={(val) => updateItem(i, "precio_unitario", val)}
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
          {/* Fiado toggle */}
          <button
            type="button"
            onClick={() => setEsFiado(!esfiado)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
            style={{
              background: esfiado ? "rgba(239,68,68,0.08)" : "var(--bg-primary)",
              border: esfiado ? "1px solid rgba(239,68,68,0.35)" : "1px solid var(--border)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle size={16} style={{ color: esfiado ? "var(--danger)" : "var(--text-muted)" }} />
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: esfiado ? "var(--danger)" : "var(--text-secondary)" }}>
                  Dar al fiado
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {esfiado ? "Esta venta quedará como deuda pendiente del cliente" : "El cliente pagará después"}
                </p>
              </div>
            </div>
            <div
              className="w-10 h-5 rounded-full transition-all relative shrink-0"
              style={{ background: esfiado ? "var(--danger)" : "var(--border)" }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: esfiado ? "calc(100% - 18px)" : "2px" }}
              />
            </div>
          </button>

          {!esfiado && (
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
          )}

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
