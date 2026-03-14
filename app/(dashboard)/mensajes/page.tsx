import { createClient } from "@/lib/supabase/server";
import MensajesClient from "./MensajesClient";

export default async function MensajesPage() {
  const supabase = await createClient();
  const { data: messages } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  return <MensajesClient initialMessages={messages ?? []} />;
}
