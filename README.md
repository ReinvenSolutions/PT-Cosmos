# ViajeRapido - Sistema de Cotizaciones de Viajes

Sistema integral para gestionar cotizaciones de paquetes turísticos con generación automática de PDFs profesionales.

**Base de datos:** PostgreSQL (Supabase)

## 🚀 Características

- ✅ Sistema de autenticación (Advisors y Super Admin)
- ✅ Gestión de destinos turísticos con itinerarios detallados
- ✅ Creación y edición de cotizaciones
- ✅ Generación automática de PDFs con diseño profesional
- ✅ Gestión de clientes
- ✅ Soporte para múltiples monedas (USD/COP)
- ✅ Cálculo automático de precios y pagos mínimos
- ✅ Sincronización automática de datos canónicos

## 📋 Requisitos Previos

- Node.js 20 o superior
- PostgreSQL 16 o superior
- npm o yarn

## 🔧 Instalación Local

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/felipereinven/ViajeRapido.git
   cd ViajeRapido
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   
   Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:
   ```env
   DATABASE_URL="postgresql://..."  # Supabase u otro PostgreSQL
   NODE_ENV=development
   SESSION_SECRET=tu-secret-key-muy-segura-aqui
   PORT=5001
   ```

4. **Iniciar el servidor de desarrollo**
   ```bash
   npm run dev
   ```

   La aplicación estará disponible en `http://localhost:5001`

## 🚀 Deploy en Railway

### Paso 1: Preparar el Repositorio en GitHub

1. **Inicializar Git (si aún no está inicializado)**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Crear repositorio en GitHub**
   - Ve a [github.com](https://github.com) y crea un nuevo repositorio
   - **NO** inicialices con README, .gitignore o licencia

3. **Subir código a GitHub**
   ```bash
   git remote add origin https://github.com/tu-usuario/tu-repositorio.git
   git branch -M main
   git push -u origin main
   ```

### Paso 2: Deploy en Railway

1. **Crear cuenta en Railway**
   - Ve a [railway.app](https://railway.app)
   - Inicia sesión con GitHub

2. **Crear nuevo proyecto**
   - Click en "New Project"
   - Selecciona "Deploy from GitHub repo"
   - Autoriza Railway a acceder a tus repositorios
   - Selecciona el repositorio `ViajeRapido`

3. **Configurar Variables de Entorno**
   
   En el servicio web, ve a "Variables" y agrega:
   
   ```env
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.himyxbrdsnxryetlogzk.supabase.co:5432/postgres
   NODE_ENV=production
   SESSION_SECRET=genera-una-clave-segura-aleatoria-aqui
   ```
   
   **Nota:** Producción usa Supabase. Ver `documentacion/MIGRACION_NEON_A_SUPABASE.md` para la migración de datos.

4. **Configurar Build y Start Commands** (opcional, ya están en package.json)
   
   Railway detecta automáticamente:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm run start`

6. **Deploy**
   - Railway desplegará automáticamente
   - Espera a que termine el build y deploy
   - Railway te dará una URL pública (ej: `tu-app.up.railway.app`)

### Paso 3: Verificar el Deploy

1. Accede a tu URL de Railway
2. El sistema automáticamente:
   - ✅ Ejecutará las migraciones de base de datos
   - ✅ Sincronizará datos canónicos (destinos, itinerarios, etc.)
   - ✅ La base de datos Supabase contiene los datos migrados desde Neon

**Usuarios por defecto:**
- **Super Admin:** usuario: `admin` / contraseña: `admin123`
- **Advisor:** usuario: `advisor1` / contraseña: `advisor123`

⚠️ **IMPORTANTE:** Cambia estas contraseñas después del primer login.

## 🔄 Actualización Continua

Cada vez que hagas `git push` a la rama `main`, Railway automáticamente:
1. Detecta los cambios
2. Ejecuta el build
3. Aplica migraciones de base de datos
4. Re-despliega la aplicación

```bash
# Workflow típico
git add .
git commit -m "Descripción de los cambios"
git push origin main
# Railway despliega automáticamente
```

## 📦 Scripts Disponibles

```bash
npm run dev          # Desarrollo local
npm run build        # Build para producción
npm run start        # Iniciar en producción
npm run db:push      # Aplicar cambios de esquema
npm run check        # Verificar tipos TypeScript
```

## 🗂️ Estructura del Proyecto

```
ViajeRapido/
├── documentacion/       # Guías y documentación (.md)
├── backups sql/         # Backups de base de datos (.sql)
├── client/              # Frontend React
│   └── src/
│       ├── components/  # Componentes reutilizables
│       ├── pages/       # Páginas de la aplicación
│       └── contexts/    # Contextos de React
├── server/              # Backend Express
│   ├── routes.ts        # Rutas API
│   ├── auth.ts          # Autenticación
│   ├── pdfGenerator.ts  # Generación de PDFs
│   └── seed.ts          # Datos iniciales
├── shared/              # Código compartido
│   ├── schema.ts        # Esquema de base de datos
│   └── seed-data.ts     # Datos canónicos
└── uploads/             # Archivos subidos (no en Git)
```

## 🔒 Seguridad

- Las contraseñas se hashean con bcrypt
- Las sesiones se almacenan en PostgreSQL
- Cookies seguras en producción (HTTPS)
- Variables sensibles en `.env` (no se suben a Git)

## 📝 Notas Importantes

- **No subas el archivo `.env`** - está en `.gitignore`
- **La carpeta `uploads/`** no se sube a Git - Railway proporciona almacenamiento efímero
- **Los datos canónicos** se sincronizan automáticamente en cada deploy

## 🆘 Soporte

Para problemas o preguntas, revisa la carpeta `documentacion/`:
- `documentacion/RAILWAY_DEPLOYMENT.md` - Guía de deployment en Railway
- `documentacion/DEPLOYMENT_CHECKLIST.md` - Checklist de deploy

## 📄 Licencia

MIT
