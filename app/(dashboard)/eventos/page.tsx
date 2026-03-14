import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Camera, Image, ChevronRight, Plus, ExternalLink } from "lucide-react";
import EventoCover from "@/components/eventos/EventoCover";

export default async function EventosPage() {
  const supabase = await createClient();

  const { data: eventos } = await supabase
    .from("eventos")
    .select("*")
    .order("created_at", { ascending: false });

  // Conteo de sub-eventos por evento
  const { data: subEventos } = await supabase
    .from("sub_eventos")
    .select("id, evento_id");

  const subCountMap: Record<string, number> = {};
  (subEventos ?? []).forEach((s) => {
    subCountMap[s.evento_id] = (subCountMap[s.evento_id] || 0) + 1;
  });

  // Conteo de fotos usando RPC (agrupa en BD, sin límite de filas)
  // Requiere haber ejecutado 004_evento_foto_totals.sql en Supabase
  const { data: fotoTotals } = await supabase.rpc("evento_foto_totals");

  const countMap: Record<string, number> = {};
  (fotoTotals ?? []).forEach((r: { evento_id: string; total: number }) => {
    countMap[r.evento_id] = Number(r.total);
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Camera size={22} style={{ color: "var(--accent)" }} />
            Eventos y Galerías
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {eventos?.length ?? 0} eventos publicados
          </p>
        </div>
        <Link
          href="/eventos/nuevo"
          className="btn-primary"
        >
          <Plus size={16} />
          Nuevo evento
        </Link>
      </div>

      {/* Events grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(eventos ?? []).map((evento) => (
          <div key={evento.id} className="card card-hover relative">
            {/* Clickable overlay that covers the whole card */}
            <Link
              href={`/eventos/${evento.id}`}
              className="absolute inset-0 z-0 rounded-xl"
              aria-label={`Ver evento ${evento.nombre}`}
            />

            {/* Cover */}
            <div
              className="w-full h-32 rounded-lg mb-3 flex items-center justify-center overflow-hidden pointer-events-none"
              style={{ background: "var(--bg-primary)" }}
            >
              <EventoCover
                publicId={evento.cover_public_id}
                storageProvider={evento.cover_storage_provider ?? null}
                nombre={evento.nombre}
              />
            </div>

            <div className="flex items-start justify-between pointer-events-none">
              <div className="flex-1 min-w-0">
                <h3
                  className="font-semibold text-sm truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {evento.nombre}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {formatDate(evento.created_at)}
                </p>
              </div>
              <ChevronRight size={16} style={{ color: "var(--text-muted)" }} className="shrink-0 mt-0.5" />
            </div>

            <div className="flex items-center gap-3 mt-3 pt-3 relative z-10" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex items-center gap-1.5 text-xs pointer-events-none" style={{ color: "var(--text-secondary)" }}>
                <Image size={13} />
                {countMap[evento.id] ?? 0} fotos
              </div>
              <div className="flex items-center gap-1.5 text-xs pointer-events-none" style={{ color: "var(--text-secondary)" }}>
                <Camera size={13} />
                {subCountMap[evento.id] ?? 0} sub-eventos
              </div>
              <a
                href={`https://www.fotosmony.cl/eventos/${evento.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto"
                title="Ver en fotosmony.cl"
              >
                <ExternalLink size={13} style={{ color: "var(--text-muted)" }} />
              </a>
            </div>
          </div>
        ))}
      </div>

      {!eventos?.length && (
        <div
          className="card text-center py-12"
          style={{ color: "var(--text-muted)" }}
        >
          <Camera size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">No hay eventos creados</p>
          <p className="text-sm mt-1">Crea el primer evento desde la web o usando el botón de arriba</p>
        </div>
      )}
    </div>
  );
}
