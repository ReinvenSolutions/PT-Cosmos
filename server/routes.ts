import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import { generatePublicQuotePDF } from "./publicPdfGenerator";
import passport from "./auth";
import { requireAuth, requireRole, requireRoles } from "./middleware";
import { authLimiter, publicPdfLimiter, apiLimiter } from "./rateLimiter";
import { userRateLimiter } from "./middleware/userRateLimiter";
import { asyncHandler } from "./utils/asyncHandler";
import { logger } from "./logger";
import { quoteService } from "./services/quoteService";
import { ValidationError, NotFoundError } from "./errors/AppError";
import { getOrSetCache, CacheKeys, clearDestinationCache } from "./utils/cache";
import { db } from "./db";
import { sql, eq, and, ne } from "drizzle-orm";
import { users as usersTable } from "@shared/schema";
import bcrypt from "bcrypt";
import { insertUserSchema, insertClientSchema, insertQuoteSchema, insertDestinationSchema, insertQuoteDestinationSchema, type User } from "@shared/schema";
import { z } from "zod";
import validator from "validator";
import multer from "multer";
import { handleFileUpload, getImageBuffer } from "./upload";
import { handleExtractPlanFromDocument } from "./handlers/extractPlanFromDocument";
import { reorderPlanImages, deletePlanBucket, listBucketFiles, getPublicUrl, removeFromBucket, getMedicalAssistanceBucketName, getItineraryMapsBucketName } from "./supabaseStorage";
import { useSupabaseStorage, localToSupabaseUrl } from "./utils/imageUrls";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import type { DestinationInput } from "./types";
import {
  sendEmail,
  isEmailConfigured,
  generateNewUserNotificationHtml,
  generateWelcomeEmailHtml,
  generatePasswordResetEmailHtml,
  generate2FACodeEmailHtml,
  generateRoleChangeNotificationHtml,
} from "./email";

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(255),
  email: z.string()
    .email("El correo electrónico no es válido")
    .max(255)
    .refine((email) => {
      // Validate domain
      const domain = email.split('@')[1];
      return domain && domain.includes('.') && validator.isEmail(email);
    }, "Dominio de email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(255),
});

