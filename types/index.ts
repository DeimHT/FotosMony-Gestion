// ─── Types from existing fotosmony.cl database ───────────────────────────────

export interface Evento {
  id: string;
  nombre: string;
  slug: string;
  created_at: string;
  cover_public_id: string | null;
  cover_storage_provider: string | null;
}

export interface SubEvento {
  id: string;
  evento_id: string;
  nombre: string;
  slug: string;
  created_at: string;
}

export interface Carpeta {
  id: string;
  nombre: string;
  descripcion: string | null;
  created_at: string;
}

export interface Foto {
  id: string;
  evento_id: string | null;
  sub_evento_id: string | null;
  public_id: string;
  precio: number;
  created_at: string;
  carpeta_id: string | null;
  nombre_archivo: string | null;
  content_hash: string | null;
  storage_provider: string;
}

export interface Order {
  id: string;
  user_id: string | null;
  guest_email: string | null;
  guest_name: string | null;
  total_clp: number;
  status: "pending" | "paid" | "failed";
  webpay_token: string | null;
  buy_order: string;
  created_at: string;
  paid_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  foto_id: string;
  precio: number;
  public_id: string | null;
  evento_nombre: string | null;
  subevento_nombre: string | null;
  created_at: string;
}

export interface ContactMessage {
  id: string;
  nombre: string;
  email: string;
  asunto: string | null;
  mensaje: string;
  leido: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  role: string;
}

export interface Service {
  id: string;
  title: string;
  description: string | null;
  price_clp: number;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  image_url: string | null;
  image_public_id: string | null;
  destacado: boolean | null;
  agendable: boolean;
}

export interface PortfolioItem {
  id: string;
  titulo: string;
  descripcion: string | null;
  cover_public_id: string | null;
  orden: number;
  activo: boolean;
  created_at: string;
}

export interface HomeSection {
  id: "hero" | "about";
  content: Record<string, unknown>;
  updated_at: string;
}

// ─── New tables for management system ────────────────────────────────────────

export interface Cliente {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgendaItem {
  id: string;
  titulo: string;
  tipo: "sesion" | "evento" | "licenciatura" | "otro";
  cliente_nombre: string | null;
  cliente_email: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  ubicacion: string | null;
  notas: string | null;
  estado: "pendiente" | "confirmado" | "cancelado" | "completado";
  created_at: string;
}

export interface VentaPresencial {
  id: string;
  cliente_nombre: string | null;
  cliente_email: string | null;
  total_clp: number;
  metodo_pago: "efectivo" | "transferencia" | "debito" | "credito";
  notas: string | null;
  agenda_id: string | null;
  created_at: string;
}

export interface VentaPresencialItem {
  id: string;
  venta_id: string;
  servicio_nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  created_at: string;
}

export interface Sugerencia {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: "general" | "interfaz" | "funcionalidad" | "rendimiento" | "correccion" | "otro";
  prioridad: "baja" | "media" | "alta";
  estado: "pendiente" | "en_revision" | "planificado" | "implementado" | "descartado";
  autor_nombre: string | null;
  notas_desarrollador: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Derived / joined types ────────────────────────────────────────────────

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export interface VentaWithItems extends VentaPresencial {
  venta_presencial_items: VentaPresencialItem[];
}

export interface EventoWithStats extends Evento {
  total_fotos?: number;
  fotos_vendidas?: number;
  ingresos?: number;
}

// ─── Dashboard stats type ─────────────────────────────────────────────────

export interface DashboardStats {
  ingresos_mes: number;
  ingresos_mes_anterior: number;
  pedidos_pendientes: number;
  pedidos_mes: number;
  ventas_presenciales_mes: number;
  mensajes_no_leidos: number;
  total_eventos: number;
  clientes_totales: number;
}

export interface SalesDataPoint {
  fecha: string;
  online: number;
  presencial: number;
}
