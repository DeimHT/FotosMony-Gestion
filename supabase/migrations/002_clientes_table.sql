-- ============================================================
-- FotosMony Gestión — Tabla de clientes presenciales/generales
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clientes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  email text,
  telefono text,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clientes_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON public.clientes (nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_email  ON public.clientes (email);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage clientes" ON public.clientes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