const publicQuotePdfSchema = z.object({
  destinations: z.array(z.object({
    id: z.string().uuid("ID de destino inválido"),
  })).min(1, "Al menos un destino es requerido"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  flightsAndExtras: z.union([z.number(), z.string()]).optional(),
  landPortionTotal: z.union([z.number(), z.string()]).optional(),
  grandTotal: z.union([z.number(), z.string()]).optional(),
  originCity: z.string().optional(),
  outboundFlightImages: z.array(z.string()).optional(),
  returnFlightImages: z.array(z.string()).optional(),
  includeFlights: z.boolean().optional(),
  outboundCabinBaggage: z.boolean().optional(),
  outboundHoldBaggage: z.boolean().optional(),
  returnCabinBaggage: z.boolean().optional(),
  returnHoldBaggage: z.boolean().optional(),
  domesticFlightImages: z.array(z.string()).optional(),
  domesticCabinBaggage: z.boolean().optional(),
  domesticHoldBaggage: z.boolean().optional(),
  connectionFlightImages: z.array(z.string()).optional(),
  connectionCabinBaggage: z.boolean().optional(),
  connectionHoldBaggage: z.boolean().optional(),
  turkeyUpgrade: z.string().nullable().optional(),
  italiaUpgrade: z.string().nullable().optional(),
  granTourUpgrade: z.string().nullable().optional(),
  trm: z.union([z.number(), z.string()]).nullable().optional(),
  grandTotalCOP: z.union([z.number(), z.string()]).nullable().optional(),
  finalPrice: z.union([z.number(), z.string()]).nullable().optional(),
  finalPriceCOP: z.union([z.number(), z.string()]).nullable().optional(),
  finalPriceCurrency: z.string().optional(),
  customFilename: z.string().nullable().optional(),
  minPayment: z.union([z.number(), z.string()]).nullable().optional(),
  minPaymentCOP: z.union([z.number(), z.string()]).nullable().optional(),
});

const createQuoteSchema = z.object({
  clientId: z.string().uuid("ID de cliente inválido"),
  totalPrice: z.union([z.number(), z.string()]),
  destinations: z.array(insertQuoteDestinationSchema).min(1, "Al menos un destino es requerido"),
  originCity: z.string().nullable().optional(),
  flightsAndExtras: z.union([z.number(), z.string()]).nullable().optional(),
  outboundFlightImages: z.array(z.string()).nullable().optional(),
  returnFlightImages: z.array(z.string()).nullable().optional(),
  domesticFlightImages: z.array(z.string()).nullable().optional(),
  includeFlights: z.boolean().optional(),
  outboundCabinBaggage: z.boolean().optional(),
  outboundHoldBaggage: z.boolean().optional(),
  returnCabinBaggage: z.boolean().optional(),
  returnHoldBaggage: z.boolean().optional(),
  domesticCabinBaggage: z.boolean().optional(),
  domesticHoldBaggage: z.boolean().optional(),
  turkeyUpgrade: z.string().nullable().optional(),
  italiaUpgrade: z.string().nullable().optional(),
  granTourUpgrade: z.string().nullable().optional(),
  trm: z.union([z.number(), z.string()]).nullable().optional(),
  customFilename: z.string().nullable().optional(),
  minPayment: z.union([z.number(), z.string()]).nullable().optional(),
  minPaymentCOP: z.union([z.number(), z.string()]).nullable().optional(),
  finalPrice: z.union([z.number(), z.string()]).nullable().optional(),
  finalPriceCOP: z.union([z.number(), z.string()]).nullable().optional(),
  finalPriceCurrency: z.string().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint (before rate limiting)
  app.get("/health", asyncHandler(async (req, res) => {
    try {
      // Check database connection
      await db.execute(sql`SELECT 1`);
      res.json({
        status: "healthy",
        database: "connected",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    } catch (error) {
      logger.error("Health check failed", { error });
      res.status(503).json({
        status: "unhealthy",
        database: "disconnected",
        timestamp: new Date().toISOString(),
      });
    }
  }));

  // Servir archivos estáticos de uploads
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
  // Imagen por defecto de asistencia médica (server/assets) - antes del static para que tenga prioridad
  app.get("/images/default/medical-assistance.png", (req, res) => {
    res.sendFile(path.join(process.cwd(), "server", "assets", "medical-assistance.png"));
  });
  // Servir imágenes estáticas de public/images
  app.use("/images", express.static(path.join(process.cwd(), "public", "images")));

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
  });

  // Multer para extract-plan: hasta 50 MB (PDFs grandes)
  const extractPlanUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
  });

  // extract-plan PRIMERO (antes de apiLimiter) para máxima prioridad
  app.post("/api/admin/extract-plan", requireRole("super_admin"), extractPlanUpload.single("file"), asyncHandler(handleExtractPlanFromDocument));
  logger.info("Route POST /api/admin/extract-plan registered (first in API stack)");

  // Apply general API rate limiting
  app.use("/api", apiLimiter);

  app.post("/api/auth/login", authLimiter, asyncHandler(async (req, res) => {
    const schema = z.object({ username: z.string(), password: z.string() });
    const { username, password } = schema.parse(req.body);

    const user = await storage.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: "Usuario o contraseña incorrectos" });
    }
    if (!user.isActive) {
      return res.status(401).json({ message: "Tu cuenta ha sido desactivada. Contacta al administrador." });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Usuario o contraseña incorrectos" });
    }

    // 2FA: activado por defecto. Solo se salta si el admin lo desactivó explícitamente (twoFactorEnabled === false)
    const twoFactorEnabled = (user as User & { twoFactorEnabled?: boolean }).twoFactorEnabled !== false;
    if (twoFactorEnabled) {
      const code = String(crypto.randomInt(100000, 999999));
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
      const tempToken = await storage.createTwoFactorSession(user.id, code, expiresAt);

      if (isEmailConfigured()) {
        const emailTo = user.email || user.username;
        await sendEmail({
          to: emailTo,
          subject: "Código de verificación - Cosmos Viajes",
          html: generate2FACodeEmailHtml(code, user.name ?? undefined),
        });
      } else if (process.env.NODE_ENV === "development") {
        logger.info("[2FA] Código (SMTP no configurado): " + code);
      }

      return res.json({
        needs2FA: true,
        tempToken,
        message: "Revisa tu correo para el código de verificación",
      });
    }

    req.logIn(user, (err: unknown) => {
      if (err) {
        logger.error("Login req.logIn error", { err, path: "/api/auth/login" });
        return res.status(500).json({ message: "Error al iniciar sesión" });
      }
      const { passwordHash, ...userWithoutPassword } = user;
      return res.json({ user: userWithoutPassword });
    });
  }));

  app.post("/api/auth/2fa/verify", authLimiter, asyncHandler(async (req, res) => {
    const schema = z.object({ tempToken: z.string(), code: z.string().length(6) });
    const { tempToken, code } = schema.parse(req.body);

    const user = await storage.verifyTwoFactorSession(tempToken, code);
    if (!user) {
      return res.status(401).json({ message: "Código inválido o expirado. Intenta iniciar sesión de nuevo." });
    }

    req.logIn(user, (err: unknown) => {
      if (err) {
        logger.error("2FA verify req.logIn error", { err, path: "/api/auth/2fa/verify" });
        return res.status(500).json({ message: "Error al iniciar sesión" });
      }
      const { passwordHash, ...userWithoutPassword } = user;
      return res.json({ user: userWithoutPassword });
    });
  }));

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.json({ message: "Sesión cerrada" });
    });
  });

  app.post("/api/auth/register", authLimiter, asyncHandler(async (req, res) => {
    // Validate input with Zod
    const validatedData = registerSchema.parse(req.body);
    const { name, email, password } = validatedData;

    const existingUser = await storage.findUserByUsername(email);
    if (existingUser) {
      throw new ValidationError("El correo ya está registrado");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Use insertUserSchema for additional validation
    const userData = insertUserSchema.parse({
      name,
      username: email,
      email,
      passwordHash: hashedPassword,
      role: "advisor",
      twoFactorEnabled: true,
    });

    const newUser = await storage.createUser(userData);

    if (isEmailConfigured()) {
      await sendEmail({
        to: email,
        subject: "¡Bienvenido a Cosmos Viajes!",
        html: generateWelcomeEmailHtml(name),
      });
      const superAdmins = await storage.findSuperAdmins();
      const notificationHtml = generateNewUserNotificationHtml({
        name: newUser.name,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        createdAt: String(newUser.createdAt),
      });
      for (const admin of superAdmins) {
        const to = admin.email || admin.username;
        if (to) {
          await sendEmail({
            to,
            subject: "Nuevo usuario registrado - Cosmos Viajes",
            html: notificationHtml,
          });
        }
      }
    }

    const { passwordHash, ...userWithoutPassword } = newUser;
    logger.info("User registered", { userId: newUser.id, email });
    res.status(201).json({ user: userWithoutPassword });
  }));

  app.post("/api/auth/forgot-password", authLimiter, asyncHandler(async (req, res) => {
    const schema = z.object({ email: z.string().email("Correo inválido") });
    const { email } = schema.parse(req.body);

    const user = await storage.findUserByUsername(email);
    if (!user) {
      return res.json({ message: "Si el correo existe, recibirás un enlace para restablecer tu contraseña." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await storage.createPasswordResetToken(user.id, token, expiresAt);

    const baseUrl = process.env.APP_URL || (req.protocol + "://" + req.get("host"));
    const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${token}`;

    if (isEmailConfigured()) {
      await sendEmail({
        to: user.email || user.username,
        subject: "Recuperar contraseña - Cosmos Viajes",
        html: generatePasswordResetEmailHtml(resetUrl, 60),
      });
    }

    res.json({ message: "Si el correo existe, recibirás un enlace para restablecer tu contraseña." });
  }));

  app.post("/api/auth/reset-password", authLimiter, asyncHandler(async (req, res) => {
    const schema = z.object({
      token: z.string().min(1, "Token requerido"),
      password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres")
        .regex(/[A-Z]/, "Debe incluir al menos una mayúscula")
        .regex(/[a-z]/, "Debe incluir al menos una minúscula")
        .regex(/[0-9]/, "Debe incluir al menos un número"),
      confirmPassword: z.string(),
    }).refine((d) => d.password === d.confirmPassword, { message: "Las contraseñas no coinciden", path: ["confirmPassword"] });
    const { token, password } = schema.parse(req.body);

    const result = await storage.consumePasswordResetToken(token);
    if (!result) {
      return res.status(400).json({ message: "El enlace ha expirado o no es válido. Solicita uno nuevo." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await storage.updateUserPassword(result.userId, hashedPassword);

    res.json({ message: "Contraseña actualizada. Ya puedes iniciar sesión." });
  }));

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }
    const user = req.user as User;
    const { passwordHash, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  });

  const profileSchema = z.object({
    name: z.string().max(255).optional(),
    avatarUrl: z.union([z.string().url(), z.null()]).optional(),
  });
  app.patch("/api/auth/profile", requireAuth, asyncHandler(async (req, res) => {
    const user = req.user as User;
    const validated = profileSchema.parse(req.body);
    const updates: { name?: string | null; avatarUrl?: string | null } = {};
    if (validated.name !== undefined) updates.name = validated.name?.trim() || null;
    if (validated.avatarUrl !== undefined) updates.avatarUrl = validated.avatarUrl;
    if (Object.keys(updates).length === 0) {
      const { passwordHash, ...rest } = user;
      return res.json({ user: rest });
    }
    const updated = await storage.updateUser(user.id, updates);
    const { passwordHash, ...userWithoutPassword } = updated;
    res.json({ user: userWithoutPassword });
  }));

  app.post("/api/upload", requireAuth, upload.single("file"), handleFileUpload);

  app.post("/api/admin/reorder-plan-images", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const schema = z.object({
      planName: z.string().min(1, "planName requerido"),
      imageUrls: z.array(z.string().url()).min(1, "imageUrls requerido"),
    });
    const { planName, imageUrls } = schema.parse(req.body);
    const result = await reorderPlanImages(planName, imageUrls);
    if (result.error) {
      return res.status(500).json({ message: result.error });
    }
    res.json({ urls: result.urls });
  }));

  const MEDICAL_IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp)$/i;

  app.get("/api/admin/medical-assistance-images", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const bucketName = getMedicalAssistanceBucketName();
    const files = await listBucketFiles(bucketName);
    const images = files
      .filter((f) => MEDICAL_IMAGE_EXT.test(f))
      .map((path) => ({ path, url: getPublicUrl(bucketName, path) }));
    res.json({ images });
  }));

  app.delete("/api/admin/medical-assistance-images", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const path = (req.query.path ?? req.body?.path) as string | undefined;
    if (!path || typeof path !== "string" || path.trim() === "") {
      return res.status(400).json({ message: "path requerido (query o body)" });
    }
    if (path.includes("..") || path.includes("/")) {
      return res.status(400).json({ message: "Path inválido" });
    }
    const bucketName = getMedicalAssistanceBucketName();
    const ok = await removeFromBucket(bucketName, [path]);
    if (!ok) return res.status(500).json({ message: "Error al eliminar la imagen" });
    res.json({ success: true });
  }));

  app.get("/api/admin/itinerary-map-images", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const bucketName = getItineraryMapsBucketName();
    const files = await listBucketFiles(bucketName);
    const images = files
      .filter((f) => MEDICAL_IMAGE_EXT.test(f))
      .map((path) => ({ path, url: getPublicUrl(bucketName, path) }));
    res.json({ images });
  }));

  app.delete("/api/admin/itinerary-map-images", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const path = (req.query.path ?? req.body?.path) as string | undefined;
    if (!path || typeof path !== "string" || path.trim() === "") {
      return res.status(400).json({ message: "path requerido (query o body)" });
    }
    if (path.includes("..") || path.includes("/")) {
      return res.status(400).json({ message: "Path inválido" });
    }
    const bucketName = getItineraryMapsBucketName();
    const ok = await removeFromBucket(bucketName, [path]);
    if (!ok) return res.status(500).json({ message: "Error al eliminar la imagen" });
    res.json({ success: true });
  }));

  // Imágenes de destinos: redirigir a Supabase CDN (rápido) o servir local como fallback
  app.get("/images/destinations/:folder/:filename", async (req, res) => {
    const { folder, filename } = req.params;
    try {
      if (!folder || !filename || folder.includes("..") || filename.includes("..") || folder.includes("/") || filename.includes("/")) {
        return res.status(400).json({ message: "Invalid path" });
      }

      // Prioridad: redirigir a Supabase (CDN, más eficiente)
      if (useSupabaseStorage()) {
        const supabaseUrl = localToSupabaseUrl(`/images/destinations/${folder}/${filename}`);
        if (supabaseUrl) {
          return res.redirect(302, supabaseUrl);
        }
      }

      // Fallback: servir desde disco local
      const imagePath = path.join(process.cwd(), "public", "images", "destinations", folder, filename);
      if (!fs.existsSync(imagePath)) {
        return res.status(404).json({ message: "Image not found" });
      }

      const ext = filename.split(".").pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
      };
      res.set("Content-Type", contentTypes[ext || ""] || "application/octet-stream");
      res.set("Cache-Control", "public, max-age=31536000");
      res.sendFile(imagePath);
    } catch (error) {
      logger.error("Error serving destination image", { error, folder, filename });
      res.status(404).json({ message: "Image not found" });
    }
  });

  // Endpoint to serve images from Object Storage with authentication
  app.get("/api/images/:filename", requireAuth, async (req, res) => {
    const { filename } = req.params;
    try {

      // Security: validate filename to prevent directory traversal
      if (!filename || filename.includes("..") || filename.includes("/")) {
        return res.status(400).json({ message: "Invalid filename" });
      }

      // Get image buffer from Object Storage or local filesystem
      const imageBuffer = await getImageBuffer(filename);

      // Determine content type based on extension
      const ext = filename.split('.').pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp'
      };

      const contentType = contentTypes[ext || ''] || 'application/octet-stream';

      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.send(imageBuffer);
    } catch (error) {
      logger.error("Error serving image", { error, filename });
      res.status(404).json({ message: "Image not found" });
    }
  });

  app.post("/api/public/quote-pdf", publicPdfLimiter, asyncHandler(async (req, res) => {
    // Validate input with Zod
    let validatedData;
    try {
      validatedData = publicQuotePdfSchema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError("Datos inválidos", error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        })));
      }
      throw error;
    }

    const {
      destinations, startDate, endDate, flightsAndExtras, landPortionTotal, grandTotal,
      originCity, outboundFlightImages, returnFlightImages, includeFlights,
      outboundCabinBaggage, outboundHoldBaggage, returnCabinBaggage, returnHoldBaggage,
      domesticFlightImages, domesticCabinBaggage, domesticHoldBaggage,
      connectionFlightImages, connectionCabinBaggage, connectionHoldBaggage,
      turkeyUpgrade, italiaUpgrade, granTourUpgrade, trm, grandTotalCOP, finalPrice, finalPriceCOP, finalPriceCurrency,
      customFilename, minPayment, minPaymentCOP
    } = validatedData;

    const destinationDetails = await Promise.all(
      destinations.map(async (dest: { id: string }) => {
        // Use cache for destination data
        const destination = await getOrSetCache(
          CacheKeys.destination(dest.id),
          () => storage.getDestination(dest.id)
        );

        const itinerary = await getOrSetCache(
          CacheKeys.itinerary(dest.id),
          () => storage.getItineraryDays(dest.id)
        );

        const hotels = await getOrSetCache(
          CacheKeys.hotels(dest.id),
          () => storage.getHotels(dest.id)
        );

        const inclusionsList = await getOrSetCache(
          CacheKeys.inclusions(dest.id),
          () => storage.getInclusions(dest.id)
        );

        const exclusionsList = await getOrSetCache(
          CacheKeys.exclusions(dest.id),
          () => storage.getExclusions(dest.id)
        );

        const images = await getOrSetCache(
          CacheKeys.images(dest.id),
          () => storage.getDestinationImages(dest.id)
        );

        return {
          id: dest.id,
          name: destination?.name || "",
          country: destination?.country || "",
          duration: destination?.duration || 0,
          nights: destination?.nights || 0,
          basePrice: destination?.basePrice || "0",
          destination,
          itinerary,
          hotels,
          inclusions: inclusionsList,
          exclusions: exclusionsList,
          images,
        };
      })
    );

    // Calculate grandTotalCOP if TRM is provided but grandTotalCOP is not
    const trmValue = Number(trm) || 0;
    const grandTotalValue = Number(grandTotal) || 0;
    let calculatedGrandTotalCOP = Number(grandTotalCOP) || null;

    if (trmValue > 0 && !calculatedGrandTotalCOP) {
      calculatedGrandTotalCOP = grandTotalValue * trmValue;
    }

    logger.info("PDF Generation Request", {
      startDate,
      endDate,
      grandTotal: grandTotalValue,
      grandTotalCOP: calculatedGrandTotalCOP,
      finalPrice: finalPrice,
      finalPriceCOP: finalPriceCOP,
      finalPriceCurrency: finalPriceCurrency,
      destinationsCount: destinations.length,
    });

    const pdfDoc = await generatePublicQuotePDF({
      destinations: destinationDetails,
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || new Date().toISOString(),
      flightsAndExtras: Number(flightsAndExtras) || 0,
      landPortionTotal: Number(landPortionTotal) || 0,
      grandTotal: grandTotalValue,
      originCity: originCity || "",
      outboundFlightImages: outboundFlightImages || undefined,
      returnFlightImages: returnFlightImages || undefined,
      includeFlights: includeFlights ?? false,
      outboundCabinBaggage: outboundCabinBaggage ?? false,
      outboundHoldBaggage: outboundHoldBaggage ?? false,
      returnCabinBaggage: returnCabinBaggage ?? false,
      returnHoldBaggage: returnHoldBaggage ?? false,
      domesticFlightImages: domesticFlightImages || undefined,
      domesticCabinBaggage: domesticCabinBaggage ?? false,
      domesticHoldBaggage: domesticHoldBaggage ?? false,
      connectionFlightImages: connectionFlightImages || undefined,
      connectionCabinBaggage: connectionCabinBaggage ?? false,
      connectionHoldBaggage: connectionHoldBaggage ?? false,
      turkeyUpgrade: turkeyUpgrade || null,
      italiaUpgrade: italiaUpgrade || null,
      granTourUpgrade: granTourUpgrade || null,
      trm: trmValue > 0 ? trmValue : null,
      grandTotalCOP: calculatedGrandTotalCOP,
      finalPrice: (finalPrice !== undefined && finalPrice !== null) ? Number(finalPrice) : null,
      finalPriceCOP: (finalPriceCOP !== undefined && finalPriceCOP !== null) ? Number(finalPriceCOP) : null,
      finalPriceCurrency: (finalPriceCurrency as "USD" | "COP" | undefined) || "USD",
      minPayment: (minPayment !== undefined && minPayment !== null) ? Number(minPayment) : null,
      minPaymentCOP: (minPaymentCOP !== undefined && minPaymentCOP !== null) ? Number(minPaymentCOP) : null,
    });

    res.setHeader('Content-Type', 'application/pdf');

    let filename = `cotizacion-${new Date().toISOString().split('T')[0]}.pdf`;
    if (customFilename && typeof customFilename === 'string' && customFilename.trim() !== '') {
      filename = customFilename.trim();
      if (!filename.toLowerCase().endsWith('.pdf')) {
        filename += '.pdf';
      }
      // Sanitize filename to prevent header injection or invalid characters
      filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    }

    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    pdfDoc.pipe(res);
    pdfDoc.end();
  }));

  // Config pública para el cliente (Supabase storage base, etc.)
  app.get("/api/config", (_req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    res.json({
      supabaseStorageBase: supabaseUrl ? `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public` : null,
    });
  });

  app.get("/api/destinations", asyncHandler(async (req, res) => {
    const isActive = req.query.isActive === "true" ? true : req.query.isActive === "false" ? false : undefined;
    const cacheKey = CacheKeys.destinations(isActive);
    const destinations = await getOrSetCache(cacheKey, () => storage.getDestinations({ isActive }));
    res.json(destinations);
  }));

  app.get("/api/destinations/:id", asyncHandler(async (req, res) => {
    const destination = await getOrSetCache(
      CacheKeys.destination(req.params.id),
      () => storage.getDestination(req.params.id)
    );

    if (!destination) {
      throw new NotFoundError("Destination");
    }

    const [itinerary, hotels, inclusions, exclusions, images] = await Promise.all([
      getOrSetCache(CacheKeys.itinerary(req.params.id), () => storage.getItineraryDays(req.params.id)),
      getOrSetCache(CacheKeys.hotels(req.params.id), () => storage.getHotels(req.params.id)),
      getOrSetCache(CacheKeys.inclusions(req.params.id), () => storage.getInclusions(req.params.id)),
      getOrSetCache(CacheKeys.exclusions(req.params.id), () => storage.getExclusions(req.params.id)),
      getOrSetCache(CacheKeys.images(req.params.id), () => storage.getDestinationImages(req.params.id)),
    ]);

    res.json({
      ...destination,
      itinerary,
      hotels,
      inclusions,
      exclusions,
      images,
    });
  }));

  app.post("/api/admin/clients", requireRoles(["super_admin", "advisor"]), asyncHandler(async (req, res) => {
    const validatedData = insertClientSchema.parse(req.body);
    try {
      const client = await storage.createClient(validatedData);
      logger.info("Client created", { clientId: client.id });
      res.json(client);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ValidationError("Ya existe un cliente con este email");
      }
      throw error;
    }
  }));

  app.get("/api/admin/clients", requireRoles(["super_admin", "advisor"]), asyncHandler(async (req, res) => {
    const clients = await storage.listClients();
    res.json(clients);
  }));

  // Admin Users - solo super_admin
  const adminCreateUserSchema = z.object({
    name: z.string().min(1, "El nombre es requerido").max(255),
    username: z.string().min(1, "El usuario es requerido").max(255).regex(/^[a-zA-Z0-9._@+\-]+$/, "Usuario: letras, números, puntos, @, guiones"),
    email: z.string().email("Email inválido").max(255).optional().nullable(),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(255),
    role: z.enum(["super_admin", "advisor"]),
  });
  const adminUpdateUserSchema = z.object({
    name: z.string().min(1).max(255).optional().nullable().transform((v) => (v && String(v).trim()) || undefined),
    username: z.string().min(1).max(255).regex(/^[a-zA-Z0-9._@+\-]+$/, "Usuario: letras, números, puntos, @, guiones").optional().nullable().transform((v) => (v && String(v).trim()) || undefined),
    email: z.union([z.string().email("Email inválido").max(255), z.literal(""), z.null()]).optional().transform((v) => (v && String(v).trim()) || null),
    role: z.enum(["super_admin", "advisor"]).optional(),
    isActive: z.boolean().optional(),
    twoFactorEnabled: z.boolean().optional(),
    password: z.union([z.string().min(6, "Mínimo 6 caracteres").max(255), z.literal("")]).optional().transform((v) => (v && v.length >= 6 ? v : undefined)),
  });

  app.get("/api/admin/users", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const usersList = await storage.listUsers();
    res.json(usersList);
  }));

  app.post("/api/admin/users", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const validated = adminCreateUserSchema.parse(req.body);
    const existing = await storage.findUserByUsername(validated.username);
    if (existing) {
      throw new ValidationError("Ya existe un usuario con ese nombre de usuario");
    }
    if (validated.email) {
      const byEmail = await db.select().from(usersTable).where(eq(usersTable.email, validated.email)).limit(1);
      if (byEmail.length > 0) throw new ValidationError("Ya existe un usuario con ese email");
    }
    const hashedPassword = await bcrypt.hash(validated.password, 10);
    const userData = insertUserSchema.parse({
      name: validated.name,
      username: validated.username,
      email: validated.email ?? null,
      passwordHash: hashedPassword,
      role: validated.role,
      isActive: true,
      twoFactorEnabled: true,
    });
    const newUser = await storage.createUser(userData);
    const { passwordHash, ...rest } = newUser;
    logger.info("Admin created user", { userId: newUser.id, username: newUser.username });
    res.status(201).json(rest);
  }));

  app.put("/api/admin/users/:id", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const validated = adminUpdateUserSchema.parse(req.body);
    const existing = await storage.findUserById(req.params.id);
    if (!existing) throw new NotFoundError("Usuario");
    const updates: Record<string, unknown> = {};
    if (validated.name !== undefined) updates.name = validated.name;
    if (validated.username !== undefined) {
      if (validated.username !== existing.username) {
        const dup = await storage.findUserByUsername(validated.username);
        if (dup) throw new ValidationError("Ya existe un usuario con ese nombre de usuario");
        updates.username = validated.username;
      }
    }
    if (validated.email !== undefined && validated.email !== existing.email) {
      if (validated.email) {
        const byEmail = await db.select().from(usersTable).where(and(eq(usersTable.email, validated.email), ne(usersTable.id, req.params.id))).limit(1);
        if (byEmail.length > 0) throw new ValidationError("Ya existe un usuario con ese email");
      }
      updates.email = validated.email;
    }
    if (validated.role !== undefined) updates.role = validated.role;
    if (validated.isActive !== undefined) updates.isActive = validated.isActive;
    if (validated.twoFactorEnabled !== undefined) updates.twoFactorEnabled = validated.twoFactorEnabled;
    if (validated.password) {
      updates.passwordHash = await bcrypt.hash(validated.password, 10);
    }
    if (Object.keys(updates).length === 0) {
      const { passwordHash, ...rest } = existing;
      return res.json(rest);
    }
    const roleChanged = validated.role !== undefined && validated.role !== existing.role;
    const newRole = (validated.role ?? existing.role) as string;

    const updated = await storage.updateUserByAdmin(req.params.id, updates as any);
    const { passwordHash, ...rest } = updated;

    if (roleChanged && isEmailConfigured() && validated.role) {
      const emailTo = updated.email || updated.username;
      await sendEmail({
        to: emailTo,
        subject: "Tu rol ha sido actualizado - Cosmos Viajes",
        html: generateRoleChangeNotificationHtml(updated.name ?? undefined, validated.role),
      });
    }

    logger.info("Admin updated user", { userId: req.params.id });
    res.json(rest);
  }));

  app.patch("/api/admin/users/:id/active", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const schema = z.object({ isActive: z.boolean() });
    const { isActive } = schema.parse(req.body);
    const currentUser = req.user as User;
    if (currentUser.id === req.params.id) {
      throw new ValidationError("No puedes desactivar tu propia cuenta");
    }
    const updated = await storage.updateUserByAdmin(req.params.id, { isActive });
    const { passwordHash, ...rest } = updated;
    logger.info("Admin toggled user active", { userId: req.params.id, isActive });
    res.json(rest);
  }));

  app.delete("/api/admin/users/:id", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const currentUser = req.user as User;
    if (currentUser.id === req.params.id) {
      throw new ValidationError("No puedes eliminar tu propia cuenta");
    }
    await storage.deleteUser(req.params.id);
    logger.info("Admin deleted user", { userId: req.params.id });
    res.json({ message: "Usuario eliminado correctamente" });
  }));

  // Schema para plan completo (destino + entidades relacionadas)
  const priceTierSchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string(),
    price: z.string(),
    isFlightDay: z.boolean().optional(),
    flightLabel: z.string().optional(),
  });
  const upgradeSchema = z.object({
    code: z.string(),
    name: z.string(),
    description: z.string().optional(),
    price: z.number(),
  });
  const fullDestinationSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    country: z.string().min(1, "El país es requerido"),
    duration: z.number().int().min(1),
    nights: z.number().int().min(0),
    description: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    basePrice: z.union([z.string(), z.number()]).nullable().optional(),
    category: z.string().default("internacional"),
    isPromotion: z.boolean().optional(),
    displayOrder: z.number().optional(),
    isActive: z.boolean().optional(),
    requiresTuesday: z.boolean().optional(),
    allowedDays: z.array(z.string()).nullable().optional(),
    priceTiers: z.array(priceTierSchema).nullable().optional(),
    upgrades: z.array(upgradeSchema).nullable().optional(),
    itinerary: z.array(z.object({
      dayNumber: z.number().int().min(1),
      title: z.string(),
      location: z.string().nullable().optional(),
      description: z.string(),
      activities: z.array(z.string()).nullable().optional(),
      meals: z.array(z.string()).nullable().optional(),
      accommodation: z.string().nullable().optional(),
    })).optional(),
    hotels: z.array(z.object({
      name: z.string(),
      category: z.string().nullable().optional(),
      location: z.string().nullable().optional(),
      imageUrl: z.string().nullable().optional(),
      nights: z.number().int().nullable().optional(),
    })).optional(),
    inclusions: z.array(z.object({ item: z.string(), displayOrder: z.number().optional() })).optional(),
    exclusions: z.array(z.object({ item: z.string(), displayOrder: z.number().optional() })).optional(),
    images: z.array(z.object({ imageUrl: z.string(), displayOrder: z.number().optional() })).optional(),
    internalFlights: z.array(z.object({
      imageUrl: z.string(),
      label: z.string().optional(),
      cabinBaggage: z.boolean().optional(),
      holdBaggage: z.boolean().optional(),
    })).nullable().optional(),
    medicalAssistanceInfo: z.string().nullable().optional(),
    medicalAssistanceImageUrl: z.string().nullable().optional(),
    firstPageComments: z.string().nullable().optional(),
    itineraryMapImageUrl: z.string().nullable().optional(),
    flightTerms: z.string().nullable().optional(),
    termsConditions: z.string().nullable().optional(),
    hasInternalOrConnectionFlight: z.boolean().optional(),
  });

  app.get("/api/admin/destinations", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const dests = await storage.getDestinations(); // Todos, incluyendo inactivos
    res.json(dests);
  }));

  app.get("/api/admin/destinations/:id", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const dest = await storage.getDestination(req.params.id);
    if (!dest) throw new NotFoundError("Destination");
    const [itinerary, hotels, inclusions, exclusions, images] = await Promise.all([
      storage.getItineraryDays(req.params.id),
      storage.getHotels(req.params.id),
      storage.getInclusions(req.params.id),
      storage.getExclusions(req.params.id),
      storage.getDestinationImages(req.params.id),
    ]);
    res.json({ ...dest, itinerary, hotels, inclusions, exclusions, images });
  }));

  app.post("/api/admin/destinations", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const validated = fullDestinationSchema.parse(req.body);
    const destData = {
      name: validated.name,
      country: validated.country,
      duration: validated.duration,
      nights: validated.nights,
      description: validated.description ?? null,
      imageUrl: validated.imageUrl ?? null,
      basePrice: validated.basePrice != null ? String(validated.basePrice) : null,
      category: validated.category,
      isPromotion: validated.isPromotion ?? false,
      displayOrder: validated.displayOrder ?? 999,
      isActive: validated.isActive ?? true,
      requiresTuesday: validated.requiresTuesday ?? false,
      allowedDays: validated.allowedDays ?? null,
      priceTiers: validated.priceTiers ?? null,
      upgrades: validated.upgrades ?? null,
      hasInternalOrConnectionFlight: validated.hasInternalOrConnectionFlight ?? false,
      internalFlights: validated.internalFlights ?? null,
      medicalAssistanceInfo: validated.medicalAssistanceInfo ?? null,
      medicalAssistanceImageUrl: validated.medicalAssistanceImageUrl ?? null,
      firstPageComments: validated.firstPageComments ?? null,
      itineraryMapImageUrl: validated.itineraryMapImageUrl ?? null,
      flightTerms: validated.flightTerms ?? null,
      termsConditions: validated.termsConditions ?? null,
    };
    try {
      const destination = await storage.createDestination(destData);
      const destId = destination.id;

      // Filtrar imágenes con URL válida (evitar errores de BD por URLs vacías)
      const validImages = validated.images?.filter((img) => img?.imageUrl && String(img.imageUrl).trim().length > 0) ?? [];

      // Ejecutar todas las operaciones de reemplazo en paralelo para mayor velocidad
      await Promise.all([
        validated.itinerary?.length ? storage.replaceItineraryDays(destId, validated.itinerary) : Promise.resolve(),
        validated.hotels?.length ? storage.replaceHotels(destId, validated.hotels) : Promise.resolve(),
        validated.inclusions?.length ? storage.replaceInclusions(destId, validated.inclusions) : Promise.resolve(),
        validated.exclusions?.length ? storage.replaceExclusions(destId, validated.exclusions) : Promise.resolve(),
        validImages.length > 0 ? storage.replaceDestinationImages(destId, validImages) : Promise.resolve(),
      ]);

      clearDestinationCache(destId);
      logger.info("Destination created", { destinationId: destId, name: destination.name });

      // Obtener datos completos en paralelo
      const [full, itinerary, hotels, inclusions, exclusions, images] = await Promise.all([
        storage.getDestination(destId),
        storage.getItineraryDays(destId),
        storage.getHotels(destId),
        storage.getInclusions(destId),
        storage.getExclusions(destId),
        storage.getDestinationImages(destId),
      ]);

      if (!full) throw new NotFoundError("Destination");
      res.status(201).json({ ...full, itinerary, hotels, inclusions, exclusions, images });
    } catch (error: any) {
      logger.error("Error creating destination", { error: error?.message, stack: error?.stack });
      if (error.code === "23505") {
        throw new ValidationError("Ya existe un destino con este nombre y país");
      }
      throw error;
    }
  }));

  app.put("/api/admin/destinations/:id", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await storage.getDestination(id);
    if (!existing) throw new NotFoundError("Destination");

    const validated = fullDestinationSchema.parse(req.body);
    const destData = {
      name: validated.name,
      country: validated.country,
      duration: validated.duration,
      nights: validated.nights,
      description: validated.description ?? null,
      imageUrl: validated.imageUrl ?? null,
      basePrice: validated.basePrice != null ? String(validated.basePrice) : null,
      category: validated.category,
      isPromotion: validated.isPromotion ?? false,
      displayOrder: validated.displayOrder ?? 999,
      isActive: validated.isActive ?? true,
      requiresTuesday: validated.requiresTuesday ?? false,
      allowedDays: validated.allowedDays ?? null,
      priceTiers: validated.priceTiers ?? null,
      upgrades: validated.upgrades ?? null,
      hasInternalOrConnectionFlight: validated.hasInternalOrConnectionFlight ?? false,
      internalFlights: validated.internalFlights ?? null,
      medicalAssistanceInfo: validated.medicalAssistanceInfo ?? null,
      medicalAssistanceImageUrl: validated.medicalAssistanceImageUrl ?? null,
      firstPageComments: validated.firstPageComments ?? null,
      itineraryMapImageUrl: validated.itineraryMapImageUrl ?? null,
      flightTerms: validated.flightTerms ?? null,
      termsConditions: validated.termsConditions ?? null,
    };
    await storage.updateDestination(id, destData);

    const validImages = validated.images?.filter((img) => img?.imageUrl && String(img.imageUrl).trim().length > 0) ?? [];

    // Ejecutar reemplazos en paralelo
    await Promise.all([
      storage.replaceItineraryDays(id, validated.itinerary ?? []),
      storage.replaceHotels(id, validated.hotels ?? []),
      storage.replaceInclusions(id, validated.inclusions ?? []),
      storage.replaceExclusions(id, validated.exclusions ?? []),
      storage.replaceDestinationImages(id, validImages),
    ]);

    clearDestinationCache(id);
    logger.info("Destination updated", { destinationId: id });

    const [full, itinerary, hotels, inclusions, exclusions, images] = await Promise.all([
      storage.getDestination(id),
      storage.getItineraryDays(id),
      storage.getHotels(id),
      storage.getInclusions(id),
      storage.getExclusions(id),
      storage.getDestinationImages(id),
    ]);

    if (!full) throw new NotFoundError("Destination");
    res.json({ ...full, itinerary, hotels, inclusions, exclusions, images });
  }));

  const reorderDestinationsSchema = z.object({
    items: z.array(z.object({ id: z.string().uuid(), displayOrder: z.number() })).min(1),
  });
  app.patch("/api/admin/destinations/reorder", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const validated = reorderDestinationsSchema.parse(req.body);
    for (const item of validated.items) {
      await storage.updateDestination(item.id, { displayOrder: item.displayOrder });
      clearDestinationCache(item.id);
    }
    logger.info("Destinations reordered", { count: validated.items.length });
    const dests = await storage.getDestinations();
    res.json(dests);
  }));

  const patchDestinationSchema = z.object({ isActive: z.boolean() });
  app.patch("/api/admin/destinations/:id", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await storage.getDestination(id);
    if (!existing) throw new NotFoundError("Destination");
    const validated = patchDestinationSchema.parse(req.body);
    await storage.updateDestination(id, { isActive: validated.isActive });
    clearDestinationCache(id);
    logger.info("Destination isActive updated", { destinationId: id, isActive: validated.isActive });
    const updated = await storage.getDestination(id);
    res.json(updated);
  }));

  app.delete("/api/admin/destinations/:id", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await storage.getDestination(id);
    if (!existing) throw new NotFoundError("Destination");

    // 1. Eliminar bucket e imágenes del plan en Supabase (antes de borrar de BD)
    const bucketResult = await deletePlanBucket(existing.name);
    if (!bucketResult.deleted && bucketResult.error && !bucketResult.error.includes("no configurado")) {
      logger.warn("Bucket del plan no se pudo eliminar, continuando con BD", {
        destinationId: id,
        name: existing.name,
        error: bucketResult.error,
      });
      // No fallamos: si Supabase falla, igual eliminamos de BD para no dejar datos huérfanos
    }

    // 2. Eliminar destino y datos relacionados de la BD (cascade limpia itinerary, hotels, inclusions, exclusions, destination_images)
    await storage.deleteDestination(id);
    clearDestinationCache(id);
    logger.info("Destination deleted", { destinationId: id, name: existing.name });
    res.json({ message: "Plan eliminado correctamente" });
  }));

  app.get("/api/admin/quotes", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const quotes = await storage.listAllQuotes();
    res.json(quotes);
  }));

  app.get("/api/admin/quotes/recent", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const quotes = await storage.getRecentQuotes(limit);
    res.json(quotes);
  }));

  app.get("/api/admin/analytics/top-destinations", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 8;
    const top = await storage.getTopDestinations(limit);
    res.json(top);
  }));

  app.get("/api/admin/analytics/top-destinations-by-amount", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 8;
    const top = await storage.getTopDestinationsByAmount(limit);
    res.json(top);
  }));

  app.get("/api/admin/quotes/stats", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const stats = await storage.getQuoteStats();
    res.json(stats);
  }));

  app.post("/api/quotes", requireRoles(["advisor", "super_admin"]), userRateLimiter, asyncHandler(async (req, res) => {
    const user = req.user as User;

    // Validate input with Zod
    const validatedData = createQuoteSchema.parse(req.body);

    const quote = await quoteService.createQuote(validatedData, user);

    logger.info("Quote created", { quoteId: quote.id, userId: user.id });
    res.json(quote);
  }));

  app.put("/api/quotes/:id", requireRoles(["advisor", "super_admin"]), userRateLimiter, asyncHandler(async (req, res) => {
    const user = req.user as User;

    // Validate input with Zod
    const validatedData = createQuoteSchema.parse(req.body);

    const quote = await quoteService.updateQuote(req.params.id, validatedData, user);

    logger.info("Quote updated", { quoteId: quote.id, userId: user.id });
    res.json(quote);
  }));

  app.get("/api/quotes", requireRoles(["advisor", "super_admin"]), asyncHandler(async (req, res) => {
    const user = req.user as User;
    const quotes = await storage.listQuotesByUser(user.id);
    res.json(quotes);
  }));

  app.get("/api/quotes/:id", requireRoles(["advisor", "super_admin"]), asyncHandler(async (req, res) => {
    const user = req.user as User;
    const quote = await storage.getQuote(req.params.id, user.id);

    if (!quote) {
      throw new NotFoundError("Quote");
    }

    res.json(quote);
  }));

  app.get("/api/quotes/:id/pdf", requireRoles(["advisor", "super_admin"]), asyncHandler(async (req, res) => {
    const user = req.user as User;
    const quote = await storage.getQuote(req.params.id, user.id);

    if (!quote) {
      throw new NotFoundError("Quote");
    }

    const destinationsWithDetails = await Promise.all(
      quote.destinations.map(async (qd) => {
        const itinerary = await storage.getItineraryDays(qd.destinationId);
        const hotels = await storage.getHotels(qd.destinationId);
        const inclusions = await storage.getInclusions(qd.destinationId);
        const exclusions = await storage.getExclusions(qd.destinationId);
        const images = await storage.getDestinationImages(qd.destinationId);

        return {
          id: qd.destination.id,
          name: qd.destination.name,
          country: qd.destination.country,
          duration: qd.destination.duration,
          nights: qd.destination.nights,
          basePrice: qd.price ? qd.price.toString() : qd.destination.basePrice || "0",
          startDate: qd.startDate.toISOString(),
          passengers: qd.passengers,
          destination: qd.destination,
          itinerary,
          hotels,
          inclusions,
          exclusions,
          images,
        };
      })
    );

    const startDate = destinationsWithDetails[0]?.startDate || new Date().toISOString();

    // Calculate total duration - suma las duraciones base
    let totalDuration = destinationsWithDetails.reduce((sum, d) => sum + (d.duration || 0), 0);

    // Verificar si hay destinos internacionales que requieren día extra
    // Perú NO requiere día extra (vuelo corto desde Colombia)
    const requiresExtraDay = destinationsWithDetails.some(d => {
      const country = d.country?.toLowerCase() || "";
      return country !== "colombia" && country !== "perú" && country !== "peru";
    });

    // Para destinos internacionales (excepto Perú), agregar 1 día extra por vuelo desde Colombia
    if (requiresExtraDay) {
      totalDuration += 1;
    }

    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + totalDuration - 1);
    const endDate = end.toISOString();

    const landPortionTotal = destinationsWithDetails.reduce((sum, d) => sum + parseFloat(d.basePrice), 0);
    const flightsAndExtras = quote.flightsAndExtras ? parseFloat(quote.flightsAndExtras.toString()) : 0;

    // Calculate grandTotalCOP if TRM exists in the saved quote
    const trmValue = quote.trm ? parseFloat(quote.trm.toString()) : 0;
    const grandTotalValue = Number(quote.totalPrice);
    const calculatedGrandTotalCOP = trmValue > 0 ? grandTotalValue * trmValue : null;

    const pdfDoc = await generatePublicQuotePDF({
      destinations: destinationsWithDetails,
      startDate,
      endDate,
      flightsAndExtras,
      landPortionTotal,
      grandTotal: grandTotalValue,
      originCity: quote.originCity || "",
      outboundFlightImages: quote.outboundFlightImages || undefined,
      returnFlightImages: quote.returnFlightImages || undefined,
      includeFlights: quote.includeFlights ?? false,
      outboundCabinBaggage: quote.outboundCabinBaggage ?? false,
      outboundHoldBaggage: quote.outboundHoldBaggage ?? false,
      returnCabinBaggage: quote.returnCabinBaggage ?? false,
      returnHoldBaggage: quote.returnHoldBaggage ?? false,
      domesticFlightImages: quote.domesticFlightImages || undefined,
      domesticCabinBaggage: quote.domesticCabinBaggage ?? false,
      domesticHoldBaggage: quote.domesticHoldBaggage ?? false,
      turkeyUpgrade: quote.turkeyUpgrade || null,
      italiaUpgrade: quote.italiaUpgrade || null,
      granTourUpgrade: quote.granTourUpgrade || null,
      trm: trmValue > 0 ? trmValue : null,
      grandTotalCOP: calculatedGrandTotalCOP,
      minPayment: quote.minPayment ? Number(quote.minPayment) : undefined,
      minPaymentCOP: quote.minPaymentCOP ? Number(quote.minPaymentCOP) : undefined,
      finalPrice: quote.finalPrice ? Number(quote.finalPrice) : undefined,
      finalPriceCOP: quote.finalPriceCOP ? Number(quote.finalPriceCOP) : undefined,
      finalPriceCurrency: (quote.finalPriceCurrency as "USD" | "COP") || "USD",
    });

    res.setHeader('Content-Type', 'application/pdf');
    const filename = quote.customFilename
      ? (quote.customFilename.endsWith('.pdf') ? quote.customFilename : `${quote.customFilename}.pdf`)
      : `cotizacion-${quote.id}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    pdfDoc.pipe(res);
    pdfDoc.end();
  }));

  app.delete("/api/quotes/:id", requireRoles(["advisor", "super_admin"]), asyncHandler(async (req, res) => {
    const user = req.user as User;
    const quote = await storage.getQuote(req.params.id, user.id);

    if (!quote) {
      throw new NotFoundError("Quote");
    }

    await storage.deleteQuote(req.params.id, user.id);
    logger.info("Quote deleted", { quoteId: req.params.id, userId: user.id });
    res.json({ message: "Quote deleted successfully" });
  }));

  // Analytics routes
  app.get("/api/admin/analytics/summary", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const metrics = await storage.getDashboardMetrics();
    res.json(metrics);
  }));

  app.get("/api/admin/analytics/quotes-over-time", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days as string) || 30;
    const stats = await storage.getQuotesByDateRange(days);
    res.json(stats);
  }));

  app.get("/api/admin/quotes/client/:clientId", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    const quotes = await storage.getQuotesByClient(clientId);
    res.json(quotes);
  }));

  app.post("/api/quotes/track", requireAuth, asyncHandler(async (req, res) => {
    const user = req.user as User;
    const data = req.body;

    const log = await storage.createQuoteLog({
      userId: user.id,
      clientId: data.clientId,
      totalPrice: data.totalPrice?.toString(),
      destinationId: data.destinationId,
      passengers: data.passengers,
      startDate: data.startDate ? new Date(data.startDate) : null,
      isSaved: data.isSaved || false,
      metadata: data.metadata || {},
    });

    res.status(201).json(log);
  }));

  const httpServer = createServer(app);
  return httpServer;
}
