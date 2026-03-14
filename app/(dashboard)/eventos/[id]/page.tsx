import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatDate, formatCLP } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Image,
  ExternalLink,
  DollarSign,
  ShoppingCart,
  Layers,
} from "lucide-react";
import FotoThumb from "@/components/eventos/FotoThumb";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sub?: string; page?: string }>;
}

export default async function EventoDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const selectedSub = sp.sub || "all";
  const page = parseInt(sp.page || "1");
  const perPage = 24;

  const supabase = await createClient();

  const { data: evento } = await supabase
    .from("eventos")
    .select("*")
    .eq("id", id)
    .single();

  if (!evento) notFound();

  const { data: subEventos } = await supabase
    .from("sub_eventos")
    .select("*")
    .eq("evento_id", id)
    .order("nombre");

  const subIds = (subEventos ?? []).map((s) => s.id);

  // Photos query: fotos con evento_id directo O con sub_evento_id de este evento
  // Usamos OR para cubrir ambos casos (fotos subidas con o sin evento_id)
  let fotosQuery = supabase
    .from("fotos")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (selectedSub !== "all") {
    // Filtrar por sub-evento específico
    fotosQuery = fotosQuery.eq("sub_evento_id", selectedSub);
  } else if (subIds.length > 0) {
    // Todas las fotos del evento: directo por evento_id o por cualquier sub_evento_id
    fotosQuery = fotosQuery.or(
      `evento_id.eq.${id},sub_evento_id.in.(${subIds.join(",")})`
    );
  } else {
    fotosQuery = fotosQuery.eq("evento_id", id);
  }

  const { data: fotos, count: totalFotos } = await fotosQuery;
  const totalPages = Math.ceil((totalFotos ?? 0) / perPage);

  // Get overall stats: todas las fotos del evento (para ingresos)
  let allFotosQuery = supabase
    .from("fotos")
    .select("id, precio");

  if (subIds.length > 0) {
    allFotosQuery = allFotosQuery.or(
      `evento_id.eq.${id},sub_evento_id.in.(${subIds.join(",")})`
    );
  } else {
    allFotosQuery = allFotosQuery.eq("evento_id", id);
  }

  const { data: allEventFotos } = await allFotosQuery;

  const fotoIds = (allEventFotos ?? []).map((f) => f.id);
  const { data: allSoldItems } = fotoIds.length
    ? await supabase
        .from("order_items")
        .select("precio, order_id, foto_id")
        .in("foto_id", fotoIds)
    : { data: [] };

  const ingresosTotales = (allSoldItems ?? []).reduce((s, i) => s + (i.precio ?? 0), 0);
  const fotosVendidas = new Set((allSoldItems ?? []).map((i) => i.foto_id)).size;

  return (
    <div className="space-y-5">
      {/* Back */}
      <Link
          href="/eventos"
        className="inline-flex items-center gap-1.5 text-sm transition-colors"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={15} />
        Volver a eventos
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            {evento.nombre}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {formatDate(evento.created_at)}
            </p>
            <a
              href={`https://www.fotosmony.cl/eventos/${evento.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs"
              style={{ color: "var(--accent)" }}
            >
              <ExternalLink size={11} />
              Ver en web
            </a>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: Image,
            label: "Total fotos",
            value: totalFotos ?? 0,
            color: "var(--accent)",
          },
          {
            icon: ShoppingCart,
            label: "Fotos vendidas",
            value: fotosVendidas,
            color: "var(--info)",
          },
          {
            icon: DollarSign,
            label: "Ingresos totales",
            value: formatCLP(ingresosTotales),
            color: "var(--success)",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="card"
            style={{ borderLeft: `3px solid ${stat.color}` }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: `${stat.color}20`, color: stat.color }}
              >
                <stat.icon size={18} />
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {stat.label}
                </p>
                <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sub-events filter */}
      {subEventos && subEventos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/eventos/${id}?sub=all`}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: selectedSub === "all" ? "var(--accent-muted)" : "var(--bg-card)",
              color: selectedSub === "all" ? "var(--accent)" : "var(--text-secondary)",
              border: selectedSub === "all" ? "1px solid rgba(232,184,75,0.3)" : "1px solid var(--border)",
            }}
          >
            <Layers size={12} className="inline mr-1.5" />
            Todos
          </Link>
          {subEventos.map((sub) => (
            <Link
              key={sub.id}
              href={`/eventos/${id}?sub=${sub.id}`}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: selectedSub === sub.id ? "var(--accent-muted)" : "var(--bg-card)",
                color: selectedSub === sub.id ? "var(--accent)" : "var(--text-secondary)",
                border: selectedSub === sub.id ? "1px solid rgba(232,184,75,0.3)" : "1px solid var(--border)",
              }}
            >
              {sub.nombre}
            </Link>
          ))}
        </div>
      )}

      {/* Photo grid */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
            Fotos ({totalFotos ?? 0})
          </h2>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
              Página {page} de {totalPages}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {(fotos ?? []).map((foto) => (
            <FotoThumb
              key={foto.id}
              publicId={foto.public_id}
              storageProvider={foto.storage_provider}
              nombreArchivo={foto.nombre_archivo}
              precio={foto.precio}
            />
          ))}
        </div>

        {!fotos?.length && (
          <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>
            <Image size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">No hay fotos en este evento</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            {page > 1 && (
              <Link
                href={`/eventos/${id}?sub=${selectedSub}&page=${page - 1}`}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                ← Anterior
              </Link>
            )}
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/eventos/${id}?sub=${selectedSub}&page=${page + 1}`}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Siguiente →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
