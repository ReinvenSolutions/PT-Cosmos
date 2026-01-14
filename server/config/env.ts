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
  
  // Optional
  REPLIT_DEPLOYMENT: z.string().optional(),
  DEFAULT_OBJECT_STORAGE_BUCKET_ID: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
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
if (env.NODE_ENV === "production" || env.REPLIT_DEPLOYMENT === "1") {
  if (env.SESSION_SECRET.length < 32 || env.SESSION_SECRET === "dev-secret-change-in-production") {
    console.error(
      "❌ SESSION_SECRET must be set to a secure random value in production.\n" +
      "   Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
    process.exit(1);
  }
}

export default env;
