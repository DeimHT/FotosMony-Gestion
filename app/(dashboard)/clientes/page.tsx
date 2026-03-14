import { createClient } from "@/lib/supabase/server";
import ClientesClient from "./ClientesClient";

export default async function ClientesPage() {
  const supabase = await createClient();

  const [
    { data: clientesDB },
    { data: profiles },
    { data: orders },
    { data: ventas },
  ] = await Promise.all([
    supabase.from("clientes").select("*").order("nombre"),
    supabase.from("profiles").select("id, full_name, phone, created_at").order("created_at", { ascending: false }),
    supabase.from("orders").select("user_id, guest_email, total_clp, status, created_at"),
    supabase.from("ventas_presenciales").select("cliente_nombre, cliente_email, total_clp, created_at"),
  ]);

  return (
    <ClientesClient
      initialClientes={clientesDB ?? []}
      profiles={profiles ?? []}
      orders={orders ?? []}
      ventas={ventas ?? []}
    />
  );
}
