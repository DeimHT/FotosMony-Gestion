-- ============================================================
-- Módulo de Egresos (gastos del negocio)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.egresos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  concepto text NOT NULL,
  monto_clp integer NOT NULL CHECK (monto_clp > 0),
  categoria text DEFAULT 'otro'
    CHECK (categoria = ANY (ARRAY['insumos'::text, 'arriendo'::text, 'servicios'::text, 'transporte'::text, 'marketing'::text, 'otro'::text])),
  metodo_pago text NOT NULL DEFAULT 'efectivo'
    CHECK (metodo_pago = ANY (ARRAY['efectivo'::text, 'transferencia'::text, 'debito'::text, 'credito'::text])),
  notas text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT egresos_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_egresos_created ON public.egresos (created_at);
CREATE INDEX IF NOT EXISTS idx_egresos_categoria ON public.egresos (categoria);

ALTER TABLE public.egresos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage egresos" ON public.egresos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
