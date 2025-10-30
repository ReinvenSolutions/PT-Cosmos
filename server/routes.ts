import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import { generatePublicQuotePDF } from "./publicPdfGenerator";
import passport from "./auth";
import { requireAuth, requireRole, requireRoles } from "./middleware";
import bcrypt from "bcrypt";
import { insertUserSchema, insertClientSchema, insertQuoteSchema, insertDestinationSchema, type User } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const uploadsDir = process.env.PRIVATE_OBJECT_DIR || "/tmp/uploads";
  app.use("/uploads", express.static(uploadsDir));

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: User | false, info: any) => {
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

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }
    const user = req.user as User;
    const { passwordHash, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  });

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

  app.get("/api/destinations/:id", async (req, res) => {
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

  app.post("/api/admin/clients", requireRole("super_admin"), async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.json(client);
    } catch (error: any) {
      console.error("Error creating client:", error);
      if (error.code === '23505') {
        res.status(400).json({ message: "Ya existe un cliente con este email" });
      } else {
        res.status(500).json({ message: "Failed to create client" });
      }
    }
  });

  app.get("/api/admin/clients", requireRoles(["super_admin", "advisor"]), async (req, res) => {
    try {
      const clients = await storage.listClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post("/api/admin/destinations", requireRole("super_admin"), async (req, res) => {
    try {
      const validatedData = insertDestinationSchema.parse(req.body);
      const destination = await storage.createDestination(validatedData);
      res.json(destination);
    } catch (error: any) {
      console.error("Error creating destination:", error);
      if (error.code === '23505') {
        res.status(400).json({ message: "Ya existe un destino con este nombre y país" });
      } else {
        res.status(500).json({ message: "Failed to create destination" });
      }
    }
  });

  app.put("/api/admin/destinations/:id", requireRole("super_admin"), async (req, res) => {
    try {
      const destination = await storage.updateDestination(req.params.id, req.body);
      res.json(destination);
    } catch (error) {
      console.error("Error updating destination:", error);
      res.status(500).json({ message: "Failed to update destination" });
    }
  });

  app.get("/api/admin/quotes", requireRole("super_admin"), async (req, res) => {
    try {
      const quotes = await storage.listAllQuotes();
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching all quotes:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  app.get("/api/admin/quotes/stats", requireRole("super_admin"), async (req, res) => {
    try {
      const stats = await storage.getQuoteStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching quote stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.post("/api/quotes", requireRole("advisor"), async (req, res) => {
    try {
      const user = req.user as User;
      const { clientId, totalPrice, destinations } = req.body;

      if (!clientId || !totalPrice || !destinations || !Array.isArray(destinations)) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const quoteData = {
        clientId,
        userId: user.id,
        totalPrice,
        status: "draft",
      };

      const quote = await storage.createQuote(quoteData, destinations);
      res.json(quote);
    } catch (error) {
      console.error("Error creating quote:", error);
      res.status(500).json({ message: "Failed to create quote" });
    }
  });

  app.get("/api/quotes", requireRole("advisor"), async (req, res) => {
    try {
      const user = req.user as User;
      const quotes = await storage.listQuotesByUser(user.id);
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  app.get("/api/quotes/:id", requireRole("advisor"), async (req, res) => {
    try {
      const user = req.user as User;
      const quote = await storage.getQuote(req.params.id, user.id);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      res.json(quote);
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  app.get("/api/quotes/:id/pdf", requireRole("advisor"), async (req, res) => {
    try {
      const user = req.user as User;
      const quote = await storage.getQuote(req.params.id, user.id);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      const destinationsWithDetails = await Promise.all(
        quote.destinations.map(async (qd) => {
          const itinerary = await storage.getItineraryDays(qd.destinationId);
          const hotels = await storage.getHotels(qd.destinationId);
          const inclusions = await storage.getInclusions(qd.destinationId);
          const exclusions = await storage.getExclusions(qd.destinationId);
          
          return {
            id: qd.destination.id,
            startDate: qd.startDate.toISOString(),
            passengers: qd.passengers,
            destination: qd.destination,
            itinerary,
            hotels,
            inclusions,
            exclusions,
          };
        })
      );

      const pdfDoc = generatePublicQuotePDF({
        destinations: destinationsWithDetails,
        startDate: destinationsWithDetails[0]?.startDate || new Date().toISOString(),
        endDate: new Date().toISOString(),
        flightsAndExtras: 0,
        landPortionTotal: Number(quote.totalPrice),
        grandTotal: Number(quote.totalPrice),
        originCity: "",
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=cotizacion-${quote.id}.pdf`);
      
      pdfDoc.pipe(res);
      pdfDoc.end();
    } catch (error) {
      console.error("Error generating quote PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
