import type { Request, Response, NextFunction } from "express";
import { AppError, ValidationError } from "../errors/AppError";
import { logger } from "../logger";
import { env } from "../config/env";
import { z } from "zod";

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Convert Zod errors to ValidationError
  if (err instanceof z.ZodError) {
    err = new ValidationError("Datos inválidos", err.errors.map(e => ({ 
      field: e.path.join('.'), 
      message: e.message 
    })));
  }

  // Multer: errores de subida de archivo → mensaje claro y JSON
  const multerErr = err as { code?: string; field?: string };
  if (multerErr?.code === "LIMIT_FILE_SIZE") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(400).json({ message: "Archivo muy grande. Supera el límite permitido." });
  }
  if (multerErr?.code === "LIMIT_UNEXPECTED_FILE") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(400).json({ message: "Campo de archivo incorrecto. Usa el campo 'file'." });
  }

  // Log error
  if (err instanceof AppError) {
    logger.warn("Application error", {
      statusCode: err.statusCode,
      message: err.message,
      path: req.path,
      method: req.method,
      isOperational: err.isOperational,
    });
  } else {
    logger.error("Unhandled error", {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  // Determine status code
  const statusCode = err instanceof AppError 
    ? err.statusCode 
    : 500;

  // Determine error message
  const isProduction = env.NODE_ENV === "production";
  const message = isProduction && statusCode === 500
    ? "Internal Server Error"
    : err.message || "Internal Server Error";

  // Send error response
  res.status(statusCode).json({
    message,
    ...(err instanceof AppError && 'errors' in err ? { errors: (err as any).errors } : {}),
    ...(!isProduction && err.stack ? { stack: err.stack } : {}),
  });
}
