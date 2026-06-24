# Checklist post-migración

Marca cada punto después de mover la app a tu infraestructura.

## Base de datos
- [ ] `database-schema.sql` se ejecutó sin errores (o `supabase db push` OK).
- [ ] Existen las 19 tablas en el Table Editor.
- [ ] Los enums `app_role`, `employee_type`, `repair_status` existen.
- [ ] Las funciones `has_role`, `get_user_workshop_id`, `handle_new_user`,
      `handle_new_workshop` aparecen en Database → Functions.
- [ ] RLS está activado en todas las tablas (candado verde).

## Datos
- [ ] Los CSV se importaron respetando el orden de dependencias.
- [ ] Los usuarios (`auth.users`) están migrados o recreados.
- [ ] `owner_id` de cada workshop apunta a un usuario válido.

## Edge functions
- [ ] Las 6 funciones aparecen desplegadas.
- [ ] Secrets `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` configurados.

## Cron
- [ ] Extensiones `pg_cron` y `pg_net` activas.
- [ ] Job `check-expired-subscriptions` recreado con TU URL y anon key.

## Storage
- [ ] Buckets `brand-assets`, `payment-receipts`, `device-photos` existen.
- [ ] Archivos copiados (logos, comprobantes, fotos).

## Auth
- [ ] Email habilitado.
- [ ] Google habilitado con tu Client ID/Secret.
- [ ] Site URL y Redirect URLs apuntan a tu dominio.

## Frontend
- [ ] Variables `VITE_SUPABASE_*` apuntan a tu proyecto.
- [ ] `npm run build` genera `dist/` sin errores.
- [ ] Regla de redirección SPA configurada (no hay 404 al recargar).

## Pruebas funcionales (en el sitio ya desplegado)
- [ ] Registro / login de un usuario.
- [ ] Login con Google.
- [ ] Crear una reparación.
- [ ] Registrar una venta y ver que baja el stock.
- [ ] Subir una foto de equipo.
- [ ] Llega una notificación de Telegram.
- [ ] Un super admin ve el panel global.
- [ ] La expiración de suscripción funciona (probar el cron manualmente).
- [ ] El aislamiento entre talleres funciona: un taller NO ve datos de otro.
