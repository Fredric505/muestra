# Guía para independizar RepairControl de Lovable

Esta guía te lleva paso a paso para mover la aplicación a **tu propia
infraestructura**: tu propio proyecto de Supabase (base de datos, auth, storage,
edge functions) y tu propio hosting para el frontend (Netlify, Vercel,
Cloudflare Pages o un servidor propio).

> La app tiene dos mitades: **frontend** (lo visible, React + Vite) y
> **backend** (base de datos, login, funciones, archivos). Hay que mudar las dos.

---

## Contenido de esta carpeta

```
deployment/
├── README.md             ← esta guía
├── database-schema.sql   ← TODO el esquema (tablas, RLS, funciones, triggers, buckets, cron)
└── checklist.md          ← verificación final
```

El archivo `database-schema.sql` es la **unión de todo el historial de
migraciones** del proyecto (`supabase/migrations/`). Es la fuente fiel y
completa del esquema. También puedes usar la CLI de Supabase con la carpeta
`supabase/migrations` directamente (ver Paso 2, opción B).

---

## Requisitos previos

- Una cuenta en [supabase.com](https://supabase.com) (plan gratis sirve para
  empezar) **o** Supabase autohospedado con Docker.
- [Supabase CLI](https://supabase.com/docs/guides/cli) instalada (`npm i -g supabase`).
- [Node.js](https://nodejs.org) 18+ para construir el frontend.
- Cuenta en tu hosting elegido (Netlify, Vercel, etc.).

---

## Paso 1 — Crear tu proyecto Supabase

1. Entra a supabase.com → **New project**.
2. Anota estos datos (Project Settings → API):
   - **Project URL** → `https://TU-REF.supabase.co`
   - **anon public key**
   - **service_role key** (secreta, solo para funciones)
   - **Project ref** (el código corto en la URL)
3. En **Project Settings → Database** anota la cadena de conexión.

---

## Paso 2 — Crear la base de datos (esquema, RLS, funciones)

### Opción A — Ejecutar el SQL consolidado (rápido)
1. Abre tu proyecto Supabase → **SQL Editor**.
2. Copia y pega TODO el contenido de `database-schema.sql`.
3. Ejecuta. Esto crea enums, tablas, GRANTs, políticas RLS, funciones,
   triggers, los buckets de storage y el cron.

### Opción B — Usar la CLI (recomendado, repetible)
```bash
supabase login
supabase link --project-ref TU-REF
supabase db push        # aplica supabase/migrations en orden
```

> **Importante (cron):** una de las migraciones programa el job
> `check-expired-subscriptions` con la URL y la anon key del proyecto ANTIGUO.
> Tras migrar, vuelve a crear ese cron con tu nueva URL y anon key (ver Paso 6).

---

## Paso 3 — Migrar los datos

Lovable Cloud solo permite exportar **CSV por tabla**.

1. En Lovable: pestaña **Cloud → Database → Tables**. Por cada tabla, descarga
   el CSV.
2. En tu Supabase: **Table Editor → (tabla) → Insert → Import data from CSV**.
3. Respeta el **orden de dependencias** para no romper las claves foráneas.
   Importa primero las tablas "padre":

   ```
   1. plans, platform_settings, payment_methods
   2. (usuarios: ver nota abajo)
   3. workshops
   4. profiles, user_roles, employees, repair_types, products, brand_settings
   5. repairs, sales, registration_ips
   6. sale_items, product_images, daily_earnings, sale_earnings,
      employee_loans, payment_requests
   ```

> **Nota sobre usuarios:** las tablas referencian `auth.users`. Los usuarios
> viven en el sistema de Auth de Supabase, no en una tabla normal. Para
> conservar los logins debes migrar `auth.users` (Supabase ofrece migración de
> usuarios entre proyectos; consulta su documentación). Si empiezas con usuarios
> nuevos, créalos primero y ajusta los `user_id`/`owner_id` en los CSV.

---

## Paso 4 — Desplegar las edge functions

Las 6 funciones están en `supabase/functions/`:
`check-expired-subscriptions`, `check-ip`, `create-employee`,
`reset-employee-password`, `setup-super-admin`, `telegram-notify`.

```bash
supabase functions deploy check-expired-subscriptions
supabase functions deploy check-ip
supabase functions deploy create-employee
supabase functions deploy reset-employee-password
supabase functions deploy setup-super-admin
supabase functions deploy telegram-notify
```

(O todas juntas con `supabase functions deploy`.)

---

## Paso 5 — Configurar los secrets de las funciones

En tu Supabase: **Project Settings → Edge Functions → Secrets** (o
`supabase secrets set`). Necesitas:

```
TELEGRAM_BOT_TOKEN   = (tu token del bot de Telegram)
TELEGRAM_CHAT_ID     = (el chat donde llegan las notificaciones)
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` los provee
Supabase automáticamente a las funciones; no hay que crearlos a mano.

> No usas funciones de IA de Lovable, así que no necesitas `LOVABLE_API_KEY`.
> Si en el futuro agregas IA, deberás usar tu propia clave de un proveedor.

---

## Paso 6 — Reconfigurar el cron de expiración

En el **SQL Editor**, activa las extensiones y vuelve a crear el job con TU URL
y TU anon key:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'check-expired-subscriptions-daily',
  '0 3 * * *', -- cada día a las 3:00
  $$
  select net.http_post(
    url:='https://TU-REF.supabase.co/functions/v1/check-expired-subscriptions',
    headers:='{"Content-Type":"application/json","apikey":"TU_ANON_KEY"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
```

---

## Paso 7 — Configurar Storage

Los buckets (`brand-assets`, `payment-receipts`, `device-photos`) y sus
políticas ya los crea `database-schema.sql`. Falta copiar los archivos:

1. Descarga los archivos de cada bucket desde Lovable Cloud → **Storage**.
2. Súbelos a los mismos buckets en tu Supabase (UI o `supabase storage cp`).

> Las URLs públicas cambian de dominio. Las columnas que guardan rutas
> (`logo_url`, `receipt_url`, `device_photo_*`, etc.) seguirán funcionando si
> mantienes los mismos nombres de archivo dentro de cada bucket.

---

## Paso 8 — Configurar la autenticación

1. **Auth → Providers → Email**: habilítalo. La confirmación de email está
   desactivada en este proyecto (white-labeling); déjala igual si quieres el
   mismo comportamiento.
2. **Auth → Providers → Google**: habilítalo y pega tu Client ID y Secret de
   Google Cloud.
3. **Auth → URL Configuration**: pon tu dominio final en *Site URL* y en
   *Redirect URLs* (ej. `https://tudominio.com`).

---

## Paso 9 — Apuntar el frontend a tu nuevo backend

El frontend lee estas variables (archivo `.env`):

```
VITE_SUPABASE_URL=https://TU-REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_ANON_KEY
VITE_SUPABASE_PROJECT_ID=TU-REF
```

Cámbialas por las de TU proyecto. En el hosting, configúralas como variables de
entorno del sitio (no subas el `.env` con secretos al repositorio).

---

## Paso 10 — Construir y desplegar el frontend

```bash
npm install
npm run build      # genera la carpeta dist/
```

Sube `dist/` a tu hosting. Configuración por plataforma:

- **Netlify:** Build command `npm run build`, Publish directory `dist`.
  Crea `public/_redirects` con: `/*  /index.html  200` (para que el ruteo SPA
  no dé 404 al recargar).
- **Vercel:** detecta Vite automáticamente; añade un rewrite de `/(.*)` a
  `/index.html`.
- **Cloudflare Pages:** Build `npm run build`, output `dist`, añade regla SPA.

Recuerda poner las variables `VITE_*` del Paso 9 en la configuración del sitio.

---

## Resultado

- Frontend servido desde tu hosting y tu dominio.
- Backend 100% en tu cuenta de Supabase.
- Cero dependencia de Lovable.

Revisa `checklist.md` para verificar que todo quedó funcionando.
