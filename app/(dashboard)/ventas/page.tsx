import { createClient } from "@/lib/supabase/server";
import { formatCLP, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { ShoppingBag, Plus, TrendingUp, AlertCircle } from "lucide-react";
import { startOfMonth } from "date-fns";

export default async function VentasPage() {
  const supabase = await createClient();
  const startMes = startOfMonth(new Date()).toISOString();

  const [{ data: ventas }, { data: ventasMes }] = await Promise.all([
    supabase
      .from("ventas_presenciales")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("ventas_presenciales")
      .select("total_clp")
      .gte("created_at", startMes),
  ]);

  const totalMes = (ventasMes ?? []).reduce((s, v) => s + v.total_clp, 0);
  const totalHistorico = (ventas ?? []).reduce((s, v) => s + v.total_clp, 0);
  const ventasFiado = (ventas ?? []).filter((v) => v.estado === "fiado");
  const totalFiado = ventasFiado.reduce((s, v) => s + v.total_clp, 0);

  const metodoPago: Record<string, number> = {};
  (ventas ?? []).forEach((v) => {
    if (v.estado !== "fiado") metodoPago[v.metodo_pago] = (metodoPago[v.metodo_pago] || 0) + 1;
  });

  const metodosLabels: Record<string, string> = {
    efectivo: "Efectivo",
    transferencia: "Transferencia",
    debito: "Débito",
    credito: "Crédito",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <ShoppingBag size={22} style={{ color: "var(--accent)" }} />
            Ventas Presenciales
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {ventas?.length ?? 0} ventas registradas
          </p>
        </div>
        <Link href="/ventas/nueva" className="btn-primary">
          <Plus size={16} />
          Nueva venta
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Ingresos este mes",
            value: formatCLP(totalMes),
            icon: TrendingUp,
            color: "var(--accent)",
          },
          {
            label: "Ventas este mes",
            value: String(ventasMes?.length ?? 0),
            icon: ShoppingBag,
            color: "var(--info)",
          },
          {
            label: "Total histórico",
            value: formatCLP(totalHistorico),
            icon: ShoppingBag,
            color: "var(--success)",
          },
          {
            label: "Deudas al fiado",
            value: ventasFiado.length > 0 ? `${formatCLP(totalFiado)} (${ventasFiado.length})` : "Sin deudas",
            icon: AlertCircle,
            color: ventasFiado.length > 0 ? "var(--danger)" : "var(--text-muted)",
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
        {/* Ventas table */}
        <div className="card lg:col-span-3 p-0 overflow-hidden">
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
              Historial de ventas
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.2)" }}>
                  {["Cliente", "Total", "Estado", "Método de pago", "Fecha", ""].map((h) => (
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
                {(ventas ?? []).map((venta) => (
                  <tr
                    key={venta.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>
                      {venta.cliente_nombre || (
                        <span style={{ color: "var(--text-muted)" }}>Sin nombre</span>
                      )}
                      {venta.cliente_email && (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {venta.cliente_email}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold" style={{ color: venta.estado === "fiado" ? "var(--danger)" : "var(--accent)" }}>
                      {formatCLP(venta.total_clp)}
                    </td>
                    <td className="px-4 py-3">
                      {venta.estado === "fiado" ? (
                        <span className="badge badge-red flex items-center gap-1 w-fit">
                          <AlertCircle size={10} />
                          Fiado
                        </span>
                      ) : (
                        <span className="badge badge-green">Pagado</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {venta.estado !== "fiado" && (
                        <span className="badge badge-blue">
                          {metodosLabels[venta.metodo_pago] || venta.metodo_pago}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                      {formatDateTime(venta.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/ventas/${venta.id}`}
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
            {!ventas?.length && (
              <div className="text-center py-10" style={{ color: "var(--text-muted)" }}>
                <ShoppingBag size={32} className="mx-auto mb-2 opacity-20" />
                <p>No hay ventas presenciales registradas</p>
              </div>
            )}
          </div>
        </div>

        {/* Methods chart */}
        <div className="card">
          <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Métodos de pago
          </h2>
          <div className="space-y-3">
            {Object.entries(metodoPago).map(([metodo, count]) => {
              const pct = Math.round((count / (ventas?.length || 1)) * 100);
              return (
                <div key={metodo}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: "var(--text-secondary)" }}>
                      {metodosLabels[metodo] || metodo}
                    </span>
                    <span style={{ color: "var(--text-primary)" }}>{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "var(--border)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: "var(--accent)" }}
                    />
                  </div>
                </div>
              );
            })}
            {Object.keys(metodoPago).length === 0 && (
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
