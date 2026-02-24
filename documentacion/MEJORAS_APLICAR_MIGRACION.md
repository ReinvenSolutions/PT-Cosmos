# 🔧 Aplicar Migración del Constraint Único

El constraint único para prevenir duplicados en `itinerary_days` necesita aplicarse manualmente porque `drizzle-kit migrate` intenta aplicar todas las migraciones desde cero.

## ✅ Opción 1: Ejecutar Script (Recomendado)

Ejecuta este comando en tu terminal:

```bash
npm run db:apply-constraint
```

## ✅ Opción 2: Aplicar SQL Directamente

Si el script no funciona, puedes ejecutar el SQL directamente en tu base de datos:

### Paso 1: Conectar a tu base de datos PostgreSQL

Puedes usar:
- **psql** (línea de comandos)
- **pgAdmin** (interfaz gráfica)
- **Drizzle Studio**: `npm run db:studio` y luego ejecutar el SQL

### Paso 2: Ejecutar este SQL

```sql
-- Primero, eliminar duplicados existentes (mantiene la primera ocurrencia)
DELETE FROM itinerary_days
WHERE id NOT IN (
  SELECT DISTINCT ON (destination_id, day_number) id
  FROM itinerary_days
  ORDER BY destination_id, day_number, id
);

-- Luego, agregar el constraint único
ALTER TABLE itinerary_days
ADD CONSTRAINT unique_destination_day UNIQUE (destination_id, day_number);
```

### Paso 3: Verificar que se aplicó

```sql
-- Verificar que el constraint existe
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'itinerary_days' 
AND constraint_name = 'unique_destination_day';
```

Deberías ver una fila con `unique_destination_day`.

## ✅ Opción 3: Usar Drizzle Studio

1. Ejecuta: `npm run db:studio`
2. Abre la consola SQL en Drizzle Studio
3. Copia y pega el SQL de arriba
4. Ejecuta

## ⚠️ Nota Importante

- **Backup**: Si tienes datos importantes, haz un backup antes de ejecutar
- **Duplicados**: El script elimina duplicados automáticamente, manteniendo la primera ocurrencia
- **Sin duplicados**: Si no hay duplicados, el constraint se agregará sin problemas

## 🎯 Resultado Esperado

Después de aplicar la migración:
- ✅ No se podrán insertar duplicados en `itinerary_days`
- ✅ La base de datos garantiza integridad a nivel de BD
- ✅ El código también previene duplicados, pero ahora hay doble protección

---

**Archivo SQL original:** `migrations/0003_add_unique_constraint_itinerary_days.sql`
