# Plan de Mejoras: Carga Rápida, Skeletons y Guardado en Tiempo Real

## Resumen del Problema

1. **Carga lenta**: Al entrar al dashboard, cotizaciones o secciones, la información e imágenes tardan en cargar.
2. **Sin feedback visual**: El usuario no sabe si está cargando o si hay error.
3. **Guardado de planes lento**: Al activar/desactivar switches o guardar cambios en planes, el proceso tarda y no hay indicador claro.
4. **Actualización no inmediata**: Los cambios no se reflejan en tiempo real en todo el sistema.

---

## Estado Actual (Hallazgos)

### Lo que ya existe
- **Skeleton** en `admin-dashboard.tsx` para "Cotizaciones recientes" (líneas 591-605).
- **Admin plan form**: El botón Guardar muestra "Guardando..." cuando `saveMutation.isPending` está activo.
- **Admin plans - toggle**: Ya usa **optimistic update** (`onMutate`) para actualizar la UI antes de la respuesta del servidor.
- **Componente Skeleton** disponible en `@/components/ui/skeleton.tsx`.

### Lo que falta o está incompleto
- **Home**: Sin skeleton para destinos; carga detalles de TODOS los destinos en paralelo (puede ser lento).
- **Admin plans tabla**: Solo texto "Cargando planes..." en lugar de skeleton.
- **Admin dashboard**: KPI cards, gráficos y otras secciones sin skeleton.
- **Advisor dashboard**: Solo texto "Cargando cotizaciones...".
- **Quote summary**: Sin skeleton para destinos/clientes.
- **Switch en admin plans**: No hay indicador de carga por fila cuando se está guardando.
- **Admin plan form**: El botón muestra "Guardando..." pero no un spinner visible.
- **Invalidación excesiva**: Tras toggle o guardar se invalidan muchas queries, provocando refetches innecesarios.

---

## Plan de Implementación

### Fase 1: Skeletons en todas las vistas de carga (Prioridad Alta)

| Página | Ubicación | Acción |
|--------|-----------|--------|
| **Home** | Grid de destinos | Skeleton de cards (imagen + texto) mientras `destinations` carga |
| **Home** | Detalles expandidos | Skeleton breve al expandir card si aún no hay `destinationDetails` |
| **Admin Plans** | Tabla de planes | Skeleton de filas (8-10 filas) en lugar de "Cargando planes..." |
| **Admin Dashboard** | KPI cards | Skeleton para cada KPI mientras `summaryLoading` |
| **Admin Dashboard** | Gráfico de tendencias | Skeleton rectangular mientras `trendLoading` |
| **Admin Dashboard** | Top destinos | Skeleton de lista |
| **Advisor Dashboard** | Grid de cotizaciones | Skeleton de cards (3 columnas) |
| **Quote Summary** | Sección destinos/clientes | Skeleton mientras cargan `destinations` y `clients` |

**Componentes reutilizables sugeridos:**
- `DestinationCardSkeleton` (para Home y quote-summary)
- `PlanTableRowSkeleton` (para admin-plans)
- `QuoteCardSkeleton` (para advisor-dashboard)
- `KPICardSkeleton` (para admin-dashboard)

---

### Fase 2: Feedback visual en guardado de planes (Prioridad Alta)

| Ubicación | Mejora |
|-----------|--------|
| **Admin Plans - Switch** | Mostrar `Loader2` (spinner) en la celda del switch cuando `toggleActiveMutation.isPending` para esa fila. Pasar `isTogglingId` al `SortableRow` para deshabilitar el switch y mostrar spinner. |
| **Admin Plan Form - Botón Guardar** | Agregar icono `Loader2` animado junto a "Guardando..." para feedback más claro. |
| **Admin Plan Form** | Considerar guardado optimista: actualizar cache local antes de respuesta (similar al toggle). |

**Implementación técnica:**
```tsx
// En SortableRow: recibir isTogglingId
<TableCell>
  {isTogglingId === dest.id ? (
    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
  ) : (
    <Switch checked={dest.isActive} onCheckedChange={...} />
  )}
</TableCell>
```

---

### Fase 3: Optimización de guardado y tiempo real (Prioridad Media)

