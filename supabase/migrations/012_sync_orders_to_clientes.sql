-- ============================================================
-- Sincronizar pedidos pagados con la tabla de clientes
-- Cuando un order pasa a status='paid' con guest_email,
-- se crea o actualiza un registro en clientes.
-- ============================================================

-- 1. Índice único parcial en email (case-insensitive, solo cuando no es null)
--    Necesario para el ON CONFLICT del upsert.
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_email_unique
  ON public.clientes (lower(email))
  WHERE email IS NOT NULL;

-- 2. Función trigger
CREATE OR REPLACE FUNCTION public.sync_paid_order_to_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo actuar cuando el pedido esté pagado y tenga email de invitado
  IF NEW.status = 'paid' AND NEW.guest_email IS NOT NULL THEN
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

-- 3. Trigger en la tabla orders
DROP TRIGGER IF EXISTS trigger_sync_order_to_cliente ON public.orders;
CREATE TRIGGER trigger_sync_order_to_cliente
  AFTER INSERT OR UPDATE OF status
  ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_paid_order_to_cliente();

-- 4. Backfill: crear clientes para pedidos ya pagados que no tienen cliente aún
INSERT INTO public.clientes (nombre, email, created_at, updated_at)
SELECT
  COALESCE(NULLIF(TRIM(o.guest_name), ''), split_part(o.guest_email, '@', 1)),
  LOWER(TRIM(o.guest_email)),
  COALESCE(o.paid_at, o.created_at),
  NOW()
FROM public.orders o
WHERE o.status = 'paid'
  AND o.guest_email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE LOWER(c.email) = LOWER(TRIM(o.guest_email))
  )
ON CONFLICT (lower(email)) WHERE email IS NOT NULL
DO NOTHING;
