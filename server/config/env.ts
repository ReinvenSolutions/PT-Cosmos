import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  
  // Server
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().regex(/^\d+$/).transform(Number).default("5000"),
  
  // Security
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  
  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).optional(),
  
  // Optional (Railway sets RAILWAY_ENVIRONMENT in production)
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().regex(/^\d+$/).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  SMTP_FROM_NAME: z.string().optional(),
});

function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Invalid environment variables:");
      error.errors.forEach((err) => {
        console.error(`   ${err.path.join(".")}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

export const env = validateEnv();

// Validate SESSION_SECRET in production
const isProduction = env.NODE_ENV === "production" || !!process.env.RAILWAY_ENVIRONMENT;
if (isProduction) {
  if (env.SESSION_SECRET.length < 32 || env.SESSION_SECRET === "dev-secret-change-in-production") {
    console.error(
      "❌ SESSION_SECRET must be set to a secure random value in production.\n" +
      "   Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
    process.exit(1);
  }
}

export default env;
