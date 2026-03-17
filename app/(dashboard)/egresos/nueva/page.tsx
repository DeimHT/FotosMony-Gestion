"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft, TrendingDown, Loader2 } from "lucide-react";
import type { EgresoCategoria } from "@/types";

const CATEGORIAS: { value: EgresoCategoria; label: string }[] = [
  { value: "insumos", label: "Insumos" },
  { value: "arriendo", label: "Arriendo" },
  { value: "servicios", label: "Servicios" },
  { value: "transporte", label: "Transporte" },
  { value: "marketing", label: "Marketing" },
  { value: "otro", label: "Otro" },
];

const METODOS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
];

export default function NuevoEgresoPage() {
  const router = useRouter();
  const [concepto, setConcepto] = useState("");
  const [montoClp, setMontoClp] = useState("");
  const [categoria, setCategoria] = useState<EgresoCategoria>("otro");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const monto = parseInt(montoClp, 10);
    if (!concepto.trim()) {
      setError("Indica el concepto del gasto");
      return;
    }
    if (isNaN(monto) || monto <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { error: insertError } = await supabase.from("egresos").insert({
      concepto: concepto.trim(),
      monto_clp: monto,
      categoria,
      metodo_pago: metodoPago,
      notas: notas.trim() || null,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push("/egresos");
  }

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <Link
          href="/egresos"
          className="inline-flex items-center gap-1.5 text-sm mb-3 transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={15} />
          Volver a egresos
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <TrendingDown size={20} style={{ color: "var(--danger)" }} />
          Registrar egreso
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card space-y-3">
          <label className="block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Concepto *
          </label>
          <input
            type="text"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            className="input-field"
            placeholder="Ej: Insumos fotografía, Arriendo marzo, Combustible..."
            required
          />
        </div>

        <div className="card space-y-3">
          <label className="block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Monto (CLP) *
          </label>
          <input
            type="number"
            min={1}
            value={montoClp}
            onChange={(e) => setMontoClp(e.target.value)}
            className="input-field"
            placeholder="0"
          />
        </div>

        <div className="card space-y-3">
          <label className="block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Categoría
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIAS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategoria(c.value)}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: categoria === c.value ? "rgba(239,68,68,0.12)" : "var(--bg-primary)",
                  color: categoria === c.value ? "var(--danger)" : "var(--text-secondary)",
                  border: categoria === c.value ? "1px solid rgba(239,68,68,0.3)" : "1px solid var(--border)",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card space-y-3">
          <label className="block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
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

        <div className="card space-y-3">
          <label className="block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Notas (opcional)
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="input-field h-20 resize-none"
            placeholder="Detalles adicionales del gasto..."
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

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <TrendingDown size={16} />}
            Registrar egreso
          </button>
          <Link href="/egresos" className="btn-secondary">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
