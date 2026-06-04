-- ============================================================
-- Corregir trigger: no crear cliente en gestión si el email
-- ya pertenece a un usuario registrado (auth.users).
-- También elimina clientes duplicados generados por el bug.
-- ============================================================

-- 1. Actualizar la función del trigger para ignorar emails de usuarios registrados
CREATE OR REPLACE FUNCTION public.sync_paid_order_to_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.status = 'paid' AND NEW.guest_email IS NOT NULL THEN
    -- Si el email ya existe en auth.users, es un usuario registrado → no crear en clientes
    IF EXISTS (
      SELECT 1 FROM auth.users
      WHERE LOWER(email) = LOWER(TRIM(NEW.guest_email))
    ) THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.clientes (nombre, email, created_at, updated_at)
    VALUES (
      COALESCE(NULLIF(TRIM(NEW.guest_name), ''), split_part(NEW.guest_email, '@', 1)),
      LOWER(TRIM(NEW.guest_email)),
      NOW(),
      NOW()
    )
    ON CONFLICT (lower(email)) WHERE email IS NOT NULL
    DO UPDATE SET updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Eliminar clientes de gestión cuyo email corresponde a un usuario registrado
--    (duplicados generados antes de esta corrección)
DELETE FROM public.clientes
WHERE email IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE LOWER(auth.users.email) = LOWER(public.clientes.email)
  );
