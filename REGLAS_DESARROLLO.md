# 📋 Reglas de Desarrollo - ViajeRapido

Este documento establece las reglas, lógica de negocio y mejores prácticas para el desarrollo del sistema ViajeRapido.

## 🎯 Principios Fundamentales

### 1. Integridad de Datos
- **NUNCA** permitir duplicados en `itinerary_days` para el mismo `destinationId` y `dayNumber`
- **SIEMPRE** validar entrada con Zod antes de guardar en base de datos
- **SIEMPRE** usar transacciones para operaciones que modifican múltiples tablas
- **NUNCA** exponer información sensible en respuestas de error (especialmente en producción)

### 2. Seguridad
- **SIEMPRE** validar autenticación y autorización antes de operaciones sensibles
- **SIEMPRE** usar rate limiting en endpoints públicos y de autenticación
- **NUNCA** confiar en validación solo del lado del cliente
- **SIEMPRE** sanitizar entrada de usuario antes de renderizar

### 3. Consistencia
- **SIEMPRE** usar los mismos formatos de fecha (DD/MM/AAAA)
- **SIEMPRE** formatear precios USD sin decimales
- **SIEMPRE** mantener consistencia en nombres de campos entre frontend y backend

---

## 🏗️ Estructura de Base de Datos

### Tabla: `itinerary_days`
**Regla Crítica:** NO puede haber duplicados de `(destinationId, dayNumber)`

```typescript
// ✅ CORRECTO: La función getItineraryDays elimina duplicados automáticamente
const itinerary = await storage.getItineraryDays(destinationId);
// Retorna solo días únicos, manteniendo el primero encontrado

// ❌ INCORRECTO: Asumir que no hay duplicados
const itinerary = await db.select().from(itineraryDays)
  .where(eq(itineraryDays.destinationId, destinationId));
// Esto puede retornar duplicados
```

**Prevención de Duplicados:**
- La función `getItineraryDays` en `server/storage.ts` elimina duplicados automáticamente
- Si se detectan duplicados, se registra un warning en consola
- Se mantiene el primer registro encontrado, se descartan los demás

### Tabla: `destinations`
- Campo `isActive`: Solo destinos con `isActive=true` se muestran en el catálogo
- Campo `requiresTuesday`: Indica si el destino requiere salidas en martes (Turquía)
- Campo `upgrades`: JSON con opciones de upgrade disponibles

### Tabla: `quotes`
- Campo `status`: Estado de la cotización (default: "draft")
- Campo `finalPriceCurrency`: Moneda del precio final (default: "USD")
- Campos `*COP`: Valores en pesos colombianos cuando TRM está presente

---

## 💼 Lógica de Negocio

### 1. Sistema de Cotizaciones

#### Precios
- **Todos los precios se muestran por persona** (1 pasajero)
- Los precios en USD **NO tienen decimales** (formato: $1,234)
- Los precios en COP pueden tener decimales según el cálculo

#### TRM (Tasa de Cambio)
- Campo opcional que permite conversión USD → COP
- Cuando `TRM > 0`:
  - Se calcula `grandTotalCOP = grandTotal × TRM`
  - El PDF muestra precios en COP
  - El pago mínimo se muestra en COP con sufijo explícito
- Cuando `TRM = 0` o no existe:
  - Todo se muestra en USD
  - El pago mínimo se muestra en USD

#### Destinos en Cotizaciones
- Una cotización puede tener múltiples destinos
- Cada destino tiene:
  - `destinationId`: ID del destino
  - `startDate`: Fecha de inicio
  - `passengers`: Número de pasajeros (siempre 1 actualmente)
  - `price`: Precio específico para esta cotización

### 2. Destinos Especiales

#### Turquía Esencial
**Reglas Específicas:**
- ✅ Requiere salidas en martes (`requiresTuesday: true`)
- ✅ Tiene 3 opciones de upgrade exclusivas:
  - `option1`: +$500 USD - 8 almuerzos + Tour Bósforo + Tour Estambul Clásico
  - `option2`: +$770 USD - Hotel céntrico + 8 almuerzos + Tours
  - `option3`: +$1,100 USD - Hotel céntrico + 8 almuerzos + Tours + Hotel Capadocia
- ✅ El upgrade solo se puede seleccionar si "Turquía Esencial" está en los destinos
- ✅ El PDF incluye página especial con políticas y feriados turcos 2026
- ✅ El PDF incluye mapa de ruta de Turquía
- ✅ El PDF incluye tabla de "TOUR OPCIONALES" en página de asistencia médica

