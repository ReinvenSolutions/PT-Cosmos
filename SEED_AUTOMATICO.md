# 🌱 Sistema de Seed Automático de Base de Datos

## ¿Qué hace?

Este sistema **puebla automáticamente la base de datos de producción** cuando haces deploy, exactamente como en tus otros proyectos de Replit.

## Cómo funciona

Cuando la aplicación arranca en **producción** (NODE_ENV=production):

1. ✅ Verifica si la base de datos ya tiene destinos
2. ✅ Si está vacía, automáticamente importa:
   - **38 destinos** con todos sus detalles
   - Itinerarios día por día
   - Información de hoteles
   - Inclusiones y exclusiones
   - **2 usuarios base** (admin y advisor1)
   - **Clientes de ejemplo**

3. ✅ Si la base de datos ya tiene datos, **no hace nada** (no sobrescribe)

## Archivos involucrados

### `server/seed.ts`
Script inteligente que:
- Verifica si la BD está vacía mirando la tabla `destinations`
- Crea usuarios base (admin, advisor1) si no existen
- Importa datos desde `export-production-data.sql`
- Maneja errores sin romper la aplicación

### `server/index.ts`
Modificado para ejecutar el seed automáticamente:
```typescript
if (process.env.NODE_ENV === "production") {
  await seedDatabaseIfEmpty();
}
```

### `export-production-data.sql`
Archivo SQL con todos los datos de desarrollo (1,240 líneas):
- Destinos completos
- Itinerarios
- Hoteles
- Inclusiones/Exclusiones
- Usuarios
- Clientes

## Flujo de Deployment

```
1. Haces deploy en Replit
   ↓
2. Replit construye la aplicación (npm run build)
   ↓
3. Replit ejecuta la aplicación (npm run start)
   ↓
4. Servidor arranca y detecta NODE_ENV=production
   ↓
5. Ejecuta seedDatabaseIfEmpty()
   ↓
6. Verifica si hay destinos en la BD
   ↓
7a. BD vacía → Importa todos los datos ✅
7b. BD con datos → No hace nada ✅
   ↓
8. Aplicación lista para usar 🎉
```

## Ventajas

✅ **Automático**: No necesitas hacer nada manualmente  
✅ **Seguro**: Solo puebla si está vacío, nunca sobrescribe  
✅ **Completo**: Incluye todos los datos necesarios para operar  
✅ **Sin downtime**: Se ejecuta al arrancar, antes de aceptar peticiones  
✅ **Igual que otros proyectos**: Funciona como estás acostumbrado  

## Logs que verás en producción

Primera vez (BD vacía):
```
🔍 Verificando estado de la base de datos...
📊 Base de datos vacía detectada. Iniciando seed automático...
👤 Verificando usuarios base...
   ✓ Usuario admin creado
   ✓ Usuario advisor1 creado
🌍 Importando datos desde archivo SQL...
   ✓ Datos importados exitosamente
   📋 Incluye: 38 destinos con itinerarios, hoteles, inclusiones y exclusiones
✅ Seed completado exitosamente!
```

Deployments posteriores (BD con datos):
```
🔍 Verificando estado de la base de datos...
✅ Base de datos ya poblada. Omitiendo seed.
```

## Usuarios creados automáticamente

| Usuario | Contraseña | Rol | Email |
|---------|------------|-----|-------|
| admin | admin123 | super_admin | admin@sistema.com |
| advisor1 | advisor123 | advisor | advisor1@sistema.com |

⚠️ **Importante**: Cambia estas contraseñas después del primer login en producción.

## Actualizar datos en producción

Si actualizas destinos en desarrollo y quieres reflejarlos en producción:

1. Exporta nuevamente los datos:
   ```bash
   pg_dump -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE \
     -t destinations -t itinerary_days -t hotels -t inclusions -t exclusions \
     --data-only --column-inserts > export-production-data.sql
   ```

2. Haz commit y push del archivo actualizado

3. Haz deploy en Replit

4. **Opción A (Automática)**: 
   - Vacía la tabla destinations en producción
   - El seed automático detectará la BD vacía y poblará

5. **Opción B (Manual)**:
   - Ejecuta el SQL manualmente desde el panel de base de datos

## Troubleshooting

### "No se importaron los datos"
- Verifica que `export-production-data.sql` existe en la raíz del proyecto
- Revisa los logs de producción para ver mensajes de error específicos

### "Archivo export-production-data.sql no encontrado"
- El archivo debe estar en el repositorio
- Verifica que se incluyó en el deploy

### "Error importando datos SQL"
- El SQL puede tener conflictos con datos existentes
- Considera vaciar las tablas antes si quieres repoblar

## Diferencia con otros proyectos

En tus otros proyectos de Replit probablemente:
- Usan un ORM diferente con migraciones automáticas de datos
- Tienen un script de seed en el `build` command
- O usan una integración específica de Replit

Este proyecto ahora funciona **igual**: deploy → actualiza schema → puebla datos automáticamente.
