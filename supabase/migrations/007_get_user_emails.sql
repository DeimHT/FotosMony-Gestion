-- Función para exponer emails de auth.users a admin
-- SECURITY DEFINER permite acceder a auth.users con permisos elevados
CREATE OR REPLACE FUNCTION public.get_user_emails()
RETURNS TABLE(id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, email::text FROM auth.users;
$$;

-- Solo admin puede ejecutarla
REVOKE ALL ON FUNCTION public.get_user_emails() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_emails() TO authenticated;
