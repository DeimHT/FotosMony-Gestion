-- ============================================================
-- FotosMony Gestión — Tablas nuevas para el sistema interno
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- 1. Agenda de sesiones y eventos presenciales
CREATE TABLE IF NOT EXISTS public.agenda (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  tipo text NOT NULL DEFAULT 'sesion'
    CHECK (tipo = ANY (ARRAY['sesion'::text, 'evento'::text, 'licenciatura'::text, 'otro'::text])),
  cliente_nombre text,
  cliente_email text,
  fecha_inicio timestamptz NOT NULL,
  fecha_fin timestamptz,
  notas text,
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado = ANY (ARRAY['pendiente'::text, 'confirmado'::text, 'cancelado'::text, 'completado'::text])),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT agenda_pkey PRIMARY KEY (id)
);

-- 2. Ventas presenciales (impresiones, carnet, licenciaturas, etc.)
CREATE TABLE IF NOT EXISTS public.ventas_presenciales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cliente_nombre text,
  cliente_email text,
  total_clp integer NOT NULL CHECK (total_clp >= 0),
  metodo_pago text NOT NULL DEFAULT 'efectivo'
    CHECK (metodo_pago = ANY (ARRAY['efectivo'::text, 'transferencia'::text, 'debito'::text, 'credito'::text])),
  notas text,
  agenda_id uuid REFERENCES public.agenda(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT ventas_presenciales_pkey PRIMARY KEY (id)
);

-- 3. Ítems de cada venta presencial
CREATE TABLE IF NOT EXISTS public.venta_presencial_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  venta_id uuid NOT NULL REFERENCES public.ventas_presenciales(id) ON DELETE CASCADE,
  servicio_nombre text NOT NULL,
  cantidad integer NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  precio_unitario integer NOT NULL CHECK (precio_unitario >= 0),
  subtotal integer NOT NULL CHECK (subtotal >= 0),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT venta_presencial_items_pkey PRIMARY KEY (id)
);

-- ============================================================
-- Índices para mejor performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_agenda_fecha_inicio ON public.agenda (fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_agenda_estado ON public.agenda (estado);
CREATE INDEX IF NOT EXISTS idx_ventas_presenciales_created ON public.ventas_presenciales (created_at);
CREATE INDEX IF NOT EXISTS idx_venta_items_venta_id ON public.venta_presencial_items (venta_id);

-- ============================================================
-- Row Level Security (RLS)
-- Igual que el resto de las tablas del proyecto
-- ============================================================
ALTER TABLE public.agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_presenciales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venta_presencial_items ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden leer/escribir estas tablas
-- (El sistema de gestión usa la anon key con verificación de rol en middleware)
CREATE POLICY "Admins manage agenda" ON public.agenda
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins manage ventas_presenciales" ON public.ventas_presenciales
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins manage venta_presencial_items" ON public.venta_presencial_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- Fin del script
-- ============================================================
