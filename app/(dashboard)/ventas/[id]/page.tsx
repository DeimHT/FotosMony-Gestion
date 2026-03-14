import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatCLP, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, User, Mail, Package } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

const metodosLabels: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  debito: "Débito",
  credito: "Crédito",
};

export default async function VentaDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: venta } = await supabase
    .from("ventas_presenciales")
    .select("*")
    .eq("id", id)
    .single();

  if (!venta) notFound();

  const { data: items } = await supabase
    .from("venta_presencial_items")
    .select("*")
    .eq("venta_id", id);

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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <ShoppingBag size={20} style={{ color: "var(--accent)" }} />
              Venta Presencial
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {formatDateTime(venta.created_at)}
            </p>
          </div>
          <span className="badge badge-blue text-sm px-3 py-1">
            {metodosLabels[venta.metodo_pago] || venta.metodo_pago}
          </span>
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
          Cliente
        </h2>
        <div className="flex items-center gap-3">
          <User size={15} style={{ color: "var(--text-muted)" }} />
          <span style={{ color: venta.cliente_nombre ? "var(--text-primary)" : "var(--text-muted)" }}>
            {venta.cliente_nombre || "Sin nombre registrado"}
          </span>
        </div>
        {venta.cliente_email && (
          <div className="flex items-center gap-3">
            <Mail size={15} style={{ color: "var(--text-muted)" }} />
            <span style={{ color: "var(--text-secondary)" }}>{venta.cliente_email}</span>
          </div>
        )}
        {venta.notas && (
          <div
            className="text-sm px-3 py-2 rounded-lg mt-2"
            style={{ background: "var(--bg-primary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            {venta.notas}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          <Package size={15} className="inline mr-2" style={{ color: "var(--accent)" }} />
          Ítems
        </h2>
        <div className="space-y-2">
          {(items ?? []).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
            >
              <div>
                <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                  {item.servicio_nombre}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {item.cantidad}x {formatCLP(item.precio_unitario)}
                </p>
              </div>
              <span className="font-bold" style={{ color: "var(--accent)" }}>
                {formatCLP(item.subtotal)}
              </span>
            </div>
          ))}
        </div>
        <div
          className="flex justify-between items-center mt-4 pt-4 font-bold text-lg"
          style={{ borderTop: "1px solid var(--border)", color: "var(--accent)" }}
        >
          <span>TOTAL</span>
          <span>{formatCLP(venta.total_clp)}</span>
        </div>
      </div>
    </div>
  );
}
