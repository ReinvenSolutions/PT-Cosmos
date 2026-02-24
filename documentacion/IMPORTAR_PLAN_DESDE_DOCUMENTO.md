# Importar plan desde documento (PDF o Word)

## Resumen

Esta función permite crear un plan de viaje de forma acelerada subiendo un documento PDF o Word que ya contenga la información del plan. El sistema extrae el texto, lo estructura automáticamente (mediante IA o reglas heurísticas) y pre-rellena el formulario de creación de plan. El usuario solo debe revisar, corregir lo necesario y guardar.

## Flujo de trabajo

```
1. Usuario sube PDF/Word → 2. Sistema extrae y estructura → 3. Formulario pre-rellenado → 4. Usuario revisa y edita → 5. Guardar
```

## Componentes técnicos

### 1. Extracción de texto
- **PDF**: librería `pdf-parse` (ya instalada)
- **Word (.docx)**: librería `mammoth` (ya instalada)

### 2. Estructuración de la información
Dos modos según configuración:

| Modo | Requisito | Ventajas | Limitaciones |
|------|-----------|----------|--------------|
| **IA (OpenAI)** | `OPENAI_API_KEY` en .env | Máxima flexibilidad, entiende formatos variados, redacción natural | Costo por uso (~$0.01-0.05 por documento) |
| **Heurístico** | Ninguno | Gratis, sin dependencias externas | Solo documentos con estructura reconocible (Día 1, Incluye:, etc.) |

### 3. Campos que se extraen

- **Básico**: nombre, país, duración, noches, descripción, precio base
- **Itinerario**: días con título (resumen), ubicación, descripción (detalle), comidas, alojamiento
- **Hoteles**: nombre, categoría, ubicación, noches

### 3.1. Resumen vs Detalle del itinerario (PDF)

El generador de PDF exporta el itinerario en dos vistas:

| Campo     | Uso en PDF                    | Contenido esperado                          |
|----------|-------------------------------|---------------------------------------------|
| **title**   | Hoja 2 – Timeline de ciudades | Breve, centrado en ubicación. Ej: "Estambul", "Capadocia - Pamukkale" |
| **description** | Hoja "Itinerario Detallado"  | Contenido completo: actividades, horarios, una por línea |

Al importar, si el documento tiene sección resumida y detallada, el extractor usa el resumido para `title` y el detallado para `description`. Si tiene horarios (08:50, 9:30 AM), cada actividad queda en una línea en `description`.
- **Inclusiones y exclusiones**: listas de ítems
- **Precios**: price tiers (fechas/precios), upgrades
- **Imágenes**: no se extraen del documento; el usuario las sube manualmente en la pestaña Imágenes

### 4. Convenciones para mejores resultados (modo heurístico)

Si usas el parser heurístico, organiza tu documento así:

```
Nombre del plan: Turquía Esencial
País: Turquía
Duración: 8 días / 7 noches
Precio desde: USD 1,599

INCLUYE:
• Vuelos internacionales
• Hospedaje en hoteles 4*

NO INCLUYE:
• Propinas
• Seguro de viaje

DÍA 1 - Llegada a Estambul
Ubicación: Estambul
Descripción del día...
Comidas: Desayuno
Alojamiento: Hotel en Estambul

HOTELES:
- Hotel Estambul Center, 5*, Estambul, 2 noches
```

## Configuración

### Usar IA (recomendado)

1. Obtén una API key de [OpenAI](https://platform.openai.com/api-keys)
2. Añade a `.env`:

```
OPENAI_API_KEY=sk-...
```

3. Instala el paquete (si no está):

```bash
npm install openai
```

### Usar solo heurístico

No requiere configuración. Funciona con documentos bien estructurados.

## Endpoint

`POST /api/admin/extract-plan`

- **Auth**: requiere rol `super_admin`
- **Content-Type**: `multipart/form-data`
- **Body**: `file` (PDF o .docx, máx. 5MB)
- **Response**: JSON con la estructura del plan lista para poblar el formulario
