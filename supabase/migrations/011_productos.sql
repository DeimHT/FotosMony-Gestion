-- ============================================================
-- Módulo de Productos con variantes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.productos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT productos_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.producto_variantes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  producto_id uuid NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  precio_clp integer NOT NULL CHECK (precio_clp >= 0),
  stock integer CHECK (stock >= 0),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT producto_variantes_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_producto_variantes_producto ON public.producto_variantes (producto_id);

ALTER TABLE public.venta_presencial_items
  ADD COLUMN IF NOT EXISTS variante_id uuid REFERENCES public.producto_variantes(id) ON DELETE SET NULL;

ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producto_variantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage productos" ON public.productos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins manage producto_variantes" ON public.producto_variantes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
