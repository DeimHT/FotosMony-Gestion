import { createClient } from "@/lib/supabase/server";
import { formatCLP, formatDateTime } from "@/lib/utils";
import { Order } from "@/types";
import Link from "next/link";
import { ShoppingCart, Search } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ estado?: string; buscar?: string }>;
}

function StatusBadge({ status }: { status: Order["status"] }) {
  const map = {
    paid: { label: "Pagado", cls: "badge-green" },
    pending: { label: "Pendiente", cls: "badge-yellow" },
    failed: { label: "Fallido", cls: "badge-red" },
  };
  const s = map[status];
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export default async function PedidosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const estado = params.estado || "all";
  const buscar = params.buscar || "";

  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (estado !== "all") {
    query = query.eq("status", estado);
  }

  const { data: orders } = await query;

  // Client-side filter for search
  const filtered = (orders ?? []).filter((o) => {
    if (!buscar) return true;
    const term = buscar.toLowerCase();
    return (
      o.buy_order.toLowerCase().includes(term) ||
      o.guest_email?.toLowerCase().includes(term) ||
      o.guest_name?.toLowerCase().includes(term)
    );
  });

  const counts = {
    all: orders?.length ?? 0,
    paid: orders?.filter((o) => o.status === "paid").length ?? 0,
    pending: orders?.filter((o) => o.status === "pending").length ?? 0,
    failed: orders?.filter((o) => o.status === "failed").length ?? 0,
  };

  const filters = [
    { value: "all", label: "Todos", count: counts.all },
    { value: "paid", label: "Pagados", count: counts.paid },
    { value: "pending", label: "Pendientes", count: counts.pending },
    { value: "failed", label: "Fallidos", count: counts.failed },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <ShoppingCart size={22} style={{ color: "var(--accent)" }} />
            Pedidos Online
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {filtered.length} pedido{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <Link
            key={f.value}
            href={`/pedidos?estado=${f.value}${buscar ? `&buscar=${buscar}` : ""}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: estado === f.value ? "var(--accent-muted)" : "var(--bg-card)",
              color: estado === f.value ? "var(--accent)" : "var(--text-secondary)",
              border: estado === f.value ? "1px solid rgba(232,184,75,0.3)" : "1px solid var(--border)",
            }}
          >
            {f.label}
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-bold"
              style={{
                background: estado === f.value ? "var(--accent)" : "var(--border)",
                color: estado === f.value ? "#0D0D14" : "var(--text-muted)",
              }}
            >
              {f.count}
            </span>
          </Link>
        ))}

        {/* Search */}
        <form
          method="get"
          action="/pedidos"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg ml-auto"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <input type="hidden" name="estado" value={estado} />
          <Search size={14} style={{ color: "var(--text-muted)" }} />
          <input
            name="buscar"
            defaultValue={buscar}
            placeholder="Buscar por email, nombre..."
            className="bg-transparent text-sm outline-none w-52"
            style={{ color: "var(--text-primary)" }}
          />
        </form>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.2)" }}>
                {["Pedido", "Cliente", "Email", "Total", "Estado", "Fecha", ""].map((h) => (
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
              {filtered.map((order) => (
                <tr
                  key={order.id}
                  className="transition-colors hover:bg-[var(--bg-card-hover)]"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs" style={{ color: "var(--accent)" }}>
                      #{order.buy_order.slice(-10)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>
                    {order.guest_name || "—"}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                    {order.guest_email || "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>
                    {formatCLP(order.total_clp)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status as Order["status"]} />
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatDateTime(order.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/pedidos/${order.id}`}
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

          {filtered.length === 0 && (
            <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
              <ShoppingCart size={32} className="mx-auto mb-3 opacity-30" />
              <p>No se encontraron pedidos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
