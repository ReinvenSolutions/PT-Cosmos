# Estrategia de Ramas y Despliegue

## Configuración de Ramas

### Rama `main` (Producción)
- **Base de Datos**: Supabase (`db.himyxbrdsnxryetlogzk.supabase.co`)
- **Workflow**: `.github/workflows/deploy-production.yml`
- **Trigger**: Push a `main`
- **Acciones**:
  1. Instalar dependencias
  2. Ejecutar `db:push` (aplicar migraciones)
  3. Ejecutar `seed-production-full.ts` (poblar datos)

### Rama `development` (Desarrollo)
- **Base de Datos**: Neon Development (`ep-blue-credit-aekag6rz`)
- **Workflow**: `.github/workflows/deploy-development.yml`
- **Trigger**: Push a `development`
- **Acciones**:
  1. Instalar dependencias
  2. Ejecutar `db:push` (aplicar migraciones)
  3. Ejecutar `seed-production-full.ts` (poblar datos)

## Configuración de Railway (Producción)

Railway debe estar conectado a la base de datos de **PRODUCCIÓN** (Supabase).

### Variables de Entorno en Railway
1. Ve a tu proyecto en Railway
2. Click en **Variables** → **Service Variables**
3. Configura las siguientes variables:

#### `DATABASE_URL`
```
postgresql://postgres:[YOUR-PASSWORD]@db.himyxbrdsnxryetlogzk.supabase.co:5432/postgres
```
**⚠️ IMPORTANTE**: URL de Supabase Producción (sustituye `[YOUR-PASSWORD]` por la contraseña de la BD)

#### `NODE_ENV`
```
production
```

#### `SESSION_SECRET`
```
5Qd0bCv2y1fsv8xfQIAcZH54gdw6Hxpo190nFZyl30M=
```

4. **Redeploy** el servicio después de actualizar las variables

## Configuración de GitHub Secrets

Debes configurar los siguientes secrets en GitHub:

### Navegación
1. Ve a tu repositorio en GitHub
2. Click en **Settings** → **Secrets and variables** → **Actions**
3. Click en **New repository secret**

### Secrets Requeridos

#### `DATABASE_URL_PRODUCTION`
```
postgresql://postgres:[YOUR-PASSWORD]@db.himyxbrdsnxryetlogzk.supabase.co:5432/postgres
```
- **Descripción**: URL de conexión a Supabase Producción
- **Usado por**: `.github/workflows/deploy-production.yml`

#### `DATABASE_URL_DEVELOPMENT`
```
postgresql://neondb_owner:npg_mFCT5oPH6Ovr@ep-blue-credit-aekag6rz-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```
- **Descripción**: URL de conexión a Neon Development
- **Usado por**: `.github/workflows/deploy-development.yml`

## Flujo de Trabajo

### Desarrollo
1. Trabajar en la rama `development`
2. Mantener `.env` apuntando a la base de datos de desarrollo
3. Al hacer push, GitHub Actions automáticamente:
   - Aplica cambios de schema a Neon Development
   - Pobla datos actualizados

### Producción
1. Trabajar en la rama `main`
2. Mantener `.env` apuntando a la base de datos de producción (Supabase)
3. Al hacer push, GitHub Actions automáticamente:
   - Aplica cambios de schema a Supabase Production
   - Pobla datos actualizados

## Sincronización Manual

### Sincronizar Local → Development
Si usas Neon para desarrollo, el script `sync-local-to-neon.ts` está archivado en `Files_old/scripts/`.
**Producción** usa Supabase (ver `MIGRACION_NEON_A_SUPABASE.md`).

### Listar Usuarios
```bash
npx tsx scripts/list-users.ts
```

### Verificar Datos de Destino
```bash
npx tsx scripts/list-all-destinations.ts
```

## Estructura de .env

### En rama `main` (Producción):
```env
# Supabase Database - PRODUCTION
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.himyxbrdsnxryetlogzk.supabase.co:5432/postgres"

NODE_ENV=production
SESSION_SECRET=dev-secret-key-change-in-production
PORT=5001
```

### En rama `development`:
```env
# Neon Database - DEVELOPMENT
DATABASE_URL="postgresql://neondb_owner:npg_mFCT5oPH6Ovr@ep-blue-credit-aekag6rz-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

NODE_ENV=development
SESSION_SECRET=dev-secret-key-change-in-production
PORT=5001
```

**Nota**: El archivo `.env` está en `.gitignore` y debe mantenerse localmente. No se commitea a Git por seguridad.

## Scripts de Seeding

### `seed-production-full.ts`
Script maestro que ejecuta en orden:
1. `seed-users.ts` - Crea 3 usuarios base
2. `sync-data.ts` - Sincroniza datos de destinations
3. `seed-turquia-esencial.ts` - Pobla Turquía Esencial
4. `seed-lo-mejor-cusco-4d3n.ts` - Pobla Lo Mejor de Cusco
5. `seed-joyas-de-marruecos-8d7n.ts` - Pobla Joyas de Marruecos
6. `seed-dubai-moderno.ts` - Pobla Dubai Moderno
7. `seed-tailandia-clasica-8d7n.ts` - Pobla Tailandia Clásica
8. `seed-vietnam-imperdible-9d8n.ts` - Pobla Vietnam Imperdible
9. `seed-peru-imperdible-7d6n.ts` - Pobla Perú Imperdible
10. `seed-ruta-seda-uzbekistan.ts` - Pobla Ruta de la Seda
11. `seed-jordania-clasica.ts` - Pobla Jordania Clásica
12. `seed-israel-clasico.ts` - Pobla Israel Clásico
13. `seed-egipto-biblico.ts` - Pobla Egipto Bíblico
14. `sync-images.ts` - Sincroniza imágenes
15. `fix-active-status.ts` - Activa destinos

### `sync-local-to-neon.ts`
Sincroniza base de datos local completa a Neon:
- Limpia quotes y quote_destinations (por foreign keys)
- Sincroniza destinations, images, itineraries, hotels, inclusions, exclusions
- Sincroniza usuarios (preserva password hashes)
- Se ejecuta para **ambas** bases de datos (Development y Production)

## Estado Actual

### Ambas Bases de Datos (Development y Production)
- **Destinos**: 11 activos
- **Imágenes**: 167 (en `/public/images/destinations/`)
- **Itinerarios**: 94
- **Hoteles**: 47
- **Inclusiones**: 139
- **Exclusiones**: 56
- **Usuarios**: 8 (con password hashes originales)

### Commits Recientes
- `development`: "Setup development branch with dev workflow and update production workflow" (55f74e6)
- Archivos creados:
  - `.github/workflows/deploy-development.yml`
  - `scripts/sync-local-to-neon.ts`
  - `scripts/migrate-users-dev-to-prod.ts`
  - `scripts/list-users.ts`

## Próximos Pasos

1. ✅ Crear rama `development`
2. ✅ Crear workflow de desarrollo
3. ✅ Actualizar workflow de producción
4. ✅ Push de rama `development` a GitHub
5. ⏳ **Configurar secrets en GitHub** (DATABASE_URL_PRODUCTION, DATABASE_URL_DEVELOPMENT)
6. ⏳ **Probar workflows** haciendo push a cada rama

## Notas Importantes

- **NUNCA** commitear el archivo `.env`
- Siempre verificar en qué rama estás antes de hacer push
- Los workflows se ejecutan automáticamente al hacer push
- Para migración de Neon a Supabase usar `scripts/migrate-neon-to-supabase.ts`
- Las imágenes están en Git (`public/images/destinations/`) - 211 archivos commiteados
