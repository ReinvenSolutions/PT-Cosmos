# Row Level Security (RLS) - Documentación

## Resumen

La migración `0009_enable_rls_security.sql` habilita Row Level Security en todas las tablas del esquema `public` para corregir las vulnerabilidades reportadas por el Security Advisor de Supabase.

## Vulnerabilidades corregidas

1. **RLS Disabled in Public** (15 tablas): Las tablas expuestas a PostgREST no tenían RLS, permitiendo acceso no autorizado si alguien obtuviera las credenciales de la API.

2. **Sensitive Columns Exposed** (`password_reset_tokens`): La tabla con tokens de restablecimiento de contraseña estaba expuesta. Con RLS habilitado y sin políticas, el acceso vía PostgREST queda bloqueado.

## Tablas afectadas

| Tabla | Descripción |
|-------|-------------|
| `clients` | Clientes del sistema |
| `destinations` | Planes/destinos |
| `destination_images` | Imágenes de destinos |
| `exclusions` | Exclusiones de planes |
| `hotels` | Hoteles |
| `inclusions` | Inclusiones de planes |
| `itinerary_days` | Días del itinerario |
| `password_reset_tokens` | Tokens de restablecimiento (sensibles) |
| `quote_destinations` | Relación cotización-destino |
| `quote_logs` | Logs de cotizaciones |
| `quotes` | Cotizaciones |
| `session` / `sessions` | Sesiones de Express |
| `terms_conditions` | Términos y condiciones |
| `two_factor_sessions` | Sesiones 2FA |
| `users` | Usuarios |

## Cómo funciona

- **Con RLS habilitado y sin políticas**: Ningún rol puede leer/escribir filas excepto el propietario de la tabla y superusuarios (que omiten RLS).

- **La aplicación Express** usa `DATABASE_URL` con el usuario `postgres` (superusuario), que **omite RLS**. Por tanto, la app sigue funcionando con normalidad.

- **PostgREST** (API REST de Supabase) usa los roles `anon` y `authenticated`, que **no son superusuarios** y quedan bloqueados al no existir políticas que les permitan acceso.

## Aplicar la migración

```bash
# Opción 1: Script directo (recomendado si db:migrate falla)
npm run db:apply-rls

# Opción 2: Con Drizzle (si las migraciones están sincronizadas)
npm run db:migrate

# Opción 3: Manualmente en Supabase SQL Editor
# Copiar y ejecutar el contenido de migrations/0009_enable_rls_security.sql
```

## Verificación

1. **Security Advisor**: En el dashboard de Supabase, ir a Database → Security Advisor. Los errores de "RLS Disabled" y "Sensitive Columns Exposed" deberían desaparecer.

2. **Funcionalidad de la app**: Probar login, cotizaciones, planes, etc. Todo debe funcionar igual porque la conexión directa omite RLS.

## Políticas adicionales (opcional)

Si en el futuro se usa el cliente Supabase desde el frontend para acceder a datos, habrá que crear políticas explícitas. Por ahora, la app usa solo la API Express, que se conecta directamente a PostgreSQL.
