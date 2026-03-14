"use client";

import { useState } from "react";
import { ContactMessage } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { MessageSquare, Mail, MailOpen, X, Reply } from "lucide-react";
import { cn } from "@/lib/utils";

interface MensajesClientProps {
  initialMessages: ContactMessage[];
}

export default function MensajesClient({ initialMessages }: MensajesClientProps) {
  const [messages, setMessages] = useState<ContactMessage[]>(initialMessages);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const filtered = messages.filter((m) => {
    if (filter === "unread") return !m.leido;
    if (filter === "read") return m.leido;
    return true;
  });

  const unreadCount = messages.filter((m) => !m.leido).length;

  async function markRead(msg: ContactMessage) {
    if (msg.leido) return;
    const supabase = createClient();
    await supabase.from("contact_messages").update({ leido: true }).eq("id", msg.id);
    setMessages(messages.map((m) => (m.id === msg.id ? { ...m, leido: true } : m)));
  }

  async function toggleRead(msg: ContactMessage) {
    const supabase = createClient();
    await supabase
      .from("contact_messages")
      .update({ leido: !msg.leido })
      .eq("id", msg.id);
    setMessages(messages.map((m) => (m.id === msg.id ? { ...m, leido: !m.leido } : m)));
    if (selected?.id === msg.id) setSelected({ ...msg, leido: !msg.leido });
  }

  function openMessage(msg: ContactMessage) {
    setSelected(msg);
    markRead(msg);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <MessageSquare size={22} style={{ color: "var(--accent)" }} />
            Mensajes de Contacto
            {unreadCount > 0 && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "var(--accent)", color: "#0D0D14" }}
              >
                {unreadCount} nuevo{unreadCount !== 1 ? "s" : ""}
              </span>
            )}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {messages.length} mensajes en total
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "unread", "read"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: filter === f ? "var(--accent-muted)" : "var(--bg-card)",
              color: filter === f ? "var(--accent)" : "var(--text-secondary)",
              border: filter === f ? "1px solid rgba(232,184,75,0.3)" : "1px solid var(--border)",
            }}
          >
            {f === "all" ? "Todos" : f === "unread" ? "No leídos" : "Leídos"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Messages list */}
        <div
          className="lg:col-span-2 rounded-xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {filtered.map((msg) => (
            <button
              key={msg.id}
              onClick={() => openMessage(msg)}
              className={cn(
                "w-full text-left p-4 transition-all",
                selected?.id === msg.id ? "bg-[var(--accent-muted)]" : "hover:bg-[var(--bg-card-hover)]"
              )}
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: msg.leido ? "var(--bg-primary)" : "var(--accent-muted)",
                    color: msg.leido ? "var(--text-muted)" : "var(--accent)",
                  }}
                >
                  {msg.leido ? <MailOpen size={14} /> : <Mail size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn("text-sm truncate", !msg.leido ? "font-bold" : "font-medium")}
                      style={{ color: "var(--text-primary)" }}
                    >
                      {msg.nombre}
                    </p>
                    {!msg.leido && (
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: "var(--accent)" }}
                      />
                    )}
                  </div>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                    {msg.email}
                  </p>
                  {msg.asunto && (
                    <p className="text-xs mt-0.5 truncate font-medium" style={{ color: "var(--text-secondary)" }}>
                      {msg.asunto}
                    </p>
                  )}
                  <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--text-muted)" }}>
                    {msg.mensaje}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                    {formatDateTime(msg.created_at)}
                  </p>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-10" style={{ color: "var(--text-muted)" }}>
              <MessageSquare size={28} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">No hay mensajes</p>
            </div>
          )}
        </div>

        {/* Message detail */}
        {selected ? (
          <div
            className="lg:col-span-3 rounded-xl"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {selected.asunto || "Sin asunto"}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleRead(selected)}
                  className="btn-secondary text-xs px-2 py-1"
                  title={selected.leido ? "Marcar como no leído" : "Marcar como leído"}
                >
                  {selected.leido ? <Mail size={13} /> : <MailOpen size={13} />}
                  {selected.leido ? "No leído" : "Leído"}
                </button>
                <button onClick={() => setSelected(null)} style={{ color: "var(--text-muted)" }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Sender info */}
              <div
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                  style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
                >
                  {selected.nombre[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                    {selected.nombre}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {selected.email}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatDateTime(selected.created_at)}
                  </p>
                </div>
              </div>

              {/* Message content */}
              <div
                className="p-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap"
                style={{
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                }}
              >
                {selected.mensaje}
              </div>

              {/* Reply button */}
              <a
                href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.asunto || "Tu mensaje en FotosMony")}`}
                className="btn-primary inline-flex"
              >
                <Reply size={15} />
                Responder por email
              </a>
            </div>
          </div>
        ) : (
          <div
            className="lg:col-span-3 rounded-xl flex items-center justify-center"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              minHeight: 300,
            }}
          >
            <div className="text-center" style={{ color: "var(--text-muted)" }}>
              <MessageSquare size={36} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">Selecciona un mensaje para leerlo</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
