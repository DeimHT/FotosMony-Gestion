"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Trash2 } from "lucide-react";

const CHUNK = 120;

function chunkIds(ids: string[]): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK) out.push(ids.slice(i, i + CHUNK));
  return out;
}

interface EventoEliminarPanelProps {
  eventoId: string;
  eventoNombre: string;
}

export default function EventoEliminarPanel({ eventoId, eventoNombre }: EventoEliminarPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEliminar() {
    const msg =
      `¿Eliminar definitivamente el evento «${eventoNombre}»?\n\n` +
      `Se borrarán todos los sub-eventos y las fotos de la galería. ` +
      `No debe haber fotos con ventas registradas. Esta acción no se puede deshacer.`;
    if (!confirm(msg)) return;

    setError(null);
    setLoading(true);
    const supabase = createClient();

    try {
      const { data: subs, error: subErr } = await supabase
        .from("sub_eventos")
        .select("id")
        .eq("evento_id", eventoId);

      if (subErr) {
        setError(subErr.message);
        setLoading(false);
        return;
      }

      const subIds = (subs ?? []).map((s) => s.id);
      let fotosQuery = supabase.from("fotos").select("id");
      if (subIds.length > 0) {
        fotosQuery = fotosQuery.or(`evento_id.eq.${eventoId},sub_evento_id.in.(${subIds.join(",")})`);
      } else {
        fotosQuery = fotosQuery.eq("evento_id", eventoId);
      }

      const { data: fotoRows, error: fotosErr } = await fotosQuery;

      if (fotosErr) {
        setError(fotosErr.message);
        setLoading(false);
        return;
      }

      const fotoIds = (fotoRows ?? []).map((r) => r.id).filter(Boolean);

      for (const batch of chunkIds(fotoIds)) {
        const { count, error: cntErr } = await supabase
          .from("order_items")
          .select("*", { count: "exact", head: true })
          .in("foto_id", batch);

        if (cntErr) {
          setError(cntErr.message);
          setLoading(false);
          return;
        }
        if (count && count > 0) {
          setError(
            "No se puede eliminar el evento: al menos una foto de esta galería ya fue vendida. " +
              "Conserva el evento por el historial de pedidos o contacta soporte si necesitas archivarlo."
          );
          setLoading(false);
          return;
        }
      }

      for (const batch of chunkIds(fotoIds)) {
        if (batch.length === 0) continue;
        const { error: delFErr } = await supabase.from("fotos").delete().in("id", batch);
        if (delFErr) {
          setError(delFErr.message);
          setLoading(false);
          return;
        }
      }

      const { error: delSubErr } = await supabase.from("sub_eventos").delete().eq("evento_id", eventoId);
      if (delSubErr) {
        setError(delSubErr.message);
        setLoading(false);
        return;
      }

      const { error: delEvErr } = await supabase.from("eventos").delete().eq("id", eventoId);
      if (delEvErr) {
        setError(delEvErr.message);
        setLoading(false);
        return;
      }

      router.push("/eventos");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar el evento");
      setLoading(false);
    }
  }

  return (
    <div
      className="card space-y-3"
      style={{ borderColor: "rgba(239,68,68,0.35)", borderWidth: 1, borderStyle: "solid" }}
    >
      <div>
        <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--danger)" }}>
          Zona de peligro
        </h2>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Eliminar el evento borra la galería, los sub-eventos y los registros de fotos en la base de datos. No está
          permitido si alguna foto tiene ventas asociadas.
        </p>
      </div>
      {error ? (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={loading}
        onClick={handleEliminar}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        style={{
          background: "rgba(239,68,68,0.15)",
          color: "var(--danger)",
          border: "1px solid rgba(239,68,68,0.35)",
        }}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        {loading ? "Eliminando…" : "Eliminar evento"}
      </button>
    </div>
  );
}
