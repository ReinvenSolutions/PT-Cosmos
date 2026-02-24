# Mejoras sugeridas: Cotización Express (Frontend)

## Cambios ya implementados
- Header con gradiente en "Cotización" (estilo Cosmos)
- Formulario con glass-card y colores del tema
- Panel de vista previa con fondo themed
- Layout responsive (flex-col en móvil)
- Botón primario usando variables CSS del tema

---

## Mejoras estéticas

### 1. Organización del formulario
- **Secciones colapsables**: Agrupar en acordeones: "Contenido", "Precio y plan", "Contacto", "Imágenes".
- **Stepper visual**: Indicar progreso (ej: "Paso 1 de 4") para guiar al usuario.
- **Iconos por sección**: Cada bloque con icono distintivo (ImageIcon, DollarSign, Phone, etc.).

### 2. Selector de "Incluye"
- **Chips/badges clicables**: En lugar de checkboxes, usar chips estilo toggle con iconos.
- **Drag & drop**: Permitir reordenar el orden de aparición en la cotización.
- **Más opciones**: Desayuno, Cena, Seguro, Guía, etc. (configurable).

### 3. Estrellas del hotel
- **Selector visual**: 5 estrellas clicables en lugar de input numérico.
- **Tooltip**: "Selecciona la categoría del hotel".

### 4. Vista previa
- **Preview en tiempo real más fluido**: Throttle/debounce en cambios.
- **Zoom**: Botón para acercar/alejar la vista previa en pantallas pequeñas.
- **Toggle vista móvil/desktop**: Ver cómo se ve en distintos formatos.

### 5. Plantilla (QuoteTemplate)
- **Paleta Cosmos**: Reemplazar #004e7c, gray-* por variables de marca (teal, oro).
- **Placeholder de imagen**: Ilustración o mensaje más amigable.
- **Footer**: Estilo alineado con el resto de la app.

---

## Mejoras funcionales

### 1. Validación
- **Validación en tiempo real**: Marcar campos inválidos (email, teléfono).
- **Mensajes de error inline**: "Email inválido", "Teléfono debe tener 10 dígitos".
- **Indicador de campos obligatorios**: Asterisco o badge "*Requerido".

### 2. Experiencia de usuario
- **Guardado automático (draft)**: Guardar en localStorage al cambiar, recuperar al volver.
- **Plantillas guardadas**: Permitir guardar configuraciones frecuentes (ej: "Turquía 4★").
- **Historial reciente**: Lista de últimas cotizations generadas.

### 3. Descarga
- **Formatos**: Añadir opción PNG además de JPEG (mejor para texto).
- **Calidad configurable**: Slider calidad 0.8–1.0.
- **Nombre sugerido**: Incluir título en el nombre del archivo (`cotizacion-hotel-paradise-20250222.jpg`).

### 4. Campos adicionales
- **Moneda**: Selector USD / COP (el precio actual asume COP).
- **Fecha de vigencia**: "Válido hasta...".
- **Destino/país**: Campo para filtros o reportes.
- **Notas internas**: Solo visibles para el asesor, no en la imagen.

### 5. Accesibilidad
- **Labels correctos**: Todos los inputs con `htmlFor` y `id`.
- **Focus visible**: Estilos de focus para navegación por teclado.
- **Mensajes de éxito/error**: Añadir `aria-live` para lectores de pantalla.

### 6. Responsive
- **Vista previa adaptativa**: En móvil, mostrar preview debajo del formulario o en modal.
- **Formulario en 2 columnas**: En desktop ancho, organizar campos en grid.

---

## Prioridad sugerida

| Prioridad | Mejora                           | Esfuerzo |
|----------|-----------------------------------|----------|
| Alta     | Validación en tiempo real         | Medio    |
| Alta     | Guardado automático (draft)      | Bajo     |
| Alta     | Plantilla con paleta Cosmos      | Medio    |
| Media    | Secciones colapsables            | Medio    |
| Media    | Selector de estrellas visual     | Bajo     |
| Media    | Nombre de archivo con título     | Bajo     |
| Baja     | Plantillas guardadas             | Alto     |
| Baja     | Formato PNG                      | Bajo     |
