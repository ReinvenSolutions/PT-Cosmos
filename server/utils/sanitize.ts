import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize HTML content to prevent XSS attacks
 * Only allows safe tags and attributes
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitize plain text (removes all HTML)
 */
export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/** Convierte HTML sanitizado a texto plano para contexto del asistente Cosmos. */
export function htmlToPlainText(html: string): string {
  const plain = sanitizeText(html)
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return plain;
}

export function sanitizeCosmosAssistantNotes(html: string | null | undefined): string | null {
  if (!html?.trim()) return null;
  const sanitized = sanitizeHtml(html.trim());
  return sanitized.trim() ? sanitized : null;
}
