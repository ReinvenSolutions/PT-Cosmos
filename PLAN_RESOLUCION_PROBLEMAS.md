# Plan de Resolución de Problemas - ViajeRapido

## Resumen Ejecutivo

Este documento describe un plan estructurado para resolver tres categorías de problemas identificados:

1. **Vulnerabilidades de seguridad en la base de datos** (Supabase Security Advisor)
2. **Errores de funcionalidad** (pantalla blanca en itinerario, datos no guardados)
3. **Mejoras de rendimiento** (guardado en tiempo real, eficiencia)

---

## Parte 1: Vulnerabilidades de Seguridad (Base de Datos)

### 1.1 Diagnóstico

El Security Advisor de Supabase/Cosmos reporta:

| Tipo | Cantidad | Descripción |
|------|----------|-------------|
| **RLS Disabled in Public** | 15 tablas | Row Level Security no habilitado en tablas expuestas a PostgREST |
| **Sensitive Columns Exposed** | 1 tabla | `password_reset_tokens` expone columnas sensibles (token, etc.) |

**Tablas afectadas por RLS:**
- `public.clients`
- `public.exclusions`
- `public.hotels`
- `public.inclusions`
- `public.itinerary_days`
- `public.quote_logs`
- `public.quotes`
- `public.sessions`
- `public.destination_images`
- `public.quote_destinations`
- `public.users`
- `public.terms_conditions`
- `public.destinations`
- `public.two_factor_sessions`
- `public.password_reset_tokens`

**Contexto:** El proyecto usa Drizzle ORM con conexión directa a PostgreSQL. Sin embargo, Supabase expone PostgREST por defecto, lo que permite acceso directo a las tablas si alguien obtiene las credenciales. RLS protege contra acceso no autorizado incluso si PostgREST está habilitado.

### 1.2 Estrategia de Resolución

#### Opción A: Habilitar RLS con políticas restrictivas (Recomendado)

