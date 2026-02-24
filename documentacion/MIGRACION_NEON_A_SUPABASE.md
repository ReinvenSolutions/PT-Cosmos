# Guía de Migración: Neon → Supabase (Producción)

Migración completa de la **rama producción** desde Neon a Supabase, sin perder usuarios, contraseñas ni datos.

## Connection string de Supabase (Producción)

```
postgresql://postgres:[YOUR-PASSWORD]@db.himyxbrdsnxryetlogzk.supabase.co:5432/postgres
```

---

## Requisitos previos

1. **Proyecto Supabase** en [supabase.com](https://supabase.com)
2. **Connection string** de Supabase (Settings → Database → Connection string)
3. **Connection string de Neon producción** (fuente de datos a migrar)

---

## Paso 1: Aplicar el schema en Supabase

Antes de migrar datos, debes crear las tablas vacías en Supabase:

```bash
DATABASE_URL="<TU_SUPABASE_DATABASE_URL>" npx drizzle-kit push
```

Cuando pregunte confirmación, responde **Y** (Yes).

---

## Paso 2: Ejecutar la migración de datos

```bash
NEON_DATABASE_URL="<URL_NEON_PRODUCCIÓN>" \
SUPABASE_DATABASE_URL="<URL_SUPABASE>" \
npx tsx Files_old/scripts/migrate-neon-to-supabase.ts
```

O usando el script de npm:

```bash
NEON_DATABASE_URL="<URL_NEON>" SUPABASE_DATABASE_URL="<URL_SUPABASE>" npx tsx Files_old/scripts/migrate-neon-to-supabase.ts
```

**Con variables en .env** (el script carga automáticamente):
```bash
# Asegúrate de tener en .env: DATABASE_URL (Neon) y SUPABASE_DATABASE_URL
npx tsx Files_old/scripts/migrate-neon-to-supabase.ts
```

---

## Paso 3: Verificación

El script realiza automáticamente:

- Migración de todas las tablas en orden correcto (respetando foreign keys)
- Verificación de conteos (Neon vs Supabase)
- Comprobación de que los hashes de contraseña de usuarios se conservan

Si todo es correcto, verás:

```
✅ MIGRACIÓN COMPLETADA EXITOSAMENTE
```

---

## Paso 4: Actualizar la aplicación (CHECKLIST PRODUCCIÓN)

- [ ] **Railway** – Cambiar `DATABASE_URL` a la URL de Supabase y redesplegar
- [ ] **GitHub Secrets** – Actualizar `DATABASE_URL_PRODUCTION` con la URL de Supabase (si usas CI/CD)
- [ ] **README.md, BRANCH_STRATEGY.md, RAILWAY_DEPLOYMENT.md** – Ya actualizados para Supabase

---

## Paso 5: Comprobaciones post-migración

- [ ] **Login** – Todos los usuarios pueden iniciar sesión con sus contraseñas
- [ ] **Cotizaciones** – Se listan y abren correctamente
- [ ] **Clientes** – Datos completos
- [ ] **Destinos** – Itinerarios, hoteles, inclusiones y exclusiones visibles
- [ ] **Imágenes de destinos** – Se cargan bien (Supabase)
- [ ] **Imágenes de vuelos** – Las adjuntas a cotizaciones funcionan (Supabase/local)

---

## Qué se preserva

| Dato              | Conservado |
|-------------------|------------|
| Usuarios          | ✅ Sí      |
| Contraseñas (bcrypt) | ✅ Sí   |
| Clientes          | ✅ Sí      |
| Cotizaciones      | ✅ Sí      |
| Destinos e itinerarios | ✅ Sí  |
| Hoteles, inclusiones, exclusiones | ✅ Sí |
| Imágenes de destinos | ✅ Sí  |
| Sesiones activas  | ✅ Sí (se migran, pero los usuarios deberán volver a iniciar sesión tras el cambio de DB) |

---

## En caso de error

- **Duplicados / conflicto de claves**: Asegúrate de que Supabase esté vacío antes de migrar. Si ya hay datos, tendrás que truncar las tablas manualmente o usar una base Supabase nueva.
- **Error de conexión**: Comprueba que las URLs son correctas y que Supabase permite conexiones desde tu IP (por defecto permite todo).
- **Conteos no coinciden**: Revisa el log del script para ver en qué tabla falló. Puedes ejecutar la migración de nuevo tras truncar las tablas en Supabase.

---

## Notas técnicas

- Las contraseñas se almacenan como hashes bcrypt en `password_hash` y se copian byte a byte.
- El script usa `pg` (node-postgres); Neon y Supabase son PostgreSQL estándar.
- Se respeta el orden de inserción según las foreign keys.

## Resumen: Producción completa en Supabase

| Componente       | Estado   |
|------------------|----------|
| Base de datos    | Supabase |
| Railway DATABASE_URL | Supabase URL |
| Documentación    | Actualizada |
| Usuarios/contraseñas | Migrados |
