import { createClient } from "@/lib/supabase/server";
import AgendaClient from "./AgendaClient";

export default async function AgendaPage() {
  const supabase = await createClient();

  const [{ data: items }, { data: serviciosAgendables }] = await Promise.all([
    supabase
      .from("agenda")
      .select("*")
      .order("fecha_inicio", { ascending: true }),
    supabase
      .from("services")
      .select("id, title")
      .eq("agendable", true)
      .eq("active", true)
      .order("sort_order"),
  ]);

  return (
    <AgendaClient
      initialItems={items ?? []}
      serviciosAgendables={serviciosAgendables ?? []}
    />
  );
}