1. **Crear migración SQL** con:
   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` para cada tabla
   - Políticas que permitan acceso solo al rol `service_role` o `authenticated` según corresponda
   - Para tablas de autenticación (`sessions`, `password_reset_tokens`, `two_factor_sessions`): políticas muy restrictivas

2. **Proteger `password_reset_tokens`:**
   - No exponer esta tabla vía PostgREST (revocar permisos en schema public si es posible)
   - O crear política RLS que niegue todo acceso excepto al backend (service_role)

#### Opción B: Deshabilitar PostgREST para tablas sensibles

- En Supabase Dashboard: Settings → API → deshabilitar exposición de tablas sensibles
- Menos flexible que RLS

### 1.3 Archivos a Crear/Modificar

| Archivo | Acción |
|---------|--------|
| `migrations/0009_enable_rls_policies.sql` | Nueva migración con RLS |
| `documentacion/RLS_POLICIES.md` | Documentar políticas aplicadas |

### 1.4 Orden de Ejecución Recomendado

1. Crear migración con políticas RLS para todas las tablas
2. Probar en entorno de desarrollo/staging
3. Verificar que la aplicación Express sigue funcionando (usa conexión directa, no PostgREST)
4. Aplicar en producción
5. Revisar Security Advisor para confirmar que los errores desaparecieron

---

## Parte 2: Errores de Funcionalidad

### 2.1 Pantalla blanca al pasar a pestaña Itinerario (programa nuevo)

#### Diagnóstico

**Ubicación:** `client/src/pages/admin-plan-form.tsx`

**Flujo:**
- Ruta `/admin/plans/new` → `id = null`, `isEditing = false`
- `useQuery` con `enabled: isEditing && !!id` → **no se ejecuta**
- `existing` es `undefined`, estados iniciales vacíos
- Al hacer clic en pestaña "Itinerario", se renderiza `TabsContent value="itinerario"`

**Posibles causas del crash:**

1. **Collapsible con `key={i}`** cuando `itinerary` está vacío: `itinerary.map()` devuelve `[]` → no debería crashear
2. **ItineraryMapGallery**: hace `useQuery` a `/api/admin/itinerary-map-images` → si falla, `data` puede ser `undefined`; el código usa `data?.images?.map` → seguro
3. **FlightImageGallery** (cuando `hasInternalOrConnectionFlight`): usa `internalFlights.map()` → si hay items con `imageUrl` vacío, `useSortable({ id: url })` con `id: ""` podría causar conflictos en @dnd-kit
4. **Error no capturado** en algún componente hijo que no tiene ErrorBoundary

#### Hipótesis principal

- **DndContext/SortableContext** en la sección de imágenes (línea ~1617) podría estar dentro del TabsContent de itinerario o en otro lugar. Si hay un `SortableContext` con `items` que incluye strings vacíos o duplicados, @dnd-kit puede fallar.
- **TabsContent lazy rendering**: Radix Tabs por defecto monta el contenido al cambiar de pestaña. Al montar, si hay un error en el árbol de componentes, React muestra pantalla blanca.

#### Acciones de investigación

1. Añadir `ErrorBoundary` alrededor del contenido de la pestaña itinerario para capturar el error real
2. Revisar si `FlightImageGallery` se renderiza cuando `hasInternalOrConnectionFlight` es false (no debería)
3. Verificar que `itinerary` nunca tenga items con estructura incompleta que rompa el render
4. Revisar la consola del navegador al reproducir el error

#### Solución propuesta

1. **Envolver TabsContent de itinerario en ErrorBoundary** para identificar el error exacto
2. **Validar estructura de `ItineraryDay`** antes de renderizar: asegurar que cada día tenga `dayNumber`, `title`, `description` como mínimo
3. **Revisar `addItineraryDay`**: el objeto creado debe ser compatible con el schema (incluir `location` como opcional)
4. **Evitar ids vacíos en SortableContext**: si `internalFlights` tiene items con `imageUrl` vacío, filtrar o usar un id fallback como `index`

### 2.2 Comentarios, términos y condiciones no se guardan

#### Diagnóstico

**Ubicación:** `client/src/pages/admin-plan-form.tsx` + `server/routes.ts` + `server/storage.ts`

**Campos afectados:**
- `firstPageComments` (comentarios primera hoja del PDF)
- `termsConditions` (términos generales del plan)
- `flightTerms` (términos debajo de cada vuelo)

**Flujo actual:**
1. Usuario edita en los `Textarea` de la pestaña "Básico"
2. Estado local: `firstPageComments`, `termsConditions`, `flightTerms`
3. Al hacer clic en "Guardar", `handleSave()` construye `payload` con estos campos
4. `saveMutation.mutate(payload)` → `PUT /api/admin/destinations/:id` o `POST /api/admin/destinations`
5. Server: `fullDestinationSchema.parse(req.body)` → `destData` incluye los 3 campos
6. `storage.updateDestination(id, destData)` o `storage.createDestination(destData)`

**Verificación en código:**
- `handleSave` (líneas 317-320): incluye `firstPageComments`, `flightTerms`, `termsConditions` en el payload ✓
- `server/routes.ts` (líneas 992-995, 1063-1066): incluye en `destData` ✓
- `storage.updateDestination`: recibe `Partial<InsertDestination>` que incluye estos campos ✓

#### Posibles causas

1. **Guardado solo al hacer clic en "Guardar"**: Si el usuario edita y cambia de pestaña sin guardar, se pierde. ¿El usuario espera autoguardado?
2. **Validación Zod**: Si `fullDestinationSchema` falla en otro campo, toda la request falla y no se persiste nada
3. **Campo vacío**: `firstPageComments || null` → si está vacío se envía `null`. La BD acepta null. Debería guardarse.
4. **Modal vs inline**: Existe `TermsConditionsModal` y `FirstPageCommentsModal` en `plan-modals/`. Si el usuario edita en el modal pero el modal no llama `onSave` correctamente, o si hay dos fuentes de verdad (modal vs Textarea inline), podría haber desincronización.

**Revisión de modales:**
- `first-page-comments-modal.tsx`: recibe `firstPageComments`, `onSave`. Al guardar llama `onSave(value)`.
- `terms-conditions-modal.tsx`: recibe `termsConditions`, `flightTerms`, `onSave`. Al guardar llama `onSave(generalTerms, flightTermsValue)`.

En `admin-plan-form.tsx` los campos están en **Textarea inline** (líneas 953-989), no en modales. Los modales podrían usarse en otro flujo. El guardado debería funcionar si el usuario hace clic en el botón Guardar principal.

#### Hipótesis

1. **El usuario no hace clic en "Guardar"** y espera que se guarde al cambiar de pestaña
2. **Error silencioso**: la mutación falla pero el toast de error no se muestra correctamente
3. **Invalidación de cache**: después de guardar, `queryClient.invalidateQueries` redirige a `/admin/plans` con `setLocation`. Si hay un error antes, no se ve el resultado.
4. **Race condition**: si el usuario guarda muy rápido dos veces, podría haber conflictos

#### Solución propuesta

1. **Implementar autoguardado (debounce)** para comentarios, términos y condiciones al salir del campo o cada X segundos
2. **Guardado por pestaña**: al cambiar de pestaña, guardar automáticamente los cambios de la pestaña actual
3. **Feedback visual**: mostrar indicador "Guardando..." y "Guardado" para que el usuario sepa que se persistió
4. **Logs en servidor**: añadir logs al recibir y persistir estos campos para verificar que llegan correctamente

---

## Parte 3: Tiempo Real y Eficiencia

### 3.1 Requisitos

- Los cambios deben reflejarse en tiempo real en la UI
- El proceso de guardado debe ser más eficiente y rápido

### 3.2 Estado actual

- **Guardado:** Se hace con `PUT`/`POST` completo al hacer clic en "Guardar"
- **Actualización UI:** `queryClient.invalidateQueries` + redirección a lista de planes
- **Sin realtime:** No hay WebSockets ni Supabase Realtime

### 3.3 Estrategia

#### Opción A: Optimistic updates + invalidación

1. Al guardar: actualizar cache de inmediato (optimistic update) antes de que responda el servidor
2. Si falla: revertir cambios
3. Reducir invalidación: solo invalidar las queries afectadas, no toda la lista

#### Opción B: Guardado parcial (PATCH)

1. En lugar de enviar todo el payload, enviar solo los campos modificados
2. Endpoint `PATCH /api/admin/destinations/:id` con body parcial
3. Menos datos transferidos, más rápido

#### Opción C: Supabase Realtime (opcional)

1. Suscribirse a cambios en `destinations` vía Supabase Realtime
2. Cuando otro usuario o pestaña modifique, actualizar UI
3. Requiere más complejidad y configuración

### 3.4 Recomendación

1. **Corto plazo:** Optimistic updates + invalidación selectiva
2. **Medio plazo:** Guardado por PATCH para campos que cambian frecuentemente
3. **Largo plazo:** Evaluar Supabase Realtime si hay múltiples usuarios editando simultáneamente

---

## Parte 4: Plan de Implementación (Orden sugerido)

### Fase 1: Diagnóstico y corrección de pantalla blanca (1-2 días)

1. Añadir ErrorBoundary en el TabsContent de itinerario
2. Reproducir el error y capturar el stack trace
3. Corregir la causa raíz (probablemente ids en SortableContext o estructura de datos)
4. Probar en plan nuevo y plan existente

### Fase 2: Comentarios y términos no guardados (1 día)

1. Añadir logs en el servidor al recibir `firstPageComments`, `termsConditions`, `flightTerms`
2. Verificar que el payload llega correctamente
3. Implementar autoguardado con debounce (500-1000ms) para estos campos
4. O implementar guardado al cambiar de pestaña

### Fase 3: Seguridad RLS (1-2 días)

1. Crear migración `0009_enable_rls_policies.sql`
2. Definir políticas por tabla según rol (service_role vs anon)
3. Probar en desarrollo
4. Aplicar en producción
5. Revisar Security Advisor

### Fase 4: Eficiencia y tiempo real (2-3 días)

1. Implementar optimistic updates en saveMutation
2. Implementar PATCH parcial para actualizaciones
3. Reducir invalidación de queries
4. (Opcional) Evaluar Supabase Realtime

---

## Archivos Clave por Problema

| Problema | Archivos principales |
|----------|------------------------|
| Pantalla blanca itinerario | `client/src/pages/admin-plan-form.tsx`, `client/src/components/itinerary-map-gallery.tsx`, `client/src/components/flight-image-gallery.tsx` |
| Comentarios/términos no guardan | `client/src/pages/admin-plan-form.tsx`, `server/routes.ts`, `server/storage.ts` |
| RLS | `migrations/` (nueva), `shared/schema.ts` |
| Eficiencia | `client/src/pages/admin-plan-form.tsx`, `client/src/lib/queryClient.ts`, `server/routes.ts` |

---

## Próximos pasos inmediatos

1. **Reproducir** el error de pantalla blanca:
   - Ir a `/admin/plans/new`
   - Llenar nombre y país (mínimo)
   - Clic en pestaña "Itinerario"
   - Abrir consola del navegador (F12) y capturar errores

2. **Verificar** guardado de comentarios/términos:
   - Editar un plan existente
   - Cambiar comentarios
   - Guardar
   - Recargar y verificar si persisten

3. **Revisar** logs del servidor al guardar para confirmar que los campos llegan correctamente
