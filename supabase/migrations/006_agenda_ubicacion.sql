-- Agregar columna ubicacion a la tabla agenda
ALTER TABLE public.agenda
  ADD COLUMN IF NOT EXISTS ubicacion text;
