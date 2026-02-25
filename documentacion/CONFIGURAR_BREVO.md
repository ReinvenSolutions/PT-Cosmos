# Configurar Brevo para correos (2FA, recuperación, bienvenida)

## ⚠️ Usar SMTP Key, NO la API Key

Brevo tiene dos tipos de credenciales. **Este proyecto usa SMTP**, no la API REST.

| Tipo | Uso | ¿Funciona aquí? |
|------|-----|-----------------|
| **SMTP Key** | Envío por SMTP (nodemailer) | ✅ Sí |
| **API Key** | Llamadas REST a Brevo | ❌ No se usa |

## Pasos en Brevo

1. Entra a [Brevo](https://app.brevo.com) → **Configuración** (engranaje)
2. **SMTP y API** → pestaña **SMTP**
3. Genera una **clave SMTP** (o usa la existente)
4. Copia esa clave

## Variables en tu `.env`

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=info@cosmosviajes.com
SMTP_PASS=xxxxxxxx
SMTP_FROM=info@cosmosviajes.com
SMTP_FROM_NAME=Cosmos Viajes
```

- **SMTP_USER**: Email de tu cuenta Brevo (remitente)
- **SMTP_PASS**: La **clave SMTP** que generaste (no la API key)

## Verificar

Al iniciar el servidor verás en consola:

- `Email: ✓` → Configurado correctamente
- `Email: ✗ (SMTP_USER/SMTP_PASS en .env)` → Faltan o son incorrectas

## Si usaste la API Key por error

La API Key de Brevo no sirve para SMTP. Debes generar la clave SMTP en la sección indicada.

## Si el correo no llega (Railway, etc.)

1. **Prueba puerto 465**: En Railway, cambia `SMTP_PORT=465`. Algunos entornos tienen problemas con 587.
2. **Revisa logs**: Railway → Logs. Busca `[Email]` o `[2FA]`. Si ves "Error al enviar" con `code` o `response`, eso indica el fallo.
3. **Spam**: Revisa carpeta de spam y filtros.

## Probar que funciona

1. Inicia sesión como super_admin
2. Ve a **Admin → Dashboard**
3. En "Acciones Rápidas", haz clic en **Probar correo**
4. Ingresa tu email y envía
5. Revisa tu bandeja (y carpeta de spam)

Si el correo llega, Brevo está bien configurado y el 2FA funcionará.