| Mejora | Descripción |
|--------|-------------|
| **Evitar invalidación excesiva** | En `toggleActiveMutation.onSettled`, no invalidar todas las queries. El `onMutate` ya actualizó el cache. Solo invalidar si hay error o hacer un refetch en background suave. |
| **Optimistic update en save** | En `admin-plan-form`, al guardar: actualizar cache de `/api/admin/destinations` y `/api/destinations?isActive=true` con los datos del formulario antes de redirigir. |
| **PATCH vs PUT para cambios parciales** | El endpoint `PATCH /api/admin/destinations/:id` ya existe para `isActive`. El toggle lo usa correctamente. Para ediciones completas, el PUT es necesario. |
| **Reducir refetches** | En `onSuccess` del toggle: no llamar `invalidateQueries` de forma agresiva. El optimistic update ya reflejó el cambio. Solo invalidar `["/api/destinations?isActive=true"]` y `["/api/destinations?isActive=false"]` para que otras vistas (Home, quote-summary) vean el cambio, pero sin refetch de admin/destinations que ya está actualizado. |

---

### Fase 4: Optimización de carga de datos (Prioridad Media-Baja)

| Mejora | Descripción |
|--------|-------------|
| **Home - Lazy load de detalles** | En lugar de cargar detalles de TODOS los destinos al montar, cargar solo cuando el usuario expande una card o cuando está en viewport. |
| **Imágenes - lazy loading** | Añadir `loading="lazy"` a las etiquetas `<img>` de destinos en Home, admin-plans y quote-summary. |
| **Prefetch en navegación** | Al hacer hover sobre enlaces del sidebar, prefetchar datos de la ruta destino (React Query `prefetchQuery`). |
| **Cache de React Query** | Revisar si `staleTime: Infinity` es adecuado. Para datos que cambian poco (destinos), está bien. Para cotizaciones recientes, considerar `staleTime: 30_000` (30 segundos) para permitir refetch en segundo plano. |

---

## Orden de Implementación Recomendado

1. **Paso 1** (rápido, alto impacto): Skeletons en Admin Plans, Advisor Dashboard y Quote Summary.
2. **Paso 2** (rápido, alto impacto): Indicador de carga en Switch de admin-plans y en botón Guardar del formulario.
3. **Paso 3** (medio): Skeletons en Home y Admin Dashboard.
4. **Paso 4** (medio): Ajustar invalidación de queries en toggle/save para evitar refetches innecesarios.
5. **Paso 5** (opcional): Lazy load de detalles en Home y `loading="lazy"` en imágenes.

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `client/src/pages/admin-plans.tsx` | Skeleton tabla, `isTogglingId` en SortableRow, Loader2 en switch |
| `client/src/pages/admin-plan-form.tsx` | Loader2 en botón Guardar, posible optimistic update |
| `client/src/pages/admin-dashboard.tsx` | Skeletons para KPI, gráfico, top destinos |
| `client/src/pages/advisor-dashboard.tsx` | Skeleton de cards de cotizaciones |
| `client/src/pages/home.tsx` | Skeleton de cards de destinos, `loading="lazy"` en imágenes |
| `client/src/pages/quote-summary.tsx` | Skeleton para destinos/clientes |
| `client/src/components/ui/skeleton.tsx` | (ya existe, reutilizar) |

---

## Implementación Completada (Marzo 2025)

### Cambios realizados

1. **Componente `OptimizedImage`** (`client/src/components/optimized-image.tsx`)
   - Carga imágenes en **alta definición completa** (sin compresión ni reducción de calidad).
   - `loading="lazy"` para imágenes fuera del viewport (solo difiere el momento de carga).
   - `fetchpriority="high"` para las primeras 6 imágenes visibles.
   - `decoding="async"` para decodificación no bloqueante.
   - Skeleton mientras la imagen carga.

2. **Admin Plans**
   - Skeleton de filas en la tabla mientras carga.
   - Spinner (`Loader2`) en la celda del switch cuando se está guardando.
   - `OptimizedImage` para las miniaturas de planes.

3. **Admin Plan Form**
   - Spinner animado en el botón Guardar durante el guardado.

4. **Advisor Dashboard**
   - Skeleton de cards de cotizaciones (6 cards) mientras carga.

5. **Quote Summary**
   - Skeleton para la sección de destinos seleccionados.
   - `OptimizedImage` para las imágenes de destinos.

6. **Home**
   - Skeleton de 9 cards de destinos mientras carga.
   - `OptimizedImage` con `priority` para las primeras 6 imágenes visibles.

### Sobre la calidad de imágenes

- **`loading="lazy"`** no reduce la calidad: solo retrasa la carga hasta que la imagen entra al viewport.
- La imagen se descarga siempre en resolución completa.
- El skeleton da feedback visual inmediato mientras carga.
