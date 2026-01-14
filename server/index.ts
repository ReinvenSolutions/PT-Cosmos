import "dotenv/config"; // Must be first to load environment variables
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import pkg from 'pg';
const { Pool } = pkg;
import helmet from "helmet";
import compression from "compression";
import { env } from "./config/env";
import { logger } from "./logger";
import { errorHandler } from "./middleware/errorHandler";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import passport from "./auth";
import { seedDatabaseIfEmpty } from "./seed";
import { syncCanonicalData } from "./sync-canonical-data";

const app = express();

// Trust proxy - required for secure cookies behind Replit's load balancer
app.set("trust proxy", 1);

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], // Needed for inline styles and Google Fonts
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for Vite in dev
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"], // Allow Google Fonts
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for compatibility
}));

// Compression middleware
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6,
}));

// Limit request body size to prevent DoS attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

const PgSession = ConnectPgSimple(session);
const pool = new Pool({ connectionString: env.DATABASE_URL });

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "sessions",
      createTableIfMissing: true,
    }),
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: env.NODE_ENV === "production" ? "lax" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      // Domain should not be set - let the browser handle it automatically
      // This ensures cookies work on both replit.app and custom domains
    },
    // Ensure session is saved on every response
    proxy: env.NODE_ENV === "production",
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Error handler middleware (must be last)
  app.use(errorHandler);

  // En producción: ejecutar seeding y sincronización en background después de iniciar el servidor
  if (env.NODE_ENV === "production" || env.REPLIT_DEPLOYMENT === "1") {
    // Ejecutar en background para no bloquear el inicio del servidor
    (async () => {
      try {
        logger.info("🌱 Iniciando sincronización de datos en background...");
        // Paso 1: Seed inicial (solo si BD está vacía)
        await seedDatabaseIfEmpty();
        
        // Paso 2: Sincronizar datos canónicos (SIEMPRE en producción/deployment)
        await syncCanonicalData();
        logger.info("✅ Sincronización completada exitosamente");
      } catch (error) {
        logger.error("❌ Error durante la sincronización", { error });
      }
    })();
  }

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  server.listen(env.PORT, "0.0.0.0", () => {
    logger.info(`🚀 Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });
})();
