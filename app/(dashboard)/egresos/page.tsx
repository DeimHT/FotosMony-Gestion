import { createClient } from "@/lib/supabase/server";
import { formatCLP, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { TrendingDown, Plus, Wallet, PieChart } from "lucide-react";
import { startOfMonth } from "date-fns";

const CATEGORIAS_LABELS: Record<string, string> = {
  insumos: "Insumos",
  arriendo: "Arriendo",
  servicios: "Servicios",
  transporte: "Transporte",
  marketing: "Marketing",
  otro: "Otro",
};

const METODOS_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  debito: "Débito",
  credito: "Crédito",
};

export default async function EgresosPage() {
  const supabase = await createClient();
  const startMes = startOfMonth(new Date()).toISOString();

  const [{ data: egresos }, { data: egresosMes }] = await Promise.all([
    supabase
      .from("egresos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("egresos")
      .select("monto_clp")
      .gte("created_at", startMes),
  ]);

  const totalMes = (egresosMes ?? []).reduce((s, e) => s + e.monto_clp, 0);
  const totalHistorico = (egresos ?? []).reduce((s, e) => s + e.monto_clp, 0);

  const porCategoria: Record<string, number> = {};
  (egresos ?? []).forEach((e) => {
    porCategoria[e.categoria] = (porCategoria[e.categoria] || 0) + e.monto_clp;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <TrendingDown size={22} style={{ color: "var(--danger)" }} />
            Egresos
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Gastos del negocio
          </p>
        </div>
        <Link href="/egresos/nueva" className="btn-primary">
          <Plus size={16} />
          Nuevo egreso
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Egresos este mes",
            value: formatCLP(totalMes),
            icon: TrendingDown,
            color: "var(--danger)",
          },
          {
            label: "Cantidad este mes",
            value: String(egresosMes?.length ?? 0),
            icon: Wallet,
            color: "var(--info)",
          },
          {
            label: "Total histórico",
            value: formatCLP(totalHistorico),
            icon: PieChart,
            color: "var(--text-secondary)",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="card"
            style={{ borderLeft: `3px solid ${stat.color}` }}
          >
            <p className="text-xs font-medium uppercase" style={{ color: "var(--text-muted)" }}>
              {stat.label}
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="card lg:col-span-3 p-0 overflow-hidden">
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
              Historial de egresos
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.2)" }}>
                  {["Concepto", "Monto", "Categoría", "Método", "Fecha", ""].map((h) => (
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
                {(egresos ?? []).map((egreso) => (
                  <tr
                    key={egreso.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>
                      {egreso.concepto}
                    </td>
                    <td className="px-4 py-3 font-bold" style={{ color: "var(--danger)" }}>
                      {formatCLP(egreso.monto_clp)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge badge-blue">
                        {CATEGORIAS_LABELS[egreso.categoria] ?? egreso.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                      {METODOS_LABELS[egreso.metodo_pago] ?? egreso.metodo_pago}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                      {formatDateTime(egreso.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/egresos/${egreso.id}`}
                        className="text-xs font-medium"
                        style={{ color: "var(--accent)" }}
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!egresos?.length && (
              <div className="text-center py-10" style={{ color: "var(--text-muted)" }}>
                <TrendingDown size={32} className="mx-auto mb-2 opacity-20" />
                <p>No hay egresos registrados</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Por categoría
          </h2>
          <div className="space-y-3">
            {Object.entries(porCategoria).map(([cat, monto]) => {
              const pct = totalHistorico > 0 ? Math.round((monto / totalHistorico) * 100) : 0;
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: "var(--text-secondary)" }}>
                      {CATEGORIAS_LABELS[cat] ?? cat}
                    </span>
                    <span style={{ color: "var(--text-primary)" }}>{formatCLP(monto)}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "var(--border)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: "var(--danger)" }}
                    />
                  </div>
                </div>
              );
            })}
            {Object.keys(porCategoria).length === 0 && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Sin datos aún
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
