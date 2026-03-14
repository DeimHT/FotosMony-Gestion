import { createClient } from "@/lib/supabase/server";
import ContenidoClient from "./ContenidoClient";

export default async function ContenidoPage() {
  const supabase = await createClient();

  const [{ data: sections }, { data: portfolio }] = await Promise.all([
    supabase.from("home_sections").select("*"),
    supabase.from("portfolio_items").select("*").order("orden"),
  ]);

  return (
    <ContenidoClient
      initialSections={sections ?? []}
      initialPortfolio={portfolio ?? []}
    />
  );
}
