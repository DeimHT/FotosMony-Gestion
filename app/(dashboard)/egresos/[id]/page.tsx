import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatCLP, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, TrendingDown, Tag, CreditCard, FileText } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

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

export default async function EgresoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: egreso } = await supabase
    .from("egresos")
    .select("*")
    .eq("id", id)
    .single();

  if (!egreso) notFound();

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <Link
          href="/egresos"
          className="inline-flex items-center gap-1.5 text-sm mb-3 transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={15} />
          Volver a egresos
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <TrendingDown size={20} style={{ color: "var(--danger)" }} />
              {egreso.concepto}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {formatDateTime(egreso.created_at)}
            </p>
          </div>
          <span className="text-2xl font-bold" style={{ color: "var(--danger)" }}>
            {formatCLP(egreso.monto_clp)}
          </span>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center gap-3">
          <Tag size={16} style={{ color: "var(--text-muted)" }} />
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Categoría
            </p>
            <span className="badge badge-blue">
              {CATEGORIAS_LABELS[egreso.categoria] ?? egreso.categoria}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CreditCard size={16} style={{ color: "var(--text-muted)" }} />
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Método de pago
            </p>
            <span style={{ color: "var(--text-primary)" }}>
              {METODOS_LABELS[egreso.metodo_pago] ?? egreso.metodo_pago}
            </span>
          </div>
        </div>
        {egreso.notas && (
          <div className="pt-2" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex items-start gap-3">
              <FileText size={16} className="shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }} />
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                  Notas
                </p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {egreso.notas}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
