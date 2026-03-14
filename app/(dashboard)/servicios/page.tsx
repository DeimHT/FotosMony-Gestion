import { createClient } from "@/lib/supabase/server";
import ServiciosClient from "./ServiciosClient";

export default async function ServiciosPage() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("*")
    .order("sort_order");

  return <ServiciosClient initialServices={services ?? []} />;
}
