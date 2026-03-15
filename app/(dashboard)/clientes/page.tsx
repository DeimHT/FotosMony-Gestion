import { createClient } from "@/lib/supabase/server";
import ClientesClient from "./ClientesClient";

export default async function ClientesPage() {
  const supabase = await createClient();

  const [
    { data: clientesDB },
    { data: profiles },
    { data: orders },
    { data: ventas },
    { data: userEmails },
  ] = await Promise.all([
    supabase.from("clientes").select("*").order("nombre"),
    supabase.from("profiles").select("id, full_name, phone, created_at").order("created_at", { ascending: false }),
    supabase.from("orders").select("user_id, guest_email, total_clp, status, created_at"),
    supabase.from("ventas_presenciales").select("cliente_nombre, cliente_email, total_clp, estado, created_at"),
    supabase.rpc("get_user_emails"),
  ]);

  // Construir mapa id -> email
  const emailMap: Record<string, string> = {};
  (userEmails ?? []).forEach((row: { id: string; email: string }) => {
    emailMap[row.id] = row.email;
  });

  return (
    <ClientesClient
      initialClientes={clientesDB ?? []}
      profiles={profiles ?? []}
      orders={orders ?? []}
      ventas={ventas ?? []}
      emailMap={emailMap}
    />
  );
}
