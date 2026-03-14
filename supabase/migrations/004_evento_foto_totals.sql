-- ============================================================
-- FotosMony Gestión — Función para contar fotos por evento
-- Suma fotos vinculadas directo al evento + fotos de sus sub-eventos
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.evento_foto_totals()
RETURNS TABLE(evento_id uuid, total bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT ev_id, SUM(cnt)::bigint AS total
  FROM (
    -- Fotos vinculadas directamente al evento
    SELECT evento_id AS ev_id, COUNT(*)::bigint AS cnt
    FROM public.fotos
    WHERE evento_id IS NOT NULL
    GROUP BY evento_id

    UNION ALL

    -- Fotos vinculadas solo a un sub-evento (evento_id NULL)
    SELECT se.evento_id AS ev_id, COUNT(*)::bigint AS cnt
    FROM public.fotos f
    JOIN public.sub_eventos se ON se.id = f.sub_evento_id
    WHERE f.evento_id IS NULL
    GROUP BY se.evento_id
  ) combined
  GROUP BY ev_id
$$;
