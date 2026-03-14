# FotosMony — Sistema de Gestión Interno

Sistema de backoffice para FotosMony, conectado a la misma base de datos Supabase del sitio web principal (fotosmony.cl).

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Supabase** — misma instancia que fotosmony.cl (auth + DB)
- **Tailwind CSS** — diseño oscuro inspirado en fotosmony.cl
- **Recharts** — gráficos de ventas
- **date-fns** — manipulación de fechas y calendario

## Configuración inicial

### 1. Variables de entorno

Copia el archivo de ejemplo y rellena con las credenciales de Supabase (las mismas que usa fotosmony.cl):

```bash
cp .env.local.example .env.local
```

Edita `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://XXXXXXXXXXXXXXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 2. Tablas nuevas en Supabase

Ejecuta el script SQL en el **SQL Editor de Supabase**:

```
supabase/migrations/001_gestion_tables.sql
```

Este script crea las 3 tablas nuevas necesarias para el sistema de gestión:
- `agenda` — agenda de sesiones y eventos presenciales
- `ventas_presenciales` — registro de ventas en terreno
- `venta_presencial_items` — ítems de cada venta presencial

### 3. Usuario administrador

El sistema solo permite acceso a usuarios con `role = 'admin'` en la tabla `profiles` de Supabase.

Para asignar rol admin a un usuario existente, ejecuta en el SQL Editor:
```sql
UPDATE public.profiles SET role = 'admin' WHERE id = 'UUID-DEL-USUARIO';
```

### 4. Instalar dependencias y ejecutar

```bash
pnpm install
pnpm dev
```

El sistema estará disponible en `http://localhost:3000`.

## Módulos

| Módulo | URL | Descripción |
|--------|-----|-------------|
| Dashboard | `/dashboard` | Métricas generales, gráfico de ventas, últimos pedidos |
| Eventos | `/dashboard/eventos` | Gestión de galerías/eventos y sus fotos |
| Pedidos Online | `/dashboard/pedidos` | Historial y detalle de pedidos web |
| Ventas Presenciales | `/dashboard/ventas` | Registro y historial de ventas en terreno |
| Agenda | `/dashboard/agenda` | Calendario de sesiones y eventos |
| Clientes | `/dashboard/clientes` | Base de datos unificada de clientes |
| Servicios | `/dashboard/servicios` | CRUD de servicios publicados en la web |
| Mensajes | `/dashboard/mensajes` | Bandeja de mensajes del formulario de contacto |
| Contenido Web | `/dashboard/contenido` | CMS: secciones del home y portafolio |

## Estructura del proyecto

```
app/
  (auth)/login/          — Página de login
  (dashboard)/
    dashboard/           — Métricas globales
    eventos/             — Eventos y galerías
    pedidos/             — Pedidos online
    ventas/              — Ventas presenciales
    agenda/              — Calendario
    clientes/            — Clientes
    servicios/           — Servicios
    mensajes/            — Mensajes de contacto
    contenido/           — CMS
components/
  layout/                — Sidebar y Header
  dashboard/             — StatsCard y SalesChart
lib/
  supabase/              — Clientes browser y server
  utils.ts               — Utilidades (formatCLP, formatDate, etc.)
types/
  index.ts               — Tipos TypeScript del esquema
supabase/
  migrations/            — Scripts SQL
middleware.ts            — Protección de rutas (solo admin)
```

## Conexión con fotosmony.cl

El sistema se conecta a la **misma base de datos Supabase** del sitio web. Las tablas existentes que se leen/escriben son:

- `eventos`, `sub_eventos`, `fotos`, `carpetas` — gestión de galerías
- `orders`, `order_items` — pedidos online (WebPay)
- `services` — servicios publicados en la web
- `profiles` — usuarios registrados
- `contact_messages` — formulario de contacto
- `home_sections`, `portfolio_items` — contenido del CMS

Las tablas nuevas (`agenda`, `ventas_presenciales`, `venta_presencial_items`) son exclusivas del sistema de gestión.
