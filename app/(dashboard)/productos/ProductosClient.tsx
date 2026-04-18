"use client";

import { useState } from "react";
import { ProductoWithVariantes, ProductoVariante } from "@/types";
import { formatCLP } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import NumericInput from "@/components/ui/NumericInput";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductosClientProps {
  initialProductos: ProductoWithVariantes[];
}

// ─── Empty forms ──────────────────────────────────────────────────────────────

const EMPTY_PRODUCTO_FORM = {
  nombre: "",
  descripcion: "",
  activo: true,
};

const EMPTY_VARIANTE_FORM = {
  nombre: "",
  precio_clp: 0,
  stock: "",
  activo: true,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductosClient({ initialProductos }: ProductosClientProps) {
  const [productos, setProductos] = useState<ProductoWithVariantes[]>(initialProductos);

  // Product modal
  const [showProductoModal, setShowProductoModal] = useState(false);
  const [editingProducto, setEditingProducto] = useState<ProductoWithVariantes | null>(null);
  const [productoForm, setProductoForm] = useState(EMPTY_PRODUCTO_FORM);

  // Variant modal
  const [showVarianteModal, setShowVarianteModal] = useState(false);
  const [editingVariante, setEditingVariante] = useState<ProductoVariante | null>(null);
  const [varianteProductoId, setVarianteProductoId] = useState<string | null>(null);
  const [varianteForm, setVarianteForm] = useState(EMPTY_VARIANTE_FORM);

  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline delete confirms
  const [deleteConfirmProducto, setDeleteConfirmProducto] = useState<string | null>(null);
  const [deleteConfirmVariante, setDeleteConfirmVariante] = useState<string | null>(null);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  async function reloadProductos() {
    const supabase = createClient();
    const { data } = await supabase
      .from("productos")
      .select("*, producto_variantes(*)")
      .order("created_at", { ascending: false });
    if (data) {
      const sorted = data.map((p) => ({
        ...p,
        producto_variantes: [...(p.producto_variantes ?? [])].sort(
          (a: ProductoVariante, b: ProductoVariante) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
      }));
      setProductos(sorted);
    }
  }

  // ── Product CRUD ─────────────────────────────────────────────────────────────

  function openNewProducto() {
    setEditingProducto(null);
    setProductoForm(EMPTY_PRODUCTO_FORM);
    setError(null);
    setShowProductoModal(true);
  }

  function openEditProducto(producto: ProductoWithVariantes) {
    setEditingProducto(producto);
    setProductoForm({
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? "",
      activo: producto.activo,
    });
    setError(null);
    setShowProductoModal(true);
  }

  async function handleSaveProducto() {
    if (!productoForm.nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      nombre: productoForm.nombre.trim(),
      descripcion: productoForm.descripcion.trim() || null,
      activo: productoForm.activo,
      updated_at: new Date().toISOString(),
    };

    if (editingProducto) {
      const { error: err } = await supabase
        .from("productos")
        .update(payload)
        .eq("id", editingProducto.id);
      if (err) { setError(err.message); setLoading(false); return; }
    } else {
      const { error: err } = await supabase
        .from("productos")
        .insert(payload);
      if (err) { setError(err.message); setLoading(false); return; }
    }

    await reloadProductos();
    setShowProductoModal(false);
    setLoading(false);
  }

  async function handleDeleteProducto(id: string) {
    const supabase = createClient();
    await supabase.from("productos").delete().eq("id", id);
    setDeleteConfirmProducto(null);
    await reloadProductos();
  }

  // ── Variant CRUD ─────────────────────────────────────────────────────────────

  function openNewVariante(productoId: string) {
    setEditingVariante(null);
    setVarianteProductoId(productoId);
    setVarianteForm(EMPTY_VARIANTE_FORM);
    setError(null);
    setShowVarianteModal(true);
  }

  function openEditVariante(variante: ProductoVariante) {
    setEditingVariante(variante);
    setVarianteProductoId(variante.producto_id);
    setVarianteForm({
      nombre: variante.nombre,
      precio_clp: variante.precio_clp,
      stock: variante.stock !== null ? String(variante.stock) : "",
      activo: variante.activo,
    });
    setError(null);
    setShowVarianteModal(true);
  }

  async function handleSaveVariante() {
    if (!varianteForm.nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    if (!varianteProductoId) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const stockValue = varianteForm.stock === "" ? null : parseInt(varianteForm.stock, 10);
    const payload = {
      producto_id: varianteProductoId,
      nombre: varianteForm.nombre.trim(),
      precio_clp: varianteForm.precio_clp,
      stock: stockValue,
      activo: varianteForm.activo,
      updated_at: new Date().toISOString(),
    };

    if (editingVariante) {
      const { error: err } = await supabase
        .from("producto_variantes")
        .update(payload)
        .eq("id", editingVariante.id);
      if (err) { setError(err.message); setLoading(false); return; }
    } else {
      const { error: err } = await supabase
        .from("producto_variantes")
        .insert(payload);
      if (err) { setError(err.message); setLoading(false); return; }
    }

    await reloadProductos();
    setShowVarianteModal(false);
    setLoading(false);
  }

  async function handleDeleteVariante(id: string) {
    const supabase = createClient();
    await supabase.from("producto_variantes").delete().eq("id", id);
    setDeleteConfirmVariante(null);
    await reloadProductos();
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1
          className="text-xl font-bold flex items-center gap-2"
          style={{ color: "var(--text-primary)" }}
        >
          <Package size={22} style={{ color: "var(--accent)" }} />
          Productos
        </h1>
        <button onClick={openNewProducto} className="btn-primary">
          <Plus size={16} />
          Nuevo producto
        </button>
      </div>

      {/* Empty state */}
      {productos.length === 0 && (
        <div className="card text-center py-14" style={{ color: "var(--text-muted)" }}>
          <Package size={38} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No hay productos. Crea el primero.</p>
        </div>
      )}

      {/* Product list */}
      <div className="space-y-4">
        {productos.map((producto) => (
          <div key={producto.id} className="card space-y-4">
            {/* Product top row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2
                    className="font-bold text-base"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {producto.nombre}
                  </h2>
                  <span className={`badge ${producto.activo ? "badge-green" : "badge-gray"}`}>
                    {producto.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
                {producto.descripcion && (
                  <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {producto.descripcion}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEditProducto(producto)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  title="Editar producto"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() =>
                    setDeleteConfirmProducto(
                      deleteConfirmProducto === producto.id ? null : producto.id
                    )
                  }
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  title="Eliminar producto"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* Inline delete confirm for product */}
            {deleteConfirmProducto === producto.id && (
              <div
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
              >
                <span style={{ color: "var(--danger)" }}>
                  ¿Eliminar producto y todas sus variantes?
                </span>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleDeleteProducto(producto.id)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ background: "var(--danger)", color: "#fff" }}
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setDeleteConfirmProducto(null)}
                    className="btn-secondary text-xs"
                    style={{ padding: "0.375rem 0.75rem" }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Variants section */}
            <div
              className="space-y-2 pt-3"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  Variantes
                </span>
                <button
                  onClick={() => openNewVariante(producto.id)}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors"
                  style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
                >
                  <Plus size={12} />
                  Agregar variante
                </button>
              </div>

              {producto.producto_variantes.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Sin variantes
                </p>
              ) : (
                <div className="space-y-1.5">
                  {producto.producto_variantes.map((variante) => (
                    <div key={variante.id}>
                      {deleteConfirmVariante === variante.id ? (
                        <div
                          className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs"
                          style={{
                            background: "rgba(239,68,68,0.08)",
                            border: "1px solid rgba(239,68,68,0.25)",
                          }}
                        >
                          <span style={{ color: "var(--danger)" }}>
                            ¿Eliminar variante &quot;{variante.nombre}&quot;?
                          </span>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => handleDeleteVariante(variante.id)}
                              className="font-semibold px-2.5 py-1 rounded-lg"
                              style={{ background: "var(--danger)", color: "#fff" }}
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setDeleteConfirmVariante(null)}
                              className="btn-secondary"
                              style={{ padding: "0.25rem 0.625rem", fontSize: "0.75rem" }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl"
                          style={{ background: "var(--bg-primary)" }}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
                            <span
                              className="text-sm font-medium"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {variante.nombre}
                            </span>
                            <span
                              className="text-sm font-semibold"
                              style={{ color: "var(--accent)" }}
                            >
                              {formatCLP(variante.precio_clp)}
                            </span>
                            {variante.stock !== null && (
                              <span
                                className="text-xs"
                                style={{ color: "var(--text-muted)" }}
                              >
                                Stock: {variante.stock}
                              </span>
                            )}
                            <span
                              className={`badge flex items-center gap-1 ${
                                variante.activo ? "badge-green" : "badge-gray"
                              }`}
                              style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem" }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
                                style={{
                                  background: variante.activo ? "#22c55e" : "#5A5A72",
                                }}
                              />
                              {variante.activo ? "Activo" : "Inactivo"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => openEditVariante(variante)}
                              className="p-1 rounded-lg transition-colors"
                              style={{ color: "var(--text-muted)" }}
                              title="Editar variante"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirmVariante(
                                  deleteConfirmVariante === variante.id
                                    ? null
                                    : variante.id
                                )
                              }
                              className="p-1 rounded-lg transition-colors"
                              style={{ color: "var(--text-muted)" }}
                              title="Eliminar variante"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Product Modal ──────────────────────────────────────────────────────── */}
      {showProductoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: "var(--bg-sidebar)", border: "1px solid var(--border)" }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {editingProducto ? "Editar producto" : "Nuevo producto"}
              </h3>
              <button
                onClick={() => setShowProductoModal(false)}
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
                  value={productoForm.nombre}
                  onChange={(e) =>
                    setProductoForm({ ...productoForm, nombre: e.target.value })
                  }
                  className="input-field"
                  placeholder="Ej: Impresión fotográfica"
                  autoFocus
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Descripción
                </label>
                <textarea
                  value={productoForm.descripcion}
                  onChange={(e) =>
                    setProductoForm({ ...productoForm, descripcion: e.target.value })
                  }
                  className="input-field h-20 resize-none"
                  placeholder="Descripción opcional del producto..."
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() =>
                    setProductoForm({ ...productoForm, activo: !productoForm.activo })
                  }
                  className="flex items-center gap-2.5 text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span
                    className="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200"
                    style={{
                      background: productoForm.activo ? "var(--accent)" : "var(--border)",
                    }}
                  >
                    <span
                      className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 mt-0.5"
                      style={{
                        transform: productoForm.activo
                          ? "translateX(18px)"
                          : "translateX(2px)",
                      }}
                    />
                  </span>
                  {productoForm.activo ? "Activo" : "Inactivo"}
                </button>
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
              className="flex items-center gap-2 px-5 py-4"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <button
                onClick={handleSaveProducto}
                disabled={loading}
                className="btn-primary"
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                Guardar
              </button>
              <button
                onClick={() => setShowProductoModal(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Variant Modal ──────────────────────────────────────────────────────── */}
      {showVarianteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: "var(--bg-sidebar)", border: "1px solid var(--border)" }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {editingVariante ? "Editar variante" : "Nueva variante"}
              </h3>
              <button
                onClick={() => setShowVarianteModal(false)}
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
                  value={varianteForm.nombre}
                  onChange={(e) =>
                    setVarianteForm({ ...varianteForm, nombre: e.target.value })
                  }
                  className="input-field"
                  placeholder="Ej: 10x15, 20x30, A4..."
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Precio CLP
                  </label>
                  <NumericInput
                    value={varianteForm.precio_clp}
                    onChange={(val) =>
                      setVarianteForm({ ...varianteForm, precio_clp: val })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Stock
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={varianteForm.stock}
                    onChange={(e) =>
                      setVarianteForm({
                        ...varianteForm,
                        stock: e.target.value.replace(/[^0-9]/g, ""),
                      })
                    }
                    className="input-field"
                    placeholder="Sin límite"
                  />
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() =>
                    setVarianteForm({ ...varianteForm, activo: !varianteForm.activo })
                  }
                  className="flex items-center gap-2.5 text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span
                    className="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200"
                    style={{
                      background: varianteForm.activo ? "var(--accent)" : "var(--border)",
                    }}
                  >
                    <span
                      className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 mt-0.5"
                      style={{
                        transform: varianteForm.activo
                          ? "translateX(18px)"
                          : "translateX(2px)",
                      }}
                    />
                  </span>
                  {varianteForm.activo ? "Activo" : "Inactivo"}
                </button>
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
              className="flex items-center gap-2 px-5 py-4"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <button
                onClick={handleSaveVariante}
                disabled={loading}
                className="btn-primary"
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                Guardar
              </button>
              <button
                onClick={() => setShowVarianteModal(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
