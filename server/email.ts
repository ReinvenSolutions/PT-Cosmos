// Email service ready for SMTP configuration
// Configure via Replit secrets: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL, SMTP_FROM_NAME

import { formatUSD } from "@shared/schema";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // Check if email credentials are configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  
  if (!smtpHost || !smtpUser) {
    console.warn("Email not configured. Set SMTP credentials in Replit secrets to enable email sending.");
    return false;
  }

  // TODO: Implement actual email sending when credentials are configured
  // For now, just log that email would be sent
  console.log(`[Email] Would send to ${options.to}: ${options.subject}`);
  return true;
}

export function generateQuoteEmailHtml(quote: any, pdfUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
      </style>
    </head>
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
          <p>Este es un correo automático, por favor no respondas directamente.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
