# Protección de Planes en Producción

## Regla fundamental

**Los planes que ya están en la base de datos de producción son la fuente de verdad. NUNCA deben ser sobrescritos, reemplazados o desactivados por datos de desarrollo.**

## Comportamiento actual

### Migraciones (`npm run db:migrate`)

- Solo aplican cambios de **esquema** (nuevas columnas, tablas, índices).
- **No insertan ni modifican datos** de destinos/planes.
- Son seguras de ejecutar en producción.

### Arranque del servidor (producción)

- **Por defecto**: NO ejecuta sincronización de datos canónicos.
- Solo ejecuta `seedDatabaseIfEmpty()` si la BD está completamente vacía (crea usuarios base).
- Para habilitar sync (no recomendado): `ALLOW_DATA_SYNC=true`

### Seed de producción (`npm run db:seed`)

- Ejecuta: `seed-users`, `sync-images`, `fix-active-status`.
- **NO ejecuta** `sync-data.ts` (que desactivaría todos los planes y los reemplazaría por seed-data).

## Scripts que NO deben ejecutarse en producción

| Script | Riesgo |
|--------|--------|
| `scripts/sync-data.ts` | Desactiva TODOS los destinos y los reemplaza por seed-data. Destructivo. |
| `server/sync-canonical-data.ts` | Sobrescribe itinerarios, hoteles, inclusiones de planes en seed-data. |

Si necesitas ejecutarlos (casos excepcionales):

```bash
ALLOW_PROD_DATA_SYNC=true npx tsx scripts/sync-data.ts
```

## Agregar nuevos planes

Los planes se agregan desde el **panel de administración** (Admin → Planes). No desde seed ni scripts.

## Resumen

- **Migraciones**: Solo esquema. Seguras.
- **Deploy/Push**: No toca planes existentes.
- **Planes nuevos**: Crear desde el admin.
