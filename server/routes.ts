import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hashPassword, comparePassword, isAuthenticated, loadUser, isAdmin, type AuthRequest } from "./auth";
import {
  insertClientSchema,
  insertDestinationSchema,
  insertItineraryDaySchema,
  insertHotelSchema,
  insertInclusionSchema,
  insertExclusionSchema,
  insertQuoteSchema,
  insertQuoteDestinationSchema,
  insertUserSchema,
  loginSchema,
} from "@shared/schema";
import multer from "multer";
import { handleFileUpload } from "./upload";
import express from "express";
import { generatePublicQuotePDF } from "./publicPdfGenerator";
import { seedDatabase } from "./seed";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(loadUser);

  const uploadsDir = process.env.PRIVATE_OBJECT_DIR || "/tmp/uploads";
  app.use("/uploads", express.static(uploadsDir));

  app.post("/api/register", async (req: AuthRequest, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "El email ya está registrado" });
      }
      
      const passwordHash = await hashPassword(validatedData.password);
      
      const user = await storage.createUser({
        email: validatedData.email,
        passwordHash,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        isAdmin: false,
      });
      
      req.session.userId = user.id;
      
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ message: error.message || "Error al registrar usuario" });
    }
  });

  app.post("/api/login", async (req: AuthRequest, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Email o contraseña incorrectos" });
      }
      
      const isPasswordValid = await comparePassword(validatedData.password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Email o contraseña incorrectos" });
      }
      
      req.session.userId = user.id;
      
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ message: error.message || "Error al iniciar sesión" });
    }
  });

  app.post("/api/logout", (req: AuthRequest, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Error al cerrar sesión" });
      }
      res.json({ message: "Sesión cerrada exitosamente" });
    });
  });

  app.get("/api/auth/user", async (req: AuthRequest, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "No autenticado" });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Error al obtener usuario" });
    }
  });

  app.post("/api/upload", upload.single("file"), handleFileUpload);

  app.post("/api/public/quote-pdf", async (req, res) => {
    try {
      const { destinations, startDate, endDate, flightsAndExtras, landPortionTotal, grandTotal, originCity } = req.body;
      
      if (!destinations || !Array.isArray(destinations) || destinations.length === 0) {
        return res.status(400).json({ message: "Destinations are required" });
      }
      
      const destinationDetails = await Promise.all(
        destinations.map(async (dest: any) => {
          const destination = await storage.getDestination(dest.id);
          const itinerary = await storage.getItineraryDays(dest.id);
          const hotels = await storage.getHotels(dest.id);
          const inclusionsList = await storage.getInclusions(dest.id);
          const exclusionsList = await storage.getExclusions(dest.id);
          
          return {
            ...dest,
            destination,
            itinerary,
            hotels,
            inclusions: inclusionsList,
            exclusions: exclusionsList,
          };
        })
      );
      
      const pdfDoc = generatePublicQuotePDF({
        destinations: destinationDetails,
        startDate,
        endDate,
        flightsAndExtras: Number(flightsAndExtras) || 0,
        landPortionTotal: Number(landPortionTotal) || 0,
        grandTotal: Number(grandTotal) || 0,
        originCity: originCity || "",
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=cotizacion-${new Date().toISOString().split('T')[0]}.pdf`);
      
      pdfDoc.pipe(res);
      pdfDoc.end();
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  app.post("/api/admin/seed-database", isAuthenticated, isAdmin, async (req: AuthRequest, res) => {
    try {
      console.log("Admin seed database request from user:", req.user?.id);
      
      const destinationsCount = await storage.getDestinations({ isActive: true });
      if (destinationsCount.length > 0) {
        return res.status(400).json({ 
          message: "Database already contains destinations. To re-seed, please clear the database first.",
          currentCount: destinationsCount.length
        });
      }
      
      await seedDatabase();
      
      const newCount = await storage.getDestinations({ isActive: true });
      res.json({ 
        success: true, 
        message: "Database seeded successfully!",
        destinationsCreated: newCount.length
      });
    } catch (error) {
      console.error("Error seeding database:", error);
      res.status(500).json({ 
        message: "Failed to seed database",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;
      const clients = await storage.getClients({ status, search });
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const clientQuotes = await storage.getQuotes({ search: client.name });
      
      res.json({
        ...client,
        quotes: clientQuotes,
        totalQuotes: clientQuotes.length,
        acceptedQuotes: clientQuotes.filter((q) => q.status === "accepted").length,
      });
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertClientSchema.parse(req.body);
      const client = await storage.createClient(parsed);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(400).json({ message: "Failed to create client", error });
    }
  });

  app.patch("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const client = await storage.updateClient(req.params.id, req.body);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  app.get("/api/destinations", async (req, res) => {
    try {
      const isActive = req.query.isActive === "true" ? true : req.query.isActive === "false" ? false : undefined;
      const destinations = await storage.getDestinations({ isActive });
      res.json(destinations);
    } catch (error) {
      console.error("Error fetching destinations:", error);
      res.status(500).json({ message: "Failed to fetch destinations" });
    }
  });

  app.get("/api/destinations/:id", isAuthenticated, async (req, res) => {
    try {
      const destination = await storage.getDestination(req.params.id);
      if (!destination) {
        return res.status(404).json({ message: "Destination not found" });
      }
      
      const itinerary = await storage.getItineraryDays(req.params.id);
      const hotels = await storage.getHotels(req.params.id);
      const inclusions = await storage.getInclusions(req.params.id);
      const exclusions = await storage.getExclusions(req.params.id);
      
      res.json({
        ...destination,
        itinerary,
        hotels,
        inclusions,
        exclusions,
      });
    } catch (error) {
      console.error("Error fetching destination:", error);
      res.status(500).json({ message: "Failed to fetch destination" });
    }
  });

  app.post("/api/destinations", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertDestinationSchema.parse(req.body);
      const destination = await storage.createDestination(parsed);
      res.status(201).json(destination);
    } catch (error) {
      console.error("Error creating destination:", error);
      res.status(400).json({ message: "Failed to create destination", error });
    }
  });

  app.patch("/api/destinations/:id", isAuthenticated, async (req, res) => {
    try {
      const destination = await storage.updateDestination(req.params.id, req.body);
      if (!destination) {
        return res.status(404).json({ message: "Destination not found" });
      }
      res.json(destination);
    } catch (error) {
      console.error("Error updating destination:", error);
      res.status(500).json({ message: "Failed to update destination" });
    }
  });

  app.delete("/api/destinations/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteDestination(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting destination:", error);
      res.status(500).json({ message: "Failed to delete destination" });
    }
  });

  app.post("/api/destinations/:id/itinerary", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertItineraryDaySchema.parse({
        ...req.body,
        destinationId: req.params.id,
      });
      const day = await storage.createItineraryDay(parsed);
      res.status(201).json(day);
    } catch (error) {
      console.error("Error creating itinerary day:", error);
      res.status(400).json({ message: "Failed to create itinerary day", error });
    }
  });

  app.patch("/api/itinerary/:id", isAuthenticated, async (req, res) => {
    try {
      const day = await storage.updateItineraryDay(req.params.id, req.body);
      if (!day) {
        return res.status(404).json({ message: "Itinerary day not found" });
      }
      res.json(day);
    } catch (error) {
      console.error("Error updating itinerary day:", error);
      res.status(500).json({ message: "Failed to update itinerary day" });
    }
  });

  app.delete("/api/itinerary/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteItineraryDay(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting itinerary day:", error);
      res.status(500).json({ message: "Failed to delete itinerary day" });
    }
  });

  app.post("/api/destinations/:id/hotels", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertHotelSchema.parse({
        ...req.body,
        destinationId: req.params.id,
      });
      const hotel = await storage.createHotel(parsed);
      res.status(201).json(hotel);
    } catch (error) {
      console.error("Error creating hotel:", error);
      res.status(400).json({ message: "Failed to create hotel", error });
    }
  });

  app.patch("/api/hotels/:id", isAuthenticated, async (req, res) => {
    try {
      const hotel = await storage.updateHotel(req.params.id, req.body);
      if (!hotel) {
        return res.status(404).json({ message: "Hotel not found" });
      }
      res.json(hotel);
    } catch (error) {
      console.error("Error updating hotel:", error);
      res.status(500).json({ message: "Failed to update hotel" });
    }
  });

  app.delete("/api/hotels/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteHotel(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting hotel:", error);
      res.status(500).json({ message: "Failed to delete hotel" });
    }
  });

  app.post("/api/destinations/:id/inclusions", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertInclusionSchema.parse({
        ...req.body,
        destinationId: req.params.id,
      });
      const inclusion = await storage.createInclusion(parsed);
      res.status(201).json(inclusion);
    } catch (error) {
      console.error("Error creating inclusion:", error);
      res.status(400).json({ message: "Failed to create inclusion", error });
    }
  });

  app.delete("/api/inclusions/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteInclusion(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting inclusion:", error);
      res.status(500).json({ message: "Failed to delete inclusion" });
    }
  });

  app.post("/api/destinations/:id/exclusions", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertExclusionSchema.parse({
        ...req.body,
        destinationId: req.params.id,
      });
      const exclusion = await storage.createExclusion(parsed);
      res.status(201).json(exclusion);
    } catch (error) {
      console.error("Error creating exclusion:", error);
      res.status(400).json({ message: "Failed to create exclusion", error });
    }
  });

  app.delete("/api/exclusions/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteExclusion(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting exclusion:", error);
      res.status(500).json({ message: "Failed to delete exclusion" });
    }
  });

  app.get("/api/quotes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;
      
      const quotes = await storage.getQuotes({ userId, search, status });
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  app.get("/api/quotes/:id", isAuthenticated, async (req, res) => {
    try {
      const quoteWithDetails = await storage.getQuoteWithDetails(req.params.id);
      if (!quoteWithDetails) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(quoteWithDetails);
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  app.post("/api/quotes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertQuoteSchema.parse(req.body);
      const quote = await storage.createQuote({
        ...parsed,
        userId,
      });
      res.status(201).json(quote);
    } catch (error) {
      console.error("Error creating quote:", error);
      res.status(400).json({ message: "Failed to create quote", error });
    }
  });

  app.patch("/api/quotes/:id", isAuthenticated, async (req, res) => {
    try {
      const quote = await storage.updateQuote(req.params.id, req.body);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(quote);
    } catch (error) {
      console.error("Error updating quote:", error);
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  app.delete("/api/quotes/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteQuote(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting quote:", error);
      res.status(500).json({ message: "Failed to delete quote" });
    }
  });

  app.post("/api/quotes/:id/duplicate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const originalQuote = await storage.getQuote(req.params.id);
      
      if (!originalQuote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      const { id, createdAt, updatedAt, userId: _, ...quoteData } = originalQuote;
      
      const newQuote = await storage.createQuote({
        ...quoteData,
        totalPrice: originalQuote.totalPrice,
        userId,
        clientName: `${originalQuote.clientName} (Copia)`,
        status: "draft",
      });

      const quoteDestinations = await storage.getQuoteDestinations(req.params.id);
      for (const qd of quoteDestinations) {
        await storage.createQuoteDestination({
          quoteId: newQuote.id,
          destinationId: qd.destinationId,
          displayOrder: qd.displayOrder,
          customPrice: qd.customPrice,
          customDuration: qd.customDuration,
        });
      }

      res.status(201).json(newQuote);
    } catch (error) {
      console.error("Error duplicating quote:", error);
      res.status(500).json({ message: "Failed to duplicate quote" });
    }
  });

  app.post("/api/quotes/:id/destinations", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertQuoteDestinationSchema.parse({
        ...req.body,
        quoteId: req.params.id,
      });
      const qd = await storage.createQuoteDestination(parsed);
      res.status(201).json(qd);
    } catch (error) {
      console.error("Error adding destination to quote:", error);
      res.status(400).json({ message: "Failed to add destination to quote", error });
    }
  });

  app.delete("/api/quote-destinations/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteQuoteDestination(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing destination from quote:", error);
      res.status(500).json({ message: "Failed to remove destination from quote" });
    }
  });

  app.get("/api/quotes/:id/pdf", isAuthenticated, async (req, res) => {
    try {
      const quoteWithDetails = await storage.getQuoteWithDetails(req.params.id);
      if (!quoteWithDetails) {
        return res.status(404).json({ message: "Quote not found" });
      }

      const fullDetails = {
        ...quoteWithDetails,
        destinations: await Promise.all(
          (quoteWithDetails.quoteDestinations || []).map(async (qd: any) => {
            const destination = await storage.getDestination(qd.destinationId);
            const itinerary = await storage.getItineraryDays(qd.destinationId);
            const hotels = await storage.getHotels(qd.destinationId);
            const inclusions = await storage.getInclusions(qd.destinationId);
            const exclusions = await storage.getExclusions(qd.destinationId);
            return {
              destination: destination!,
              itinerary,
              hotels,
              inclusions,
              exclusions,
            };
          })
        ),
      };

      const { generateQuotePDF } = await import("./pdfGenerator");
      const doc = generateQuotePDF(fullDetails as any);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="cotizacion-${quoteWithDetails.clientName.replace(/\s+/g, "-")}-${req.params.id.slice(0, 8)}.pdf"`
      );

      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
