# Configurar Brevo para correos (2FA, recuperación, bienvenida)

## Usar la API Key (REST), no SMTP

Este proyecto envía correos con la **API de Brevo**. SMTP en Railway suele dar timeout.

| Tipo | Uso | ¿Funciona aquí? |
|------|-----|-----------------|
| **API Key** (`xkeysib-...`) | Llamadas REST a Brevo | ✅ Sí |
| **SMTP Key** | Envío por SMTP | ❌ No se usa en producción |

## ⚠️ No actives IPs autorizadas

Si en Brevo activas [IPs autorizadas](https://app.brevo.com/security/authorised_ips), **el login de producción se rompe**: Railway no tiene IP fija y Brevo rechaza el envío del código 2FA.

- Deja esa lista **desactivada** (o vacía).
- No agregues solo tu IP de casa/oficina: eso bloquea Railway.

## Pasos en Brevo

1. Entra a [Brevo](https://app.brevo.com) → **Configuración** (engranaje)
2. **SMTP y API** → pestaña **API Keys**
3. Crea o copia una **API Key** (empieza por `xkeysib-`)
4. Confirma que el remitente `info@cosmosviajes.com` esté verificado

## Variables en Railway / `.env`

```env
BREVO_API_KEY=xkeysib-xxxxxxxx
SMTP_FROM=info@cosmosviajes.com
SMTP_FROM_NAME=Cosmos Viajes
```

## Verificar

Al iniciar el servidor verás en consola:

- `Email: ✓` → `BREVO_API_KEY` está definida
- `Email: ✗ (BREVO_API_KEY en .env)` → Falta la API key

## Si el correo no llega (Railway, etc.)

1. **IPs autorizadas**: desactívalas en https://app.brevo.com/security/authorised_ips
2. **Revisa logs**: Railway → Logs. Busca `[Email]` o `[2FA]`. Un `unauthorized` con "unrecognised IP" confirma el bloqueo de IP.
3. **Spam**: revisa carpeta de spam y filtros.

## Probar que funciona

1. Inicia sesión como super_admin
2. Ve a **Admin → Dashboard**
3. En "Acciones Rápidas", haz clic en **Probar correo**
4. Ingresa tu email y envía
5. Revisa tu bandeja (y carpeta de spam)

Si el correo llega, Brevo está bien configurado y el 2FA funcionará.
