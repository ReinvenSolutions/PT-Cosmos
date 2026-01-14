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
