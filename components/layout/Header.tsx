"use client";

import { useRouter } from "next/navigation";
import { Menu, LogOut, User, Bell, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";
import { useState } from "react";
import Link from "next/link";

interface HeaderProps {
  onMenuClick: () => void;
  userName?: string;
  userEmail?: string;
  unreadMessages?: number;
}

export default function Header({
  onMenuClick,
  userName,
  userEmail,
  unreadMessages = 0,
}: HeaderProps) {
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const displayName = userName || userEmail?.split("@")[0] || "Admin";
  const initials = getInitials(displayName);

  return (
    <header
      className="flex items-center justify-between px-4 lg:px-6 h-14 shrink-0"
      style={{
        background: "var(--bg-sidebar)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Left: menu toggle */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-lg transition-colors"
        style={{ color: "var(--text-secondary)" }}
      >
        <Menu size={20} />
      </button>

      {/* Center: breadcrumb placeholder — páginas usan su propio título */}
      <div className="hidden lg:block" />

      {/* Right: actions */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Link to site */}
        <a
          href="https://www.fotosmony.cl"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
          }}
        >
          <ExternalLink size={12} />
          Ver sitio web
        </a>

        {/* Notifications */}
        <Link
          href="/mensajes"
          className="relative p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          <Bell size={18} />
          {unreadMessages > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{ background: "var(--accent)", color: "#0D0D14" }}
            >
              {unreadMessages > 9 ? "9+" : unreadMessages}
            </span>
          )}
        </Link>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
            >
              {initials}
            </div>
            <span className="hidden sm:block text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {displayName}
            </span>
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setUserMenuOpen(false)}
              />
              <div
                className="absolute right-0 top-full mt-1 w-56 rounded-xl shadow-xl z-20 py-1"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  className="px-4 py-3"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {displayName}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {userEmail}
                  </p>
                </div>
                <div className="py-1">
                  <div className="flex items-center gap-2 px-4 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
                    <User size={12} />
                    Administrador
                  </div>
                </div>
                <div style={{ borderTop: "1px solid var(--border)" }}>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm transition-colors"
                    style={{ color: "var(--danger)" }}
                  >
                    <LogOut size={14} />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