**Validación de Upgrade:**
```typescript
// ✅ CORRECTO: Validar que Turquía Esencial esté presente
if (turkeyUpgrade) {
  const hasTurkeyEsencial = destinations.some(d => 
    d.name === "Turquía Esencial"
  );
  if (!hasTurkeyEsencial) {
    throw new Error("Turkey upgrade requires Turquía Esencial destination");
  }
}
```

#### Combinación Turquía + Dubai
- Cuando hay "Turquía Esencial" + "Dubai Maravilloso":
  - El itinerario resumido muestra la ruta combinada
  - Se incluye página de "VUELO DE CONEXIÓN TURQUÍA - DUBAI" si hay imágenes
  - El orden es: Turquía primero, luego Dubai

### 3. Generación de PDFs

#### Estructura del PDF
1. **Portada**: Imágenes del destino, título, fechas, precios
2. **Resumen de Itinerario**: Ruta visual con ciudades y noches
3. **Vuelos de Ida** (si hay imágenes de vuelo)
4. **Vuelo de Conexión** (si aplica: Turquía → Dubai)
5. **Itinerario Detallado**: Día por día de cada destino
6. **Hoteles**: Lista de hoteles por destino
7. **Incluye/No Incluye**: Listas de inclusiones y exclusiones
8. **Asistencia Médica**: Página con información médica
9. **Términos y Condiciones**: Políticas y condiciones

#### Reglas de Renderizado
- **Itinerario Detallado**: 
  - Cada destino se muestra con su nombre en mayúsculas
  - Cada día se muestra con formato: `Día X | Título`
  - Las descripciones se procesan con soporte para:
    - Bullets (•)
    - Texto en negrita (**texto**)
    - Saltos de línea
  - **IMPORTANTE**: No debe haber días duplicados (se eliminan automáticamente)

- **Imágenes**:
  - Portada: Primera imagen del destino (índice 0)
  - Itinerario Detallado: Imágenes 4-6 (índices 3-5) si hay 6+ imágenes, sino 2-4 (índices 1-3)
  - Hoteles: Imágenes 7-9 (índices 6-8) si hay 9+ imágenes

- **Hoteles**:
  - Se ordenan por: 5 estrellas primero, luego 4 estrellas, luego alfabéticamente

#### Prevención de Duplicados en PDF
```typescript
// ✅ CORRECTO: getItineraryDays ya elimina duplicados
const itinerary = await storage.getItineraryDays(destinationId);
// Usar directamente sin filtrado adicional

// ❌ INCORRECTO: Filtrar manualmente (redundante y propenso a errores)
const allDays = await db.select().from(itineraryDays)
  .where(eq(itineraryDays.destinationId, destinationId));
const uniqueDays = allDays.filter((day, index, self) => 
  index === self.findIndex(d => d.dayNumber === day.dayNumber)
);
```

### 4. Vuelos

#### Tipos de Vuelo
- **Vuelo de Ida** (`outboundFlightImages`): Vuelo desde ciudad de origen
- **Vuelo de Regreso** (`returnFlightImages`): Vuelo de regreso a ciudad de origen
- **Vuelo Doméstico** (`domesticFlightImages`): Vuelos internos del país
- **Vuelo de Conexión** (`connectionFlightImages`): Entre destinos (ej: Turquía → Dubai)

#### Equipaje
- Cada tipo de vuelo puede tener:
  - `*CabinBaggage`: Equipaje de cabina
  - `*HoldBaggage`: Equipaje de bodega
- Si no hay imágenes de vuelo, el PDF se genera como "solo tierra"

### 5. Validaciones de Fechas

#### Turquía Esencial
- Solo permite salidas en **martes**
- Valida feriados turcos 2026 (deshabilitados en el picker)
- Muestra toast de error si se selecciona fecha inválida

---

## 🔧 Reglas Técnicas

### 1. Validación de Entrada

**SIEMPRE usar Zod para validar:**
```typescript
// ✅ CORRECTO
const validatedData = insertQuoteSchema.parse(req.body);

// ❌ INCORRECTO
const { clientId, totalPrice } = req.body; // Sin validación
```

### 2. Manejo de Errores

```typescript
// ✅ CORRECTO: No exponer detalles en producción
const isProduction = process.env.NODE_ENV === "production";
const message = isProduction && status === 500 
  ? "Internal Server Error" 
  : err.message;

// ❌ INCORRECTO: Exponer stack traces
res.status(500).json({ message: err.message, stack: err.stack });
```

### 3. Consultas a Base de Datos

