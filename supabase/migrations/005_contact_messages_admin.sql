-- ============================================================
-- FotosMony Gestión — Acceso admin a contact_messages
-- y columna leido si no existe
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- 1. Agregar columna leido si no existe
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS leido boolean NOT NULL DEFAULT false;

-- 2. Política: admin puede leer todos los mensajes
DROP POLICY IF EXISTS "Admin can read contact_messages" ON public.contact_messages;
CREATE POLICY "Admin can read contact_messages"
  ON public.contact_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 3. Política: admin puede actualizar mensajes (marcar leído/no leído)
DROP POLICY IF EXISTS "Admin can update contact_messages" ON public.contact_messages;
CREATE POLICY "Admin can update contact_messages"
  ON public.contact_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 4. Política: admin puede eliminar mensajes
DROP POLICY IF EXISTS "Admin can delete contact_messages" ON public.contact_messages;
CREATE POLICY "Admin can delete contact_messages"
  ON public.contact_messages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
