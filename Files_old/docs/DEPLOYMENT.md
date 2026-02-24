# 🚀 Guía de Deployment Automático

## Resumen

Este sistema sincroniza automáticamente **todos los cambios** (código + datos de base de datos) a producción cuando haces deploy en Replit.

## ¿Cómo Funciona?

### Deployment Automático

1. **Haces clic en "Deploy" en Replit**
2. **El sistema automáticamente:**
   - ✅ Construye la aplicación (`npm run build`)
   - ✅ Aplica cambios de esquema a la base de datos (`db:push`)
   - ✅ Sincroniza datos canónicos (destinos, itinerarios, hoteles, etc.)
   - ✅ Inicia el servidor en producción

### Sincronización de Datos

El sistema utiliza **datos canónicos** definidos en `shared/seed-data.ts` que se sincronizan automáticamente con producción cada vez que la aplicación se inicia en deployment.

#### ¿Qué se Sincroniza?

- **Destinos**: Solo "Turquía Esencial" está activo
- **Itinerarios**: 10 días completos del recorrido
- **Hoteles**: 12 hoteles en 4 ubicaciones
- **Inclusiones**: 11 items incluidos en el paquete
- **Exclusiones**: 5 items no incluidos

#### Comportamiento

- **Desactiva** todos los destinos existentes
- **Actualiza o inserta** el destino "Turquía Esencial"
- **Reemplaza** todos los datos relacionados (itinerarios, hoteles, inclusiones, exclusiones)
- **Idempotente**: Puede ejecutarse múltiples veces sin duplicar datos

## Flujo de Deployment

```
┌─────────────────────────────────────────────────┐
│  1. Usuario hace clic en "Deploy" en Replit    │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  2. Replit construye la aplicación              │
│     (npm run build)                             │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  3. Replit inicia servidor (npm run start)      │
│     - NODE_ENV=production                       │
│     - REPLIT_DEPLOYMENT=1                       │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  4. Servidor detecta entorno de deployment      │
│     (server/index.ts)                           │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  5. Ejecuta seed inicial si BD está vacía       │
│     (server/seed.ts)                            │
│     - Crea usuarios base (admin, advisor1)      │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  6. Sincroniza datos canónicos SIEMPRE          │
│     (server/sync-canonical-data.ts)             │
│     - Verifica y aplica cambios de esquema      │
│     - Desactiva destinos antiguos               │
│     - Actualiza "Turquía Esencial"              │
│     - Sincroniza todos los datos relacionados   │
│     - Limpia datos duplicados                   │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  7. ✅ Aplicación lista en producción           │
│     con datos actualizados                      │
└─────────────────────────────────────────────────┘
```

## Archivos Clave

### 1. `shared/seed-data.ts`
**Fuente de verdad** para todos los datos del sistema.
```typescript
export const seedDestinations = [...];  // Turquía Esencial
export const seedItineraryDays = [...]; // 10 días de itinerario
export const seedHotels = [...];        // 12 hoteles
export const seedInclusions = [...];    // 11 inclusiones
export const seedExclusions = [...];    // 5 exclusiones
```

### 2. `server/sync-canonical-data.ts`
Módulo que sincroniza los datos canónicos con la base de datos.
- Solo se ejecuta en producción (`NODE_ENV=production`)
- Detecta automáticamente deployment de Replit (`REPLIT_DEPLOYMENT=1`)
- **Verifica y aplica cambios de esquema** (ej: campo TRM)
- Operación idempotente y segura
- Limpia datos duplicados automáticamente

### 3. `server/index.ts`
Punto de entrada que orquesta el inicio de la aplicación.
```typescript
if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1") {
  await seedDatabaseIfEmpty();      // Seed inicial
  await syncCanonicalData();        // Sincronización automática
}
```

### 4. `scripts/sync-data.ts`
Script CLI para sincronización manual (opcional).
```bash
# En desarrollo
npm run db:seed

# En producción (manual)
ALLOW_PROD_DATA_SYNC=true npm run db:seed
```

## Cambiar Datos del Sistema

### Para actualizar destinos, itinerarios, hoteles, etc:

1. **Edita** `shared/seed-data.ts`
2. **Haz commit** de los cambios
3. **Click en "Deploy"** en Replit
4. **¡Listo!** Los datos se sincronizan automáticamente

### Ejemplo: Actualizar precio base de Turquía Esencial

```typescript
// shared/seed-data.ts
export const seedDestinations = [
  {
    id: TURKEY_ESENCIAL_ID,
    name: 'Turquía Esencial',
    basePrice: '750.00', // ← Cambiar de 710.00 a 750.00
    // ...resto de campos
  },
];
```

