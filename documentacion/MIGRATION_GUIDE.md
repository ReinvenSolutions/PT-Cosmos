# 🔄 Guía de Migraciones de Base de Datos

## ⚠️ IMPORTANTE: Cambios de Schema en Producción

Cuando necesites modificar el schema de la base de datos (agregar/eliminar columnas, tablas, etc.), **NUNCA uses `npm run db:push` directamente en producción**. Este comando puede ser destructivo.

## ✅ Proceso Seguro para Cambios de Schema

### **Paso 1: Hacer cambios en el schema**
Edita `shared/schema.ts` con los cambios necesarios:

```typescript
// Ejemplo: Agregar una nueva columna
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  // Nueva columna
  timezone: text("timezone"), // ← NUEVA
});
```

### **Paso 2: Generar migración**
```bash
npm run db:generate
```

Esto crea un archivo SQL en `migrations/` con los cambios:
```sql
-- migrations/0001_add_timezone.sql
ALTER TABLE users ADD COLUMN timezone TEXT;
```

### **Paso 3: Revisar la migración**
**MUY IMPORTANTE:** Abre el archivo generado y revísalo:

```bash
cat migrations/0001_*.sql
```

Verifica que:
- ✅ No hay `DROP COLUMN` inesperados
- ✅ No hay `DROP TABLE` de datos importantes
- ✅ Los cambios son exactamente lo que quieres

### **Paso 4: Probar en desarrollo (Neon)**
```bash
# Ya estás usando Neon en desarrollo, así que esto actualiza tu DB
npm run db:push
```

Prueba que todo funcione correctamente.

### **Paso 5: Aplicar en producción**

**Opción A: Conectarte directamente a Neon y aplicar SQL**
```bash
psql "postgresql://neondb_owner:npg_mFCT5oPH6Ovr@ep-blue-credit-aekag6rz-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require" < migrations/0001_*.sql
```

**Opción B: Modificar el código para aplicar migraciones automáticamente**
(Ver sección "Migraciones Automáticas" abajo)

### **Paso 6: Hacer commit y push**
```bash
git add migrations/ shared/schema.ts
git commit -m "feat: Add timezone column to users"
git push origin main
```

---

## 🚨 Operaciones PELIGROSAS

### ❌ **NUNCA hagas esto sin backup:**

```sql
-- Eliminar columnas con datos
ALTER TABLE users DROP COLUMN phone;

-- Eliminar tablas
DROP TABLE clientes;

-- Cambiar tipos incompatibles
ALTER TABLE quotes ALTER COLUMN price TYPE integer;
```

### ✅ **Alternativas seguras:**

**1. Agregar columnas nuevas (siempre seguro)**
```sql
ALTER TABLE users ADD COLUMN timezone TEXT;
```

**2. Renombrar en lugar de eliminar**
```sql
-- En lugar de DROP + ADD, usa RENAME
ALTER TABLE users RENAME COLUMN old_name TO new_name;
```

**3. Migración en dos pasos para eliminar columnas**

**Paso 1: Dejar de usar la columna**
```typescript
// Deja de usar phone en el código
// Despliega esto primero
```

**Paso 2: Después de 1-2 semanas, eliminar la columna**
```sql
ALTER TABLE users DROP COLUMN phone;
```

---

## 🔄 Migraciones Automáticas en Producción

Si quieres que Railway aplique migraciones automáticamente, crea este archivo:

```typescript
// server/migrate.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const runMigrations = async () => {
  const connection = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(connection);
  
  console.log('🔄 Running migrations...');
  await migrate(db, { migrationsFolder: './migrations' });
  console.log('✅ Migrations completed');
  
  await connection.end();
};

runMigrations();
```

Luego actualiza `package.json`:
```json
{
  "scripts": {
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "npm run migrate:prod && NODE_ENV=production node dist/index.js",
    "migrate:prod": "tsx server/migrate.ts"
  }
}
```

---

## 💾 Hacer Backup antes de cambios grandes

```bash
# Backup completo de Neon
pg_dump "postgresql://neondb_owner:npg_mFCT5oPH6Ovr@ep-blue-credit-aekag6rz-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require" > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar si algo sale mal
psql "postgresql://..." < backup_20250124_143000.sql
```

---

## 📋 Checklist antes de cambios de schema

- [ ] ✅ Generaste la migración con `npm run db:generate`
- [ ] ✅ Revisaste el SQL generado
- [ ] ✅ Hiciste backup de la base de datos
- [ ] ✅ Probaste en desarrollo (Neon)
- [ ] ✅ No hay operaciones DROP inesperadas
- [ ] ✅ Verificaste que los datos existentes son compatibles
- [ ] ✅ Tienes un plan de rollback

---

## 🆘 Si algo sale mal

**1. Rollback de Railway:**
- Ve a Deployments en Railway
- Click en el deployment anterior que funcionaba
- Selecciona "Redeploy"

**2. Restaurar base de datos desde backup:**
```bash
psql "postgresql://..." < backup_20250124_143000.sql
```

**3. Contactar soporte de Neon:**
- Neon tiene point-in-time recovery
- Puedes restaurar a cualquier momento en las últimas 24h-7 días (según tu plan)
