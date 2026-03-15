"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Mail, CalendarDays, Check, CheckCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import { format, differenceInMinutes, differenceInHours } from "date-fns";
import { es } from "date-fns/locale";

const SEEN_KEY = "notif_seen_sessions";

interface UnreadMessage {
  id: string;
  nombre: string;
  email: string;
  asunto: string | null;
  created_at: string;
}

interface UpcomingSession {
  id: string;
  titulo: string;
  fecha_inicio: string;
  cliente_nombre: string | null;
}

function getSeenSessions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function markSessionSeen(id: string) {
  const seen = getSeenSessions();
  if (!seen.includes(id)) {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, id]));
  }
}

function timeUntil(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const mins = differenceInMinutes(date, now);
  const hrs = differenceInHours(date, now);
  if (mins < 60) return `en ${mins} min`;
  if (hrs < 24) return `en ${hrs}h`;
  return format(date, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es });
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UnreadMessage[]>([]);
  const [sessions, setSessions] = useState<UpcomingSession[]>([]);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  // Cargar notificaciones
  async function loadNotifications() {
    const supabase = createClient();
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const [{ data: msgs }, { data: sess }] = await Promise.all([
      supabase
        .from("contact_messages")
        .select("id, nombre, email, asunto, created_at")
        .eq("leido", false)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("agenda")
        .select("id, titulo, fecha_inicio, cliente_nombre")
        .gte("fecha_inicio", now.toISOString())
        .lte("fecha_inicio", in48h.toISOString())
        .neq("estado", "cancelado")
        .order("fecha_inicio", { ascending: true })
        .limit(10),
    ]);

    setMessages(msgs ?? []);
    setSessions(sess ?? []);
    setSeenIds(getSeenSessions());
    setLoading(false);
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unseenSessions = sessions.filter((s) => !seenIds.includes(s.id));
  const totalCount = messages.length + unseenSessions.length;

  async function handleMarkMessageRead(id: string) {
    const supabase = createClient();
    await supabase
      .from("contact_messages")
      .update({ leido: true })
      .eq("id", id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleMarkAllMessagesRead() {
    const supabase = createClient();
    const ids = messages.map((m) => m.id);
    if (!ids.length) return;
    await supabase.from("contact_messages").update({ leido: true }).in("id", ids);
    setMessages([]);
  }

  function handleMarkSessionSeen(id: string) {
    markSessionSeen(id);
    setSeenIds(getSeenSessions());
  }

  function handleMarkAllSessionsSeen() {
    sessions.forEach((s) => markSessionSeen(s.id));
    setSeenIds(getSeenSessions());
  }

  const hasAny = unseenSessions.length > 0 || messages.length > 0;

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-lg transition-colors"
        style={{ color: open ? "var(--accent)" : "var(--text-secondary)" }}
        aria-label="Notificaciones"
      >
        <Bell size={18} />
        {totalCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full text-[10px] font-bold flex items-center justify-center"
            style={{ background: "var(--accent)", color: "#0D0D14" }}
          >
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Notificaciones
              {totalCount > 0 && (
                <span
                  className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
                >
                  {totalCount}
                </span>
              )}
            </span>
            {hasAny && (
              <button
                onClick={() => {
                  handleMarkAllMessagesRead();
                  handleMarkAllSessionsSeen();
                }}
                className="text-xs flex items-center gap-1 transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                <CheckCheck size={13} />
                Todo leído
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                <span className="text-sm">Cargando…</span>
              </div>
            ) : !hasAny ? (
              <div className="text-center py-10" style={{ color: "var(--text-muted)" }}>
                <Bell size={28} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">Sin notificaciones nuevas</p>
              </div>
            ) : (
              <>
                {/* Sesiones próximas */}
                {unseenSessions.length > 0 && (
                  <div>
                    <p
                      className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Sesiones próximas (48h)
                    </p>
                    {unseenSessions.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-start gap-3 px-4 py-3 transition-colors cursor-default"
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: "rgba(59,130,246,0.15)", color: "#3B82F6" }}
                        >
                          <CalendarDays size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                            {s.titulo}
                          </p>
                          {s.cliente_nombre && (
                            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                              {s.cliente_nombre}
                            </p>
                          )}
                          <p className="text-xs mt-0.5 font-medium" style={{ color: "#3B82F6" }}>
                            {timeUntil(s.fecha_inicio)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleMarkSessionSeen(s.id)}
                          title="Marcar como vista"
                          className="shrink-0 p-1 rounded-lg transition-colors mt-0.5"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Mensajes no leídos */}
                {messages.length > 0 && (
                  <div>
                    <p
                      className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Mensajes nuevos
                    </p>
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-start gap-3 px-4 py-3 transition-colors"
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
                        >
                          <Mail size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                            {m.nombre}
                          </p>
                          {m.asunto && (
                            <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                              {m.asunto}
                            </p>
                          )}
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                            {formatDateTime(m.created_at)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleMarkMessageRead(m.id)}
                          title="Marcar como leído"
                          className="shrink-0 p-1 rounded-lg transition-colors mt-0.5"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
