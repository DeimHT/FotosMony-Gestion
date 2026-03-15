"use client";

import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const METODOS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
];

export default function MarcarPagadoButton({ ventaId }: { ventaId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [metodo, setMetodo] = useState("efectivo");
  const [showMetodo, setShowMetodo] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from("ventas_presenciales")
      .update({ estado: "pagado", metodo_pago: metodo })
      .eq("id", ventaId);
    setLoading(false);
    router.refresh();
  }

  if (!showMetodo) {
    return (
      <button
        onClick={() => setShowMetodo(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all"
        style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.3)" }}
      >
        <CheckCircle size={16} />
        Marcar como pagado
      </button>
    );
  }

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-xl"
      style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.25)" }}
    >
      <p className="text-sm font-medium" style={{ color: "#22C55E" }}>
        ¿Con qué método pagó?
      </p>
      <div className="grid grid-cols-2 gap-2">
        {METODOS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMetodo(m.value)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: metodo === m.value ? "rgba(34,197,94,0.2)" : "var(--bg-primary)",
              color: metodo === m.value ? "#22C55E" : "var(--text-secondary)",
              border: metodo === m.value ? "1px solid rgba(34,197,94,0.4)" : "1px solid var(--border)",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-sm"
          style={{ background: "#22C55E", color: "#0D0D14" }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
          Confirmar pago
        </button>
        <button
          onClick={() => setShowMetodo(false)}
          className="px-3 py-2 rounded-lg text-sm"
          style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
