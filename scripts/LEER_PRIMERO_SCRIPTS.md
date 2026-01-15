# 🚨 GUÍA DE SCRIPTS DE DESTINOS

## ⚠️ **ADVERTENCIA IMPORTANTE**

**NUNCA ejecutes `scripts/sync-data.ts` en producción** sin revisar primero que TODOS los destinos activos estén incluidos en el seed. Este script desactiva TODOS los destinos y solo reactiva los del seed.

---

## 📋 **Scripts Disponibles**

### ✅ **SEGUROS PARA PRODUCCIÓN**

#### 1. `activate-all-destinations.ts` ⭐ **RECOMENDADO**
**Propósito:** Activar TODOS los destinos sin importar su estado actual.

**Cuándo usarlo:**
- Después de cualquier migración o actualización
- Si notas que algún destino está oculto
- Como verificación de rutina

**Cómo ejecutar:**
```bash
# Producción
DATABASE_URL='[URL_PRODUCCION]' NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/activate-all-destinations.ts

# Desarrollo
DATABASE_URL='[URL_DESARROLLO]' NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/activate-all-destinations.ts
```

**Lo que hace:**
- ✅ Encuentra todos los destinos inactivos
- ✅ Los activa automáticamente
- ✅ No elimina ni modifica otros datos
- ✅ Muestra un resumen de cambios

---

#### 2. `activate-all-new-destinations.ts`
**Propósito:** Activar destinos específicos conocidos (Dubai, Colombia, etc.)

**Cuándo usarlo:**
- Después de agregar nuevos destinos específicos
- Para activar destinos individuales conocidos

---

#### 3. `fix-active-status.ts`
**Propósito:** Reactiva todos los destinos (versión simple)

**Cuándo usarlo:**
- Emergencia rápida para reactivar todo
- Similar a `activate-all-destinations.ts` pero más simple

---

### ⚠️ **USAR CON PRECAUCIÓN**

#### `sync-data.ts` ⚠️ **PELIGROSO**
**Propósito:** Sincronizar destinos desde un seed (desactiva TODOS primero)

**⚠️ ADVERTENCIA:**
- Desactiva TODOS los destinos existentes
- Solo reactiva los que están en el seed
- Si el seed no está completo, pierdes destinos

**Cuándo usarlo:**
- Solo en desarrollo local
- Nunca en producción sin verificar el seed completo
- Solo si sabes exactamente lo que estás haciendo

**Antes de ejecutar:**
1. Verifica que el seed incluye TODOS los destinos activos
2. Haz un backup de la base de datos
3. Confirma con el equipo

---

## 🎯 **MEJORES PRÁCTICAS**

### ✅ **Después de cada deployment:**
```bash
# Siempre ejecuta este script en producción después de desplegar
npx tsx scripts/activate-all-destinations.ts
```

### ✅ **Antes de agregar nuevos destinos:**
1. Agregar el destino a través del admin panel o seed
2. Ejecutar `activate-all-destinations.ts`
3. Verificar en la interfaz

### ✅ **Si un destino no aparece:**
1. **Primero:** Ejecuta `activate-all-destinations.ts`
2. Verifica en la base de datos: `isActive = true`
3. Verifica el orden de visualización: `displayOrder`
4. Revisa los logs del servidor

---

## 🔧 **URLs de Base de Datos**

### Producción (Railway):
```
postgresql://neondb_owner:npg_mFCT5oPH6Ovr@ep-late-union-ae03ir4o-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### Desarrollo:
```
postgresql://neondb_owner:npg_mFCT5oPH6Ovr@ep-blue-credit-aekag6rz-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

---

## 📝 **Checklist de Deployment**

- [ ] Código desplegado a GitHub (development + main)
- [ ] Railway build completado
- [ ] **Ejecutar `activate-all-destinations.ts` en producción** ⭐
- [ ] Verificar que todos los destinos están visibles
- [ ] Probar funcionalidad de vuelos de conexión (Turquía + Dubai/Emiratos)

---

## 🆘 **En Caso de Emergencia**

Si algún destino desaparece en producción:

```bash
# 1. Conectarse a producción
DATABASE_URL='[URL_PRODUCCION]' NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/activate-all-destinations.ts

# 2. Verificar
DATABASE_URL='[URL_PRODUCCION]' NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx -e "import {db} from './server/db'; import {destinations} from './shared/schema'; const all = await db.select().from(destinations); console.log(all.filter(d => !d.isActive));"
```

---

## 📞 **Contacto**

Si tienes dudas sobre qué script ejecutar, **SIEMPRE pregunta primero**. Es mejor prevenir que perder datos en producción.

---

*Última actualización: Enero 2026*
