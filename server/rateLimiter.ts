import rateLimit from "express-rate-limit";

// Rate limiter for authentication endpoints (login, register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: "Demasiados intentos de autenticación. Por favor intenta de nuevo en 15 minutos.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count successful requests too
});

// Rate limiter for public PDF generation endpoint
export const publicPdfLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 PDF generations per minute
  message: "Demasiadas solicitudes de generación de PDF. Por favor espera un momento.",
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Demasiadas solicitudes desde esta IP. Por favor intenta de nuevo más tarde.",
  standardHeaders: true,
  legacyHeaders: false,
});
