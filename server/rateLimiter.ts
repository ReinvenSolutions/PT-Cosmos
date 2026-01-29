import rateLimit from "express-rate-limit";

const isDevelopment = process.env.NODE_ENV === 'development';

// Rate limiter for authentication endpoints (login, register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 5, // More permissive in development
  message: "Demasiados intentos de autenticación. Por favor intenta de nuevo en 15 minutos.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count successful requests too
});

// Rate limiter for public PDF generation endpoint
export const publicPdfLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDevelopment ? 1000 : 10, // More permissive in development
  message: "Demasiadas solicitudes de generación de PDF. Por favor espera un momento.",
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 10000 : 100, // Much more permissive in development
  message: "Demasiadas solicitudes desde esta IP. Por favor intenta de nuevo más tarde.",
  standardHeaders: true,
  legacyHeaders: false,
});
