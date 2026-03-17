import { createClient } from "@/lib/supabase/server";
import {
  DollarSign,
  ShoppingCart,
  ShoppingBag,
  TrendingDown,
  MessageSquare,
  Camera,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Scale,
} from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import SalesChartWrapper from "@/components/dashboard/SalesChartWrapper";
import { formatCLP, formatDateTime } from "@/lib/utils";
import { Order, SalesDataPoint } from "@/types";
import { startOfMonth, subMonths, format, eachWeekOfInterval, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

function OrderStatusBadge({ status }: { status: Order["status"] }) {
  const map = {
    paid: { label: "Pagado", class: "badge-green" },
    pending: { label: "Pendiente", class: "badge-yellow" },
    failed: { label: "Fallido", class: "badge-red" },
  };
  const s = map[status];
  return <span className={`badge ${s.class}`}>{s.label}</span>;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const now = new Date();
  const startThisMonth = startOfMonth(now).toISOString();
  const startLastMonth = startOfMonth(subMonths(now, 1)).toISOString();
  const endLastMonth = startOfMonth(now).toISOString();

  // ── Parallel fetches ──
  const [
    { data: ordersThisMonth },
    { data: ordersLastMonth },
    { count: pendingOrders },
    { data: ventasThisMonth },
    { data: ventasLastMonth },
    { data: egresosThisMonth },
    { data: egresosLastMonth },
    { count: unreadMessages },
    { count: totalEventos },
    { count: totalClientes },
    { data: recentOrders },
    { data: salesWeekly },
    { data: ventasWeekly },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("total_clp")
      .eq("status", "paid")
      .gte("paid_at", startThisMonth),
    supabase
      .from("orders")
      .select("total_clp")
      .eq("status", "paid")
      .gte("paid_at", startLastMonth)
      .lt("paid_at", endLastMonth),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("ventas_presenciales")
      .select("total_clp")
      .gte("created_at", startThisMonth),
    supabase
      .from("ventas_presenciales")
      .select("total_clp")
      .gte("created_at", startLastMonth)
      .lt("created_at", endLastMonth),
    supabase
      .from("egresos")
      .select("monto_clp")
      .gte("created_at", startThisMonth),
    supabase
      .from("egresos")
      .select("monto_clp")
      .gte("created_at", startLastMonth)
      .lt("created_at", endLastMonth),
    supabase
      .from("contact_messages")
      .select("*", { count: "exact", head: true })
      .eq("leido", false),
    supabase.from("eventos").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("id, buy_order, guest_email, guest_name, total_clp, status, created_at, paid_at")
      .order("created_at", { ascending: false })
      .limit(7),
    supabase
      .from("orders")
      .select("paid_at, total_clp")
      .eq("status", "paid")
      .gte("paid_at", startThisMonth),
    supabase
      .from("ventas_presenciales")
      .select("created_at, total_clp")
      .gte("created_at", startThisMonth),
  ]);

  // ── Compute stats ──
  const ingresosOnlineMes = (ordersThisMonth ?? []).reduce((s, o) => s + o.total_clp, 0);
  const ingresosPresencialMes = (ventasThisMonth ?? []).reduce((s, o) => s + o.total_clp, 0);
  const ingresosTotalMes = ingresosOnlineMes + ingresosPresencialMes;

  const ingresosOnlinePrev = (ordersLastMonth ?? []).reduce((s, o) => s + o.total_clp, 0);
  const ingresosPresencialPrev = (ventasLastMonth ?? []).reduce((s, o) => s + o.total_clp, 0);
  const ingresosPrevMes = ingresosOnlinePrev + ingresosPresencialPrev;

  const trendIngresos =
    ingresosPrevMes > 0
      ? Math.round(((ingresosTotalMes - ingresosPrevMes) / ingresosPrevMes) * 100)
      : 0;

  const egresosMes = (egresosThisMonth ?? []).reduce((s, e) => s + e.monto_clp, 0);
  const egresosPrevMes = (egresosLastMonth ?? []).reduce((s, e) => s + e.monto_clp, 0);
  const trendEgresos =
    egresosPrevMes > 0
      ? Math.round(((egresosMes - egresosPrevMes) / egresosPrevMes) * 100)
      : 0;
  const balanceMes = ingresosTotalMes - egresosMes;

  // ── Build weekly chart data ──
  const weeks = eachWeekOfInterval({
    start: startOfMonth(now),
    end: endOfMonth(now),
  });

  const chartData: SalesDataPoint[] = weeks.map((weekStart) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const onlineWeek = (salesWeekly ?? [])
      .filter((o) => {
        const d = new Date(o.paid_at!);
        return d >= weekStart && d < weekEnd;
      })
      .reduce((s: number, o: { total_clp: number }) => s + o.total_clp, 0);

    const presencialWeek = (ventasWeekly ?? [])
      .filter((o) => {
        const d = new Date(o.created_at);
        return d >= weekStart && d < weekEnd;
      })
      .reduce((s: number, o: { total_clp: number }) => s + o.total_clp, 0);

    return {
      fecha: format(weekStart, "d MMM", { locale: es }),
      online: onlineWeek,
      presencial: presencialWeek,
    };
  });

  const stats = [
    {
      title: "Ingresos del mes",
      value: formatCLP(ingresosTotalMes),
      subtitle: `Online ${formatCLP(ingresosOnlineMes)} + Presencial ${formatCLP(ingresosPresencialMes)}`,
      icon: DollarSign,
      trend: trendIngresos,
      trendLabel: "vs mes anterior",
      color: "var(--accent)",
    },
    {
      title: "Egresos del mes",
      value: formatCLP(egresosMes),
      subtitle: `${(egresosThisMonth ?? []).length} gastos registrados`,
      icon: TrendingDown,
      trend: egresosPrevMes > 0 ? trendEgresos : undefined,
      trendLabel: "vs mes anterior",
      color: "var(--danger)",
    },
    {
      title: "Balance del mes",
      value: formatCLP(balanceMes),
      subtitle: balanceMes >= 0 ? "Ingresos − Egresos" : "Pérdida",
      icon: Scale,
      color: balanceMes >= 0 ? "var(--success)" : "var(--danger)",
    },
    {
      title: "Pedidos pendientes",
      value: String(pendingOrders ?? 0),
      subtitle: "Requieren atención",
      icon: ShoppingCart,
      color: "var(--warning)",
    },
    {
      title: "Ventas presenciales",
      value: String((ventasThisMonth ?? []).length),
      subtitle: formatCLP(ingresosPresencialMes) + " este mes",
      icon: ShoppingBag,
      color: "var(--info)",
    },
    {
      title: "Mensajes nuevos",
      value: String(unreadMessages ?? 0),
      subtitle: "Sin leer",
      icon: MessageSquare,
      color: "#A855F7",
    },
    {
      title: "Eventos activos",
      value: String(totalEventos ?? 0),
      subtitle: "Galerías publicadas",
      icon: Camera,
      color: "var(--success)",
    },
    {
      title: "Clientes",
      value: String(totalClientes ?? 0),
      subtitle: "Registrados en la web",
      icon: Users,
      color: "#EC4899",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Dashboard
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
          Resumen general de FotosMony —{" "}
          {format(now, "MMMM yyyy", { locale: es }).replace(/^\w/, (c) => c.toUpperCase())}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map((s) => (
          <StatsCard
            key={s.title}
            title={s.title}
            value={s.value}
            subtitle={s.subtitle}
            icon={s.icon}
            trend={s.trend}
            trendLabel={s.trendLabel}
            accentColor={s.color}
          />
        ))}
      </div>

      {/* Charts + Recent orders */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Sales chart */}
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
              Ventas del mes
            </h2>
            <span className="badge badge-gold text-xs">
              {format(now, "MMMM", { locale: es }).replace(/^\w/, (c) => c.toUpperCase())}
            </span>
          </div>
          <SalesChartWrapper data={chartData} />
        </div>

        {/* Quick stats */}
        <div className="card">
          <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Distribución de ingresos
          </h2>
          <div className="space-y-3">
            {[
              {
                label: "Ventas online",
                amount: ingresosOnlineMes,
                total: ingresosTotalMes,
                color: "var(--accent)",
              },
              {
                label: "Ventas presenciales",
                amount: ingresosPresencialMes,
                total: ingresosTotalMes,
                color: "var(--info)",
              },
              {
                label: "Egresos",
                amount: egresosMes,
                total: Math.max(ingresosTotalMes, egresosMes) || 1,
                color: "var(--danger)",
              },
            ].map((item) => {
              const pct =
                item.total > 0 ? Math.round((item.amount / item.total) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: "var(--text-secondary)" }}>{item.label}</span>
                    <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                      {pct}%
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: "var(--border)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: item.color }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {formatCLP(item.amount)}
                  </p>
                </div>
              );
            })}
          </div>

          <div
            className="mt-4 pt-4 space-y-2"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              ACCIONES RÁPIDAS
            </p>
            <Link
              href="/ventas/nueva"
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors"
              style={{
                background: "var(--accent-muted)",
                color: "var(--accent)",
                border: "1px solid rgba(232,184,75,0.2)",
              }}
            >
              <ShoppingBag size={14} />
              Registrar venta presencial
            </Link>
            <Link
              href="/egresos/nueva"
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors"
              style={{
                background: "rgba(239,68,68,0.08)",
                color: "var(--danger)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <TrendingDown size={14} />
              Registrar egreso
            </Link>
            <Link
              href="/agenda"
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors"
              style={{
                background: "rgba(59,130,246,0.1)",
                color: "var(--info)",
                border: "1px solid rgba(59,130,246,0.2)",
              }}
            >
              <Camera size={14} />
              Nueva sesión en agenda
            </Link>
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
            Pedidos recientes
          </h2>
          <Link
            href="/pedidos"
            className="text-xs font-medium"
            style={{ color: "var(--accent)" }}
          >
            Ver todos →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Pedido", "Cliente", "Total", "Estado", "Fecha"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(recentOrders ?? []).map((order) => (
                <tr
                  key={order.id}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/pedidos/${order.id}`}
                      className="font-mono text-xs"
                      style={{ color: "var(--accent)" }}
                    >
                      #{order.buy_order.slice(-8)}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5" style={{ color: "var(--text-secondary)" }}>
                    {order.guest_name || order.guest_email || "—"}
                  </td>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: "var(--text-primary)" }}>
                    {formatCLP(order.total_clp)}
                  </td>
                  <td className="px-3 py-2.5">
                    <OrderStatusBadge status={order.status as Order["status"]} />
                  </td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatDateTime(order.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!recentOrders?.length && (
            <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>
              No hay pedidos recientes
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