Después de hacer deploy, el precio se actualizará automáticamente en producción.

## Verificación

### Logs de Deployment

Durante el deployment, verás en los logs:

```
========================================
🔄 SINCRONIZACIÓN DE DATOS CANÓNICOS
========================================
Entorno: production
Deployment: SÍ
========================================

0️⃣  Verificando esquema de base de datos...
   ✅ Esquema verificado y actualizado

1️⃣  Desactivando destinos antiguos...
   ✅ Destinos desactivados

2️⃣  Sincronizando destinos activos...
   ✅ Actualizado: Turquía Esencial

3️⃣  Limpiando datos relacionados antiguos...
   ✅ Datos antiguos eliminados

4️⃣  Insertando itinerarios...
   ✅ 10 días de itinerario insertados

5️⃣  Insertando hoteles...
   ✅ 12 hoteles insertados

6️⃣  Insertando inclusiones...
   ✅ 11 inclusiones insertadas

7️⃣  Insertando exclusiones...
   ✅ 5 exclusiones insertadas

8️⃣  Verificando sincronización...

========================================
✅ SINCRONIZACIÓN COMPLETADA
========================================
Destinos activos: 1
  - Turquía Esencial (Turquía)
========================================
```

## Sincronización Manual (Opcional)

Si necesitas ejecutar la sincronización manualmente en producción:

```bash
# Conectar a la base de datos de producción manualmente
# Y ejecutar:
ALLOW_PROD_DATA_SYNC=true NODE_ENV=production tsx scripts/sync-data.ts
```

**Nota:** Esto normalmente no es necesario porque el deployment automático ya lo hace.

## Seguridad

### Protecciones Implementadas

1. **Variable de entorno**: `ALLOW_PROD_DATA_SYNC=true` requerida para sincronización manual
2. **Detección de deployment**: `REPLIT_DEPLOYMENT=1` permite ejecución automática en deployment
3. **Validación de entorno**: Solo se ejecuta en producción
4. **Operación idempotente**: Puede ejecutarse múltiples veces sin duplicar datos
5. **Manejo de errores**: Si falla la sincronización, la aplicación continúa funcionando

## Rollback

Si necesitas revertir cambios:

1. **Opción 1: Revertir código en Git**
   - Revertir el commit que cambió `shared/seed-data.ts`
   - Hacer deploy nuevamente

2. **Opción 2: Usar Rollback de Replit**
   - Usar la función de rollback integrada de Replit
   - Esto revierte tanto código como base de datos

## Preguntas Frecuentes

### ¿Puedo agregar más destinos?

Sí, edita `shared/seed-data.ts`:

```typescript
export const seedDestinations = [
  {
    id: TURKEY_ESENCIAL_ID,
    name: 'Turquía Esencial',
    // ... datos existentes
  },
  {
    id: 'nuevo-id-uuid',
    name: 'Nuevo Destino',
    country: 'País',
    duration: 7,
    nights: 6,
    basePrice: '800.00',
    isActive: true,
    // ... otros campos
  },
];
```

### ¿Los datos de usuarios se sincronizan?

No, solo se sincronizan:
- Destinos
- Itinerarios
- Hoteles
- Inclusiones
- Exclusiones

Los usuarios, clientes y cotizaciones **NO** se modifican durante la sincronización.

### ¿Qué pasa con las cotizaciones existentes?

Las cotizaciones existentes **NO** se eliminan ni modifican. Solo se actualizan los datos maestros (destinos, itinerarios, etc.).

### ¿Puedo probar en desarrollo?

Sí, puedes ejecutar manualmente:

```bash
# En desarrollo (sin protecciones)
NODE_ENV=development tsx scripts/sync-data.ts
```

O simplemente reinicia el servidor en modo desarrollo y el seed se ejecutará automáticamente.

## Troubleshooting

### La sincronización no se ejecuta

Verifica:
- `NODE_ENV=production` está configurado
- O `REPLIT_DEPLOYMENT=1` está presente
- Revisa los logs de deployment en Replit

### Error durante la sincronización

La aplicación continuará funcionando con los datos existentes. Revisa los logs para detalles del error.

### Datos no se actualizan

1. Verifica que `shared/seed-data.ts` tiene los cambios correctos
2. Confirma que hiciste deploy después de los cambios
3. Revisa los logs de deployment para confirmar la sincronización

---

**Última actualización**: Noviembre 2025
