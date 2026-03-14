"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Camera,
  ShoppingCart,
  ShoppingBag,
  CalendarDays,
  Users,
  Briefcase,
  MessageSquare,
  FileImage,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: number;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/eventos", label: "Eventos", icon: Camera },
  { href: "/pedidos", label: "Pedidos Online", icon: ShoppingCart },
  { href: "/ventas", label: "Ventas Presenciales", icon: ShoppingBag },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/servicios", label: "Servicios", icon: Briefcase },
  { href: "/mensajes", label: "Mensajes", icon: MessageSquare },
  { href: "/contenido", label: "Contenido Web", icon: FileImage },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  unreadMessages?: number;
  pendingOrders?: number;
}

export default function Sidebar({
  open,
  onClose,
  unreadMessages = 0,
  pendingOrders = 0,
}: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const getBadge = (href: string) => {
    if (href === "/mensajes") return unreadMessages;
    if (href === "/pedidos") return pendingOrders;
    return 0;
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full z-30 flex flex-col transition-transform duration-300",
          "lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          width: 240,
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center justify-between px-5 py-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--accent-muted)", border: "1px solid var(--accent)" }}
            >
              <Camera size={16} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <span
                className="font-bold text-sm tracking-wide"
                style={{ color: "var(--text-primary)" }}
              >
                FotosMony
              </span>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Gestión
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const badge = getBadge(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative",
                  active
                    ? "text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
                style={{
                  background: active ? "var(--accent-muted)" : "transparent",
                  border: active ? "1px solid rgba(232,184,75,0.2)" : "1px solid transparent",
                }}
              >
                {/* Active indicator */}
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                    style={{ background: "var(--accent)" }}
                  />
                )}
                <item.icon
                  size={16}
                  className={cn(
                    "shrink-0",
                    active
                      ? "text-[var(--accent)]"
                      : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {badge > 0 && (
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                    style={{ background: "var(--accent)", color: "#0D0D14" }}
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
                {active && (
                  <ChevronRight size={14} style={{ color: "var(--accent)" }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className="px-4 py-3"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            v1.0.0 — fotosmony.cl
          </p>
        </div>
      </aside>
    </>
  );
}
