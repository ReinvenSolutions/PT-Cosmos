# Lógica de eliminación de imágenes

## Resumen

Cuando eliminas una imagen desde la interfaz, esta se elimina **tanto de la UI como del bucket de Supabase Storage**. La lógica está implementada de forma consistente en todas las secciones.

---

## 1. Galería de mapas del itinerario (`ItineraryMapGallery`)

- **Bucket**: `itinerary-maps` (compartido)
- **Al hacer clic en X**: Llama a `DELETE /api/admin/itinerary-map-images?path=...`
- **Resultado**: La imagen se elimina del bucket inmediatamente.
- **Estado**: ✅ Implementado correctamente

---

## 2. Galería de asistencia médica (`MedicalAssistanceGallery`)

- **Bucket**: `medical-assistance` (compartido)
- **Al hacer clic en X**: Llama a `DELETE /api/admin/medical-assistance-images?path=...`
- **Resultado**: La imagen se elimina del bucket inmediatamente.
- **Estado**: ✅ Implementado correctamente

---

## 3. Galería de imágenes del plan (`admin-plan-form`)

- **Bucket**: `plan-{slug}` (ej: `plan-turquia-esencial`)
- **Al hacer clic en X** en una imagen de la galería:
  - Llama a `DELETE /api/admin/plan-image?url=...` (elimina del bucket)
  - Elimina la imagen del estado local
- **Al guardar el plan** (PUT): Si hay imágenes que se quitaron antes de guardar, se eliminan del bucket de forma automática.
- **Estado**: ✅ Implementado correctamente

---

## 4. Imágenes del vuelo interno/conexión del plan (`FlightImageGallery` en admin-plan-form)

- **Bucket**: `plan-{slug}` (mismo bucket del plan)
- **Al hacer clic en X**: Llama a `DELETE /api/admin/plan-image?url=...` (elimina del bucket)
- **Al guardar el plan** (PUT): Si hay imágenes que se quitaron antes de guardar, se eliminan del bucket de forma automática.
- **Estado**: ✅ Implementado correctamente

---

## 5. Endpoint `DELETE /api/admin/plan-image`

- **URL**: `DELETE /api/admin/plan-image?url={urlSupabase}`
- **Función**: Elimina una imagen del bucket de un plan (solo buckets `plan-*`).
- **Seguridad**: Solo acepta URLs de Supabase Storage que apunten a buckets de planes (`plan-*`).
- **Uso**: Galería del plan e imágenes de vuelos internos.

---

## 6. Limpieza al guardar (PUT `/api/admin/destinations/:id`)

Antes de actualizar el plan, el servidor:

1. Obtiene las imágenes antiguas (galería + vuelos internos).
2. Compara con las nuevas.
3. Elimina del bucket las URLs que ya no están en el plan (solo buckets `plan-*`).

Esto evita archivos huérfanos si se eliminan imágenes sin guardar o si el guardado falla antes de la eliminación.

---

## Flujo completo

```
Usuario sube imagen → upload.ts → Supabase Storage (bucket)
Usuario hace clic en X → DELETE API → removeFromBucket() → bucket
Usuario guarda plan → PUT compara old vs new → elimina huérfanos del bucket
```
