import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import { generatePublicQuotePDF } from "./publicPdfGenerator";

export async function registerRoutes(app: Express): Promise<Server> {
  const uploadsDir = process.env.PRIVATE_OBJECT_DIR || "/tmp/uploads";
  app.use("/uploads", express.static(uploadsDir));

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

  const httpServer = createServer(app);
  return httpServer;
}
