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
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import { insertUserSchema, insertClientSchema, insertQuoteSchema, insertDestinationSchema, insertQuoteDestinationSchema, type User } from "@shared/schema";
import { z } from "zod";
import validator from "validator";
import multer from "multer";
import { handleFileUpload, getImageBuffer } from "./upload";
import path from "path";
import fs from "fs";
import type { DestinationInput } from "./types";

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

  // Apply general API rate limiting
  app.use("/api", apiLimiter);

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
  });

  app.post("/api/auth/login", authLimiter, (req, res, next) => {
    passport.authenticate("local", (err: unknown, user: User | false, info: { message?: string }) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Credenciales inválidas" });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        const { passwordHash, ...userWithoutPassword } = user;
        return res.json({ user: userWithoutPassword });
      });
    })(req, res, next);
  });

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
    });
    
    const newUser = await storage.createUser(userData);

    const { passwordHash, ...userWithoutPassword } = newUser;
    logger.info("User registered", { userId: newUser.id, email });
    res.status(201).json({ user: userWithoutPassword });
  }));

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }
    const user = req.user as User;
    const { passwordHash, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  });

  app.post("/api/upload", requireAuth, upload.single("file"), handleFileUpload);

  // Endpoint to serve public destination images (no auth required)
  app.get("/images/destinations/:folder/:filename", async (req, res) => {
    try {
      const { folder, filename } = req.params;
      
      // Security: validate to prevent directory traversal
      if (!folder || !filename || folder.includes("..") || filename.includes("..") || folder.includes("/") || filename.includes("/")) {
        return res.status(400).json({ message: "Invalid path" });
      }
      
      const imagePath = path.join(process.cwd(), "public", "images", "destinations", folder, filename);
      
      // Check if file exists
      if (!fs.existsSync(imagePath)) {
        return res.status(404).json({ message: "Image not found" });
      }
      
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
      res.sendFile(imagePath);
    } catch (error) {
      logger.error("Error serving destination image", { error, folder, filename });
      res.status(404).json({ message: "Image not found" });
    }
  });

  // Endpoint to serve images from Object Storage with authentication
  app.get("/api/images/:filename", requireAuth, async (req, res) => {
    try {
      const { filename } = req.params;
      
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
      startDate,
      endDate,
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
      finalPriceCurrency: finalPriceCurrency || "USD",
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

  app.post("/api/admin/destinations", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const validatedData = insertDestinationSchema.parse(req.body);
    try {
      const destination = await storage.createDestination(validatedData);
      logger.info("Destination created", { destinationId: destination.id, name: destination.name });
      res.json(destination);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ValidationError("Ya existe un destino con este nombre y país");
      }
      throw error;
    }
  }));

  app.put("/api/admin/destinations/:id", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const destination = await storage.updateDestination(req.params.id, req.body);
    clearDestinationCache(req.params.id);
    logger.info("Destination updated", { destinationId: req.params.id });
    res.json(destination);
  }));

  app.get("/api/admin/quotes", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const quotes = await storage.listAllQuotes();
    res.json(quotes);
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
      let totalDuration = destinationsWithDetails.reduce((sum, d) => sum + (d.duration || 0), 0);
      const hasTurkeyDestinations = quote.destinations.some(qd => qd.destination.requiresTuesday);
      if (hasTurkeyDestinations) {
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

  const httpServer = createServer(app);
  return httpServer;
}
