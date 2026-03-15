-- Agregar estado a ventas presenciales para manejar ventas al fiado
ALTER TABLE public.ventas_presenciales
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'pagado';

-- Actualizar registros existentes
UPDATE public.ventas_presenciales SET estado = 'pagado' WHERE estado IS NULL;
