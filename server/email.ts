/**
 * Servicio de email con Brevo (SMTP)
 * Configuración: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 * Remitente por defecto: info@cosmosviajes.com
 */

import nodemailer from "nodemailer";
import { formatUSD } from "@shared/schema";
import { logger } from "./logger";

const BREVO_SMTP_HOST = "smtp-relay.brevo.com";
const BREVO_SMTP_PORT = 587;
const DEFAULT_FROM = "info@cosmosviajes.com";
const DEFAULT_FROM_NAME = "Cosmos Viajes";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

function getTransporter() {
  const host = process.env.SMTP_HOST || BREVO_SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || String(BREVO_SMTP_PORT), 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    logger.warn("[Email] SMTP no configurado. Define SMTP_USER y SMTP_PASS para enviar correos.");
    return false;
  }

  const fromEmail = process.env.SMTP_FROM || DEFAULT_FROM;
  const fromName = process.env.SMTP_FROM_NAME || DEFAULT_FROM_NAME;

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo || fromEmail,
    });

    logger.info("[Email] Enviado correctamente", {
      to: options.to,
      subject: options.subject,
      messageId: info.messageId,
    });
    return true;
  } catch (error) {
    logger.error("[Email] Error al enviar", {
      to: options.to,
      subject: options.subject,
      error: (error as Error).message,
    });
    return false;
  }
}

/* Identidad visual Cosmos Viajes: teal #205567, oro #C6A242, aqua #8CC7D5 */
const COSMOS_TEAL = "#205567";
const COSMOS_GOLD = "#C6A242";
const COSMOS_AQUA = "#8CC7D5";
const COSMOS_TEAL_LIGHT = "#e8f2f5";

const baseEmailStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; background: #f5f9fa; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: linear-gradient(135deg, ${COSMOS_TEAL} 0%, #2d6b7e 100%); color: white; padding: 28px; text-align: center; border-radius: 12px 12px 0 0; }
  .header h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
  .brand-accent { color: ${COSMOS_GOLD}; font-weight: 600; }
  .content { padding: 28px; background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; }
  .button { display: inline-block; padding: 14px 28px; background: ${COSMOS_TEAL}; color: white !important; text-decoration: none; border-radius: 8px; margin: 16px 0; font-weight: 600; }
  .button:hover { background: #2d6b7e !important; }
  .footer { padding: 24px; text-align: center; font-size: 12px; color: #64748b; background: ${COSMOS_TEAL_LIGHT}; border-radius: 0 0 12px 12px; }
  .code-box { font-size: 32px; font-weight: bold; letter-spacing: 10px; padding: 20px; background: ${COSMOS_TEAL_LIGHT}; border: 2px solid ${COSMOS_AQUA}; border-radius: 10px; text-align: center; margin: 24px 0; color: ${COSMOS_TEAL}; }
  .info-row { padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
  .info-row:last-child { border-bottom: none; }
  .divider { height: 3px; background: linear-gradient(90deg, ${COSMOS_TEAL}, ${COSMOS_GOLD}); margin: 16px 0; border-radius: 2px; }
`;

export function generateNewUserNotificationHtml(user: { name?: string | null; email?: string | null; username: string; role: string; createdAt: string }): string {
  const date = new Date(user.createdAt).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>${baseEmailStyles}</style></head>
    <body>
      <div class="container">
        <div class="header"><h1>Nuevo usuario registrado</h1></div>
        <div class="content">
          <p>Se ha registrado un nuevo usuario en el <strong>Cotizador Cosmos</strong>.</p>
          <div class="divider"></div>
          <div class="info-row"><strong>Nombre:</strong> ${user.name || "—"}</div>
          <div class="info-row"><strong>Correo / Usuario:</strong> ${user.username}</div>
          <div class="info-row"><strong>Email:</strong> ${user.email || user.username}</div>
          <div class="info-row"><strong>Rol:</strong> ${user.role}</div>
          <div class="info-row"><strong>Fecha de registro:</strong> ${date}</div>
        </div>
        <div class="footer">Cosmos Viajes · Notificación automática · info@cosmosviajes.com</div>
      </div>
    </body>
    </html>
  `;
}

export function generateWelcomeEmailHtml(userName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>${baseEmailStyles}</style></head>
    <body>
      <div class="container">
        <div class="header"><h1>¡Bienvenido a <span class="brand-accent">Cosmos Viajes</span>!</h1></div>
        <div class="content">
          <h2>Hola ${userName || "viajero"},</h2>
          <p>Te damos la bienvenida al <strong>Cotizador Cosmos</strong>. Tu cuenta ha sido creada correctamente.</p>
          <div class="divider"></div>
          <p><strong>¿Qué podrás hacer en la plataforma?</strong></p>
          <ul>
            <li><strong>Explorar destinos:</strong> Perú, Turquía, Emiratos, Egipto, Finlandia, Europa y más</li>
            <li><strong>Crear cotizaciones:</strong> Genera propuestas personalizadas para tus clientes con precios, itinerarios e imágenes</li>
            <li><strong>Exportar PDFs:</strong> Descarga cotizaciones profesionales listas para enviar</li>
            <li><strong>Gestionar clientes:</strong> Mantén un registro organizado de tus viajeros</li>
          </ul>
          <p>Inicia sesión con tu correo y contraseña. Al entrar, recibirás un código de verificación por correo para mayor seguridad.</p>
          <p>Si tienes alguna pregunta, contáctanos. ¡Te deseamos muchos viajes exitosos!</p>
        </div>
        <div class="footer">Cosmos Viajes · Cotizador Mayorista · info@cosmosviajes.com</div>
      </div>
    </body>
    </html>
  `;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  advisor: "Asesor",
};

export function generateRoleChangeNotificationHtml(userName: string | undefined | null, newRole: string): string {
  const roleLabel = ROLE_LABELS[newRole] || newRole;
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>${baseEmailStyles}</style></head>
    <body>
      <div class="container">
        <div class="header"><h1>Tu rol ha sido actualizado</h1></div>
        <div class="content">
          <h2>Hola ${(userName && String(userName).trim()) || "usuario"},</h2>
          <p>Un administrador ha modificado tu rol en el <strong>Cotizador Cosmos</strong>.</p>
          <div class="divider"></div>
          <p>Tu nuevo rol es: <strong class="brand-accent">${roleLabel}</strong></p>
          <p>Los permisos y accesos de tu cuenta se han actualizado según este cambio. Si tienes dudas, contacta al administrador.</p>
        </div>
        <div class="footer">Cosmos Viajes · Cotizador Mayorista · info@cosmosviajes.com</div>
      </div>
    </body>
    </html>
  `;
}

export function generatePasswordResetEmailHtml(resetUrl: string, expiresInMinutes: number): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>${baseEmailStyles}</style></head>
    <body>
      <div class="container">
        <div class="header"><h1>Recuperar contraseña</h1></div>
        <div class="content">
          <p>Has solicitado restablecer tu contraseña en <strong>Cosmos Viajes</strong>. Haz clic en el botón para crear una nueva:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Restablecer contraseña</a>
          </p>
          <p>Este enlace expira en <strong>${expiresInMinutes} minutos</strong>. Si no solicitaste este cambio, ignora este correo.</p>
        </div>
        <div class="footer">Cosmos Viajes · Cotizador Mayorista · info@cosmosviajes.com</div>
      </div>
    </body>
    </html>
  `;
}

export function generate2FACodeEmailHtml(code: string, userName?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>${baseEmailStyles}</style></head>
    <body>
      <div class="container">
        <div class="header"><h1>Código de verificación</h1></div>
        <div class="content">
          <p>Hola ${userName || "usuario"},</p>
          <p>Tu código de verificación para iniciar sesión en <strong>Cosmos Viajes</strong> es:</p>
          <div class="code-box">${code}</div>
          <p>Este código expira en <strong>2 minutos</strong>. No lo compartas con nadie.</p>
        </div>
        <div class="footer">Cosmos Viajes · Cotizador Mayorista · info@cosmosviajes.com</div>
      </div>
    </body>
    </html>
  `;
}

export function generateQuoteEmailHtml(quote: any, pdfUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>${baseEmailStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Tu Cotización de Viaje</h1>
        </div>
        <div class="content">
          <h2>Hola ${quote.clientName},</h2>
          <p>Gracias por tu interés en nuestros paquetes turísticos. Adjuntamos tu cotización personalizada.</p>
          
          <p><strong>Detalles de la Cotización:</strong></p>
          <ul>
            <li>Precio Total: ${quote.currency} ${formatUSD(quote.totalPrice)}</li>
            <li>Adultos: ${quote.adults}</li>
            <li>Niños: ${quote.children}</li>
          </ul>
          
          <a href="${pdfUrl}" class="button">Descargar Cotización PDF</a>
          
          <p>Si tienes alguna pregunta o deseas hacer cambios a tu cotización, no dudes en contactarnos.</p>
          
          <p>¡Esperamos poder ayudarte a planificar tu viaje perfecto!</p>
        </div>
        <div class="footer">
          Cosmos Viajes · Cotizador Mayorista · info@cosmosviajes.com
        </div>
      </div>
    </body>
    </html>
  `;
}
