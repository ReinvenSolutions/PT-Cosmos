# 🚂 Guía de Deployment en Railway

## 📋 Resumen

Este proyecto está configurado para desplegarse automáticamente en Railway cuando se hace push al repositorio de GitHub.

---

## ⚙️ Configuración Inicial

### 1. Variables de Entorno Requeridas

En Railway, configura las siguientes variables de entorno:

```bash
# Base de datos (OBLIGATORIO) - Supabase Producción
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.himyxbrdsnxryetlogzk.supabase.co:5432/postgres

# Seguridad (OBLIGATORIO)
SESSION_SECRET=<genera-uno-con-comando-abajo>

# Entorno (OBLIGATORIO)
NODE_ENV=production

# Puerto (OPCIONAL - Railway lo asigna automáticamente)
# PORT se configura automáticamente, no lo configures manualmente
```

#### Generar SESSION_SECRET

Ejecuta este comando en tu terminal local para generar un secret seguro:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia el resultado y úsalo como valor para `SESSION_SECRET`.

### 2. Configuración de Supabase Storage (Opcional)

Para imágenes en Supabase Storage, agrega estas variables:

```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

---

## 🔧 Problema Resuelto

### Error: EBUSY resource busy or locked

El error que estabas experimentando era:

```
npm error EBUSY: resource busy or locked, rmdir '/app/node_modules/.cache'
```

**Causa:** Railway usa Nixpacks que automáticamente crea un cache mount en `/app/node_modules/.cache`. Esto entraba en conflicto con `npm ci` que intenta eliminar ese directorio.

**Solución:** Se creó el archivo `nixpacks.toml` que configura explícitamente las fases de build sin el cache mount problemático:

```toml
[phases.setup]
nixPkgs = ["nodejs_22", "npm-9_x", "openssl"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm start"
```

---

## 🚀 Proceso de Deployment

### Automático (Recomendado)

1. Hacer cambios en tu código
2. Commit y push a GitHub:
   ```bash
   git add .
   git commit -m "Descripción de cambios"
   git push origin main
   ```
3. Railway detectará el push y desplegará automáticamente
4. **IMPORTANTE:** Después del deployment, ejecuta el script de activación de destinos (ver abajo)

### Manual desde Railway Dashboard

1. Ve a tu proyecto en Railway
2. Click en "Deploy" > "Deploy Now"
3. Espera a que termine el build
4. **IMPORTANTE:** Ejecuta el script de activación de destinos (ver abajo)

---

## ⚠️ CRÍTICO: Post-Deployment

Después de CADA deployment, debes ejecutar este script para reactivar todos los destinos:

### Opción 1: Desde tu terminal local

```bash
DATABASE_URL='<TU_DATABASE_URL_DE_PRODUCCION>' \
NODE_TLS_REJECT_UNAUTHORIZED=0 \
npx tsx scripts/activate-all-destinations.ts
```

### Opción 2: Desde Railway Shell

1. Ve a tu proyecto en Railway
2. Click en "Settings" > "Shell"
3. Ejecuta:
   ```bash
   npx tsx scripts/activate-all-destinations.ts
   ```

**¿Por qué?** El sistema desactiva automáticamente algunos destinos durante la sincronización. Este script los reactiva todos.

---

## 🔍 Verificación Post-Deployment

Después de desplegar, verifica:

1. ✅ La aplicación carga sin errores
2. ✅ Todos los destinos están visibles
3. ✅ La funcionalidad de vuelos de conexión funciona (Turquía + Dubai)
4. ✅ Puedes crear una cotización de prueba
5. ✅ No hay errores en la consola del navegador

### Comandos de Verificación

```bash
# Verificar estado de destinos
DATABASE_URL='<TU_URL>' npx tsx scripts/check-destinations-status.ts

# Verificar estado específico de Dubai
DATABASE_URL='<TU_URL>' npx tsx scripts/check-dubai-status.ts
```

---

## 🐛 Troubleshooting

### El build falla en Railway

**Síntomas:**
- Error durante `npm ci` o `npm run build`
- Timeout durante el build

**Soluciones:**

1. Verifica que `nixpacks.toml` existe en la raíz del proyecto
2. Revisa los logs de Railway para ver el error específico
3. Asegúrate que todas las variables de entorno están configuradas
4. Verifica que `package-lock.json` está actualizado:
   ```bash
   npm install
   git add package-lock.json
   git commit -m "Update package-lock.json"
   git push
   ```

### La aplicación se despliega pero no funciona

**Síntomas:**
- 502 Bad Gateway
- La aplicación no responde
- Errores de conexión

**Soluciones:**

1. Verifica los logs de Railway:
   - Click en tu servicio
   - Ve a la pestaña "Logs"
   - Busca errores de inicio

2. Verifica las variables de entorno:
   - `DATABASE_URL` debe estar configurada
   - `SESSION_SECRET` debe tener al menos 32 caracteres
   - `NODE_ENV=production`

3. Verifica la conexión a la base de datos:
   - Supabase acepta conexiones por defecto (no requiere whitelist de IP)
   - Verifica que el connection string es correcto

### Destinos no aparecen

**Solución:**
```bash
# Ejecuta el script de activación
DATABASE_URL='<TU_URL>' npx tsx scripts/activate-all-destinations.ts
```

### Error de sesión/autenticación

**Síntomas:**
- No puedes iniciar sesión
- La sesión se pierde constantemente

**Soluciones:**

1. Verifica que `SESSION_SECRET` está configurado
2. Asegúrate que la tabla `sessions` existe en la base de datos
3. Limpia las cookies del navegador y vuelve a intentar

---

## 📊 Monitoreo

Railway proporciona métricas automáticas:

1. **CPU Usage:** Debe estar < 80% en promedio
2. **Memory Usage:** Debe estar < 90% del límite
3. **Response Time:** Debe estar < 500ms para la mayoría de requests

Accede a estas métricas en: Railway Dashboard > Tu Servicio > Metrics

---

## 🔄 Rollback

Si necesitas volver a una versión anterior:

1. Ve a Railway Dashboard
2. Click en "Deployments"
3. Encuentra el deployment anterior que funcionaba
4. Click en "..." > "Redeploy"

---

## 📁 Archivos de Configuración

### `nixpacks.toml`
Configura cómo Railway construye y ejecuta tu aplicación.

### `.railwayignore`
Define qué archivos NO se suben a Railway (similar a `.gitignore`).

### `package.json`
Scripts importantes:
- `npm run build`: Construye la aplicación para producción
- `npm start`: Inicia el servidor en producción
- `npm run dev`: Desarrollo local

---

## 🆘 Obtener Ayuda

Si encuentras problemas:

1. Revisa los logs de Railway
2. Consulta este documento
3. Revisa `DEPLOYMENT_CHECKLIST.md`
4. Consulta `SCRIPTS.md` para scripts disponibles

---

## 📝 Notas Adicionales

### Diferencias entre Desarrollo y Producción

- **Desarrollo:** Usa Vite HMR, cookies no seguras, logging verbose
- **Producción:** Archivos estáticos compilados, cookies seguras, logging mínimo

### Base de Datos

- Usa Supabase PostgreSQL (producción)
- Las migraciones se ejecutan automáticamente al iniciar
- Los datos se mantienen entre deployments

### Seguridad

- Helmet configurado para headers de seguridad
- Rate limiting en API endpoints
- Cookies seguras en producción
- Sessions almacenadas en PostgreSQL

---

*Última actualización: Enero 31, 2026*
