import { RateLimiterMemory } from "rate-limiter-flexible";
import type { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "../errors/AppError";

// Rate limiter for authenticated users
const userLimiter = new RateLimiterMemory({
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
});

export async function userRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Only apply to authenticated users
  if (!req.user || !req.user.id) {
    return next();
  }

  try {
    await userLimiter.consume(req.user.id);
    next();
  } catch {
    throw new ForbiddenError(
      "Demasiadas solicitudes. Por favor espera un momento antes de intentar de nuevo."
    );
  }
}
