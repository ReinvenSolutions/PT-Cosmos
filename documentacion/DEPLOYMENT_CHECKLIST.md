# 🚀 CHECKLIST DE DEPLOYMENT

## ⚠️ **CRÍTICO: Después de CADA deployment**

Ejecuta este comando en producción:

```bash
DATABASE_URL='postgresql://neondb_owner:npg_mFCT5oPH6Ovr@ep-late-union-ae03ir4o-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require' NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/activate-all-destinations.ts
```

**¿Por qué?** El script `sync-data.ts` desactiva TODOS los destinos. Si alguien lo ejecuta, necesitamos reactivar todo.

---

## 📋 Checklist Completo

### 1. Desarrollo Local
- [ ] Hacer cambios en rama `development`
- [ ] Probar en `localhost:5001`
- [ ] Verificar que no hay errores de linting
- [ ] Commit con mensaje descriptivo

### 2. Push a GitHub
- [ ] Push a rama `development`
- [ ] Verificar que CI/CD pasa (si aplica)
- [ ] Merge a `main`
- [ ] Push a `main`

### 3. Railway Deployment
- [ ] Verificar que Railway detectó el push
- [ ] Esperar que el build termine (2-5 minutos)
- [ ] **IMPORTANTE:** Ejecutar `activate-all-destinations.ts` en producción
- [ ] Verificar la URL de producción

### 4. Verificación
- [ ] Todos los destinos visibles
- [ ] Funcionalidad de vuelos de conexión (Turquía + Dubai)
- [ ] Sin errores en consola del navegador
- [ ] Prueba de creación de cotización

---

## 🆘 Troubleshooting

### Destino "Dubai y Los Emiratos" no aparece

**Solución rápida:**
```bash
# Activar todos los destinos
DATABASE_URL='[URL_PRODUCCION]' NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/activate-all-destinations.ts

# Verificar estado
DATABASE_URL='[URL_PRODUCCION]' NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/check-dubai-status.ts
```

### Error de conexión en navegador

1. Verifica que estás en `http://localhost:5001` (NO 5002)
2. Hard refresh: `Cmd+Shift+R` (Mac) o `Ctrl+Shift+R` (Windows/Linux)
3. Limpia caché del navegador
4. Intenta en modo incógnito

### Railway deployment falla

1. Verifica logs en Railway dashboard
2. Asegúrate que `package-lock.json` está sincronizado
3. Variables de entorno configuradas correctamente

---

## 🔐 Variables de Entorno en Railway

Asegúrate que estas variables estén configuradas:

- `DATABASE_URL` (Neon producción)
- `SESSION_SECRET`
- `NODE_ENV=production`
- `PORT` (Railway lo asigna automáticamente)

---

## 📞 Contacto

Si algo sale mal y no sabes cómo solucionarlo, **NO ejecutes `sync-data.ts`**. 

Consulta `SCRIPTS.md` para más información sobre scripts.

---

*Última actualización: Enero 2026*
