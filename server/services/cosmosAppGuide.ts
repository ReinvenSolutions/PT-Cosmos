/** Guía de uso de ViajeRapido (Cosmos Mayorista) para soporte técnico del asistente. */
export const COSMOS_APP_GUIDE = `
## Plataforma ViajeRapido (Cosmos Mayorista)

Herramienta interna para agencias, proveedores y administradores de Cosmos Mayorista. Cotiza planes de viaje terrestres, genera PDFs y gestiona el catálogo.

### Roles
- **super_admin**: dashboard, planes, clientes, usuarios, academia (admin), TRM global, cotizaciones.
- **agency**: nueva cotización, cotización express, mis cotizaciones, mis clientes, academia, ver planes.
- **provider**: administrar planes propios, ver catálogo, nueva cotización, cotización express, mis cotizaciones, mis clientes.

### Menú — Agencia
- **Nueva cotización** (/): catálogo de planes activos; elegir plan → detalle → armar cotización con fechas, pasajeros y precios.
- **Cotización express** (/cotizacion-express): flujo rápido sin recorrer todo el catálogo.
- **Mis cotizaciones** (/advisor): listado de cotizaciones guardadas; abrir, editar, generar PDF.
- **Mis clientes** (/mis-clientes): clientes propios y su historial de cotizaciones.
- **Academia digital** (/tutoriales): cursos y lecciones de capacitación.

### Menú — Proveedor (además de cotizaciones)
- **Administrar planes** (/admin/plans): crear y editar solo tus planes.

### Menú — Administrador (además)
- **Dashboard** (/admin/dashboard): métricas y actividad.
- **Admin Planes** (/admin/plans): crear, editar, reordenar planes; importar desde PDF/Word con IA.
- **Clientes** (/admin/clients): base de clientes.
- **Usuarios** (/admin/users): cuentas de agencias, proveedores y admins.
- **Academia (cursos/métricas)**: gestión de tutoriales.
- **TRM global** (menú admin): tasa base en COP/USD; el cotizador usa TRM efectiva = base + 30 COP.

### Planes de viaje (destinos)
Cada plan incluye: nombre, país, duración, descripción, precio base USD, escalas de precio por fechas (priceTiers), itinerario día a día, hoteles, inclusiones, exclusiones, upgrades opcionales, términos, asistencia médica, bloqueos (fechas fijas y cupos), audio descriptivo.

### Cotización
1. Elegir plan(es) y fechas de salida según reglas del plan (días permitidos, martes, etc.).
2. **Combinar destinos**: en Nueva cotización puedes seleccionar varios planes. Turquía combina con todos los demás (excepto bloqueos); Turquía va primero en la ruta.
3. Pasajeros y precio por tramo/fecha.
4. Vuelos, equipaje, upgrades (Turquía, Italia, etc.) si aplican.
5. TRM para precio en COP.
6. Guardar cotización y generar **PDF** para el cliente.

### Detalle de plan (/plan/:id)
Itinerario completo, hoteles, qué incluye/no incluye, mapa, galerías, audio descriptivo descargable.

### Perfil
Sidebar inferior: foto, nombre visible para el equipo; cerrar sesión.

### Problemas frecuentes
- **No veo un plan**: puede estar inactivo; solo admin lo reactiva en Admin Planes.
- **Precio en COP raro**: revisar TRM global (admin).
- **PDF no genera**: verificar datos de vuelos/fechas y que el plan tenga itinerario.
- **Importar plan desde PDF**: Admin Planes → nuevo/editar → subir documento (requiere OPENAI_API_KEY en servidor).

Responde pasos concretos con rutas del menú. Si el usuario es agencia, no describas funciones solo de admin.
`.trim();
