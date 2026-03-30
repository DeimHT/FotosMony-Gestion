-- ============================================================
-- RLS: eventos, sub_eventos, fotos — administradores del backoffice
-- Ejecutar en: Supabase > SQL Editor
-- Misma convención que agenda / ventas / clientes (role = 'admin' en profiles)
-- ============================================================

ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage eventos" ON public.eventos;
CREATE POLICY "Admins manage eventos" ON public.eventos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins manage sub_eventos" ON public.sub_eventos;
CREATE POLICY "Admins manage sub_eventos" ON public.sub_eventos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins manage fotos" ON public.fotos;
CREATE POLICY "Admins manage fotos" ON public.fotos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
