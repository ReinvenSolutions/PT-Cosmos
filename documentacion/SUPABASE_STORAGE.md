# Supabase Storage - Gestión de Imágenes

Las imágenes se gestionan con buckets en Supabase Storage. Todo el sistema (rutas, PDF, cliente) usa Supabase como fuente principal.

## Estructura de buckets

| Bucket | Uso |
|--------|-----|
| `images` | Imágenes generales (vuelos en cotizaciones, adjuntos) |
| `plan-{slug}` | Un bucket por plan/destino (ej: `plan-turquia-esencial`, `plan-dubai-maravilloso`) |

El slug se genera del nombre del plan: "Turquía Esencial" → `turquia-esencial`.

## Configuración

En `.env`:

```env
SUPABASE_URL=https://himyxbrdsnxryetlogzk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>
```

Obtener la **Service Role Key** en: Supabase Dashboard → Settings → API → `service_role` (secret).

## Comportamiento

1. **Imágenes de planes (admin)**: Al subir imágenes en el formulario de plan, se usa el bucket `plan-{nombre-del-plan}`. El bucket se crea automáticamente si no existe.
2. **Imágenes de vuelos (cotizaciones)**: Se suben al bucket `images` en la ruta `flights/`.
3. **Planes nuevos**: Al crear un plan y subir imágenes, se crea un bucket nuevo con el nombre del destino.

## Subir imágenes locales a Supabase

Las imágenes están en `public/images/destinations/` (una carpeta por plan). Para subirlas a Supabase:

```bash
npm run db:upload-images-to-supabase
```

Lee cada carpeta, crea el bucket `plan-{carpeta}`, sube las imágenes y actualiza las URLs en la base de datos.

## Flujo en todo el sistema

- **Rutas**: `/images/destinations/:folder/:file` redirige (302) a Supabase CDN
- **Cliente**: Usa `imageUrl` de la API (Supabase) o fallbacks con URLs Supabase
- **PDF**: Carga imágenes en paralelo desde URLs Supabase (preload)
- **Nuevo plan**: Al subir imágenes con `planName`, se crea bucket `plan-{slug}` y se guardan allí

## Migrar imágenes de Turquía desde attached_assets

Las imágenes de Turquía (mapa + 6 fotos) que estaban en `attached_assets/` se suben con:

```bash
npm run db:upload-turquia-assets
```

Esto crea/actualiza el bucket `plan-turquia-esencial` con:
- `mapa-itinerario.png` (mapa de ruta para PDFs)
- `1.png` … `6.png` (imágenes del destino)

Tras ejecutarlo, la carpeta `attached_assets/` ya no se necesita para Turquía.
