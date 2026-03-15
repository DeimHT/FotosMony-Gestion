-- ============================================================
-- FotosMony Gestión — Tabla de Sugerencias
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- Tabla para que los usuarios del sistema puedan enviar
-- sugerencias de mejora al desarrollador
CREATE TABLE IF NOT EXISTS public.sugerencias (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descripcion text NOT NULL,
  categoria text NOT NULL DEFAULT 'general'
    CHECK (categoria = ANY (ARRAY[
      'general'::text,
      'interfaz'::text,
      'funcionalidad'::text,
      'rendimiento'::text,
      'correccion'::text,
      'otro'::text
    ])),
  prioridad text NOT NULL DEFAULT 'media'
    CHECK (prioridad = ANY (ARRAY[
      'baja'::text,
      'media'::text,
      'alta'::text
    ])),
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado = ANY (ARRAY[
      'pendiente'::text,
      'en_revision'::text,
      'planificado'::text,
      'implementado'::text,
      'descartado'::text
    ])),
  autor_nombre text,
  notas_desarrollador text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT sugerencias_pkey PRIMARY KEY (id)
);

-- ============================================================
-- Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sugerencias_estado    ON public.sugerencias (estado);
CREATE INDEX IF NOT EXISTS idx_sugerencias_categoria ON public.sugerencias (categoria);
CREATE INDEX IF NOT EXISTS idx_sugerencias_created   ON public.sugerencias (created_at DESC);

-- ============================================================
-- Trigger para actualizar updated_at automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sugerencias_updated_at
  BEFORE UPDATE ON public.sugerencias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE public.sugerencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sugerencias" ON public.sugerencias
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- Fin del script
-- ============================================================
