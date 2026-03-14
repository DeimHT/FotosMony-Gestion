import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatCLP, formatDateTime } from "@/lib/utils";
import { Order } from "@/types";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Mail,
  Package,
  CreditCard,
  Calendar,
  Image,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

function StatusBadge({ status }: { status: Order["status"] }) {
  const map = {
    paid: { label: "Pagado", cls: "badge-green" },
    pending: { label: "Pendiente", cls: "badge-yellow" },
    failed: { label: "Fallido", cls: "badge-red" },
  };
  const s = map[status];
  return <span className={`badge ${s.cls} text-sm px-3 py-1`}>{s.label}</span>;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: "var(--bg-primary)", color: "var(--text-muted)" }}
      >
        <Icon size={15} />
      </div>
      <div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {label}
        </p>
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {value}
        </p>
      </div>
    </div>
  );
}

export default async function PedidoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (!order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id);

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back + Header */}
      <div>
        <Link
          href="/pedidos"
          className="inline-flex items-center gap-1.5 text-sm mb-3 transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={15} />
          Volver a pedidos
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              Pedido{" "}
              <span className="font-mono" style={{ color: "var(--accent)" }}>
                #{order.buy_order}
              </span>
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Creado el {formatDateTime(order.created_at)}
            </p>
          </div>
          <StatusBadge status={order.status as Order["status"]} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Order info */}
        <div className="card lg:col-span-2 space-y-4">
          <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
            Información del pedido
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow
              icon={User}
              label="Nombre"
              value={order.guest_name || "No especificado"}
            />
            <InfoRow
              icon={Mail}
              label="Email"
              value={order.guest_email || "No especificado"}
            />
            <InfoRow
              icon={CreditCard}
              label="Total"
              value={formatCLP(order.total_clp)}
            />
            <InfoRow
              icon={Calendar}
              label={order.paid_at ? "Pagado el" : "Creado el"}
              value={formatDateTime(order.paid_at || order.created_at)}
            />
          </div>

          {order.webpay_token && (
            <div
              className="rounded-lg px-3 py-2 mt-2"
              style={{ background: "var(--bg-primary)" }}
            >
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Token Webpay
              </p>
              <p
                className="text-xs font-mono mt-0.5 break-all"
                style={{ color: "var(--text-secondary)" }}
              >
                {order.webpay_token}
              </p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="card">
          <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Resumen
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--text-secondary)" }}>Fotos</span>
              <span style={{ color: "var(--text-primary)" }}>{items?.length ?? 0}</span>
            </div>
            <div
              className="flex justify-between text-sm font-bold pt-2"
              style={{ borderTop: "1px solid var(--border)", color: "var(--accent)" }}
            >
              <span>Total</span>
              <span>{formatCLP(order.total_clp)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="card">
        <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          <Package size={16} className="inline mr-2" style={{ color: "var(--accent)" }} />
          Fotos compradas ({items?.length ?? 0})
        </h2>

        {items?.length ? (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
              >
                {/* Thumbnail placeholder */}
                <div
                  className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "var(--bg-card)" }}
                >
                  <Image size={18} style={{ color: "var(--text-muted)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {item.evento_nombre || "Sin evento"}
                    {item.subevento_nombre && (
                      <span style={{ color: "var(--text-muted)" }}>
                        {" "}/ {item.subevento_nombre}
                      </span>
                    )}
                  </p>
                  <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                    {item.public_id || item.foto_id}
                  </p>
                </div>
                <span className="font-semibold text-sm shrink-0" style={{ color: "var(--accent)" }}>
                  {formatCLP(item.precio)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No hay ítems registrados
          </p>
        )}
      </div>
    </div>
  );
}
