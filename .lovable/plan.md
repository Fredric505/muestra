# Plan: Preparar la independencia total de Lovable

El objetivo es dejar dentro del proyecto todo lo necesario para que puedas mover la app a tu propia cuenta de Supabase + tu propio hosting, sin depender de Lovable. No se cambia el funcionamiento actual de la app: solo se añaden archivos de documentación y migración.

## Qué se va a crear

Una carpeta nueva `deployment/` con estos archivos:

```text
deployment/
├── 01-schema.sql          → estructura completa de la base de datos
├── 02-functions.sql       → funciones y triggers
├── 03-storage.sql         → buckets y políticas de storage
├── README.md              → guía de migración paso a paso
└── checklist.md           → lista de verificación post-migración
```

### 1. `01-schema.sql`
Script SQL listo para ejecutar en un Supabase nuevo, que recrea:
- Los enums personalizados (`app_role`, etc.).
- Las 19 tablas con sus columnas, tipos, defaults y NOT NULL.
- Las claves foráneas y restricciones.
- Los `GRANT` necesarios para cada tabla.
- Todas las políticas RLS (aislamiento multi-taller por `workshop_id`).

### 2. `02-functions.sql`
- Funciones de seguridad y lógica: `has_role`, `get_user_workshop_id`, `handle_new_user`, `handle_new_workshop`, `make_first_user_admin`, `cleanup_employee`, `update_updated_at_column`.
- Los triggers asociados.
- Nota sobre reconfigurar `pg_cron` + `pg_net` para `check-expired-subscriptions`.

### 3. `03-storage.sql`
- Creación de los 3 buckets: `brand-assets` (público), `payment-receipts` (privado), `device-photos` (público).
- Las políticas RLS de `storage.objects` para cada bucket.

### 4. `README.md` — guía paso a paso
Cubre el proceso completo:
1. Crear cuenta y proyecto en Supabase (o autohospedar con Docker).
2. Ejecutar los 3 scripts SQL en orden.
3. Migrar los datos (exportar CSV por tabla desde Lovable Cloud → importar).
4. Desplegar las 6 edge functions con la CLI de Supabase (`supabase functions deploy`).
5. Recrear los secrets (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`).
6. Copiar los archivos de storage (logos, comprobantes, fotos).
7. Reconfigurar autenticación (Google + URLs de redirección).
8. Reconfigurar el cron job de expiración de suscripciones.
9. Build del frontend (`npm run build`) y subida a Netlify/Vercel/servidor propio.
10. Configurar variables de entorno y redirección SPA en el host.

### 5. `checklist.md`
Lista corta para verificar que todo quedó funcionando tras migrar (login, creación de reparación, venta, subida de foto, notificación de Telegram, expiración de suscripción).

## Detalles técnicos

- El SQL se generará leyendo el esquema real actual de la base de datos para que sea fiel (columnas, tipos, políticas exactas).
- No se toca ningún archivo de la app ni la base de datos actual; solo se añaden archivos nuevos en `deployment/`.
- Importante: el frontend usa variables `VITE_SUPABASE_*` del archivo `.env`; en tu nuevo host deberás ponerlas apuntando a tu nuevo proyecto Supabase.
- Si en el futuro usaras funciones de IA vía Lovable AI, necesitarías tu propia clave de proveedor; hoy no parece aplicar.

## Lo que queda fuera (manual tuyo)
- Crear la cuenta de Supabase y el hosting.
- Ejecutar los scripts y la CLI en tu máquina.
- La copia física de datos y archivos (depende de tus credenciales).

Estos pasos no los puedo hacer yo por ti porque ocurren en tus propias cuentas, pero la guía los detalla uno por uno.