**SIEMPRE usar Drizzle ORM (protege contra SQL injection):**
```typescript
// ✅ CORRECTO
const destinations = await db
  .select()
  .from(destinations)
  .where(eq(destinations.isActive, true));

// ❌ INCORRECTO: SQL crudo (vulnerable a injection)
const destinations = await db.query(
  `SELECT * FROM destinations WHERE is_active = ${isActive}`
);
```

### 4. Transacciones

**Usar transacciones para operaciones complejas:**
```typescript
// ✅ CORRECTO: Crear quote con destinos
await db.transaction(async (tx) => {
  const [quote] = await tx.insert(quotes).values(quoteData).returning();
  await tx.insert(quoteDestinations).values(destinationsData);
});

// ❌ INCORRECTO: Operaciones separadas sin transacción
await db.insert(quotes).values(quoteData);
await db.insert(quoteDestinations).values(destinationsData);
// Si falla la segunda, la primera queda huérfana
```

### 5. Formateo de Datos

```typescript
// ✅ CORRECTO: Formatear precios USD sin decimales
const formatted = formatUSD(1234.56); // "$1,235"

// ✅ CORRECTO: Formatear fechas DD/MM/AAAA
const formatted = formatDate(new Date()); // "15/01/2025"

// ❌ INCORRECTO: Usar formatos inconsistentes
const price = `$${totalPrice.toFixed(2)}`; // Puede tener decimales
```

---

## 🚫 Errores Comunes a Evitar

### 1. Duplicados en Itinerarios
```typescript
// ❌ ERROR: Asumir que no hay duplicados
const itinerary = await storage.getItineraryDays(destId);
itinerary.forEach(day => { /* renderizar */ });
// Si hay duplicados, se renderizan múltiples veces

// ✅ SOLUCIÓN: getItineraryDays ya elimina duplicados automáticamente
// No se necesita filtrado adicional
```

### 2. Validación Solo en Cliente
```typescript
// ❌ ERROR: Confiar solo en validación del cliente
// Frontend valida, pero backend no

// ✅ CORRECTO: Validar en ambos lados
// Frontend: UX mejorada
// Backend: Seguridad garantizada
```

### 3. Exponer Información Sensible
```typescript
// ❌ ERROR: Exponer passwordHash en respuestas
res.json({ user });

// ✅ CORRECTO: Excluir campos sensibles
const { passwordHash, ...userWithoutPassword } = user;
res.json({ user: userWithoutPassword });
```

### 4. No Usar Transacciones
```typescript
// ❌ ERROR: Operaciones sin transacción
await createQuote(data);
await createDestinations(destinations);
// Si falla la segunda, la primera queda inconsistente

// ✅ CORRECTO: Usar transacción
await db.transaction(async (tx) => {
  await tx.insert(quotes).values(data);
  await tx.insert(quoteDestinations).values(destinations);
});
```

---

## 📝 Checklist para Nuevas Features

Antes de implementar una nueva feature:

- [ ] ¿Se validan todos los inputs con Zod?
- [ ] ¿Se manejan errores sin exponer información sensible?
- [ ] ¿Se usan transacciones para operaciones complejas?
- [ ] ¿Se previenen duplicados en datos críticos?
- [ ] ¿Se actualiza la documentación?
- [ ] ¿Se prueban casos edge (duplicados, valores nulos, etc.)?
- [ ] ¿Se mantiene consistencia con el resto del código?
- [ ] ¿Se respetan las reglas de negocio específicas?

---

## 🔍 Debugging

### Verificar Duplicados en Itinerarios
```bash
# Ejecutar script de verificación
npx tsx scripts/check-gran-tour-details.ts

# O limpiar duplicados existentes
npx tsx scripts/fix-duplicates.ts

# Alternativa si tsx está instalado globalmente:
tsx scripts/fix-duplicates.ts
```

### Verificar Datos de Destino
```typescript
// En código
const destination = await storage.getDestination(destId);
const itinerary = await storage.getItineraryDays(destId);
console.log(`Destino: ${destination.name}, Días: ${itinerary.length}`);
```

---

## 📚 Referencias

- **Esquemas de Validación**: `shared/schema.ts`
- **Lógica de PDF**: `server/publicPdfGenerator.ts`
- **Reglas de Negocio**: `replit.md`
- **Guía de Deployment**: `DEPLOYMENT.md`
- **Mejoras de Seguridad**: `SECURITY_IMPROVEMENTS.md`

---

**Última actualización**: $(date)
**Versión**: 1.0.0
