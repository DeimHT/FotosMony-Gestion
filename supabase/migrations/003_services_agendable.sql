-- ============================================================
-- FotosMony Gestión — Atributo "agendable" en servicios
-- y liberación del CHECK en agenda.tipo
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- 1. Agregar columna agendable a services
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS agendable boolean NOT NULL DEFAULT false;

-- 2. Eliminar el CHECK constraint de agenda.tipo para admitir
--    cualquier texto (incluidos nombres de servicios personalizados)
ALTER TABLE public.agenda
  DROP CONSTRAINT IF EXISTS agenda_tipo_check;
