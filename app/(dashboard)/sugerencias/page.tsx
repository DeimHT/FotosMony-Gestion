import { createClient } from "@/lib/supabase/server";
import SugerenciasClient from "./SugerenciasClient";

export default async function SugerenciasPage() {
  const supabase = await createClient();
  const { data: sugerencias } = await supabase
    .from("sugerencias")
    .select("*")
    .order("created_at", { ascending: false });

  return <SugerenciasClient initialSugerencias={sugerencias ?? []} />;
}
