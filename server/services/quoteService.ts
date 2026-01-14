import { storage } from "../storage";
import type { CreateQuoteInput } from "../types";
import type { User } from "@shared/schema";
import { NotFoundError, ValidationError } from "../errors/AppError";
import { clearDestinationCache } from "../utils/cache";
import { logger } from "../logger";

export class QuoteService {
  async createQuote(data: CreateQuoteInput, user: User) {
    // Validate turkeyUpgrade - only allow if Turquía Esencial is in destinations
    if (data.turkeyUpgrade) {
      const destinationIds = data.destinations.map((d) => d.destinationId);
      const allDestinations = await storage.getDestinations();
      const hasTurkeyEsencial = allDestinations.some(
        (dest) => destinationIds.includes(dest.id) && dest.name === "Turquía Esencial"
      );

      if (!hasTurkeyEsencial) {
        throw new ValidationError(
          "Turkey upgrade can only be selected for Turquía Esencial destination"
        );
      }
    }

    // Convert numbers to strings for decimal fields in database
    const quoteData = {
      clientId: data.clientId,
      userId: user.id,
      totalPrice: typeof data.totalPrice === "number" 
        ? data.totalPrice.toString() 
        : data.totalPrice,
      originCity: data.originCity || null,
      flightsAndExtras: data.flightsAndExtras
        ? (typeof data.flightsAndExtras === "number"
            ? data.flightsAndExtras.toString()
            : data.flightsAndExtras)
        : null,
      outboundFlightImages: data.outboundFlightImages || null,
      returnFlightImages: data.returnFlightImages || null,
      domesticFlightImages: data.domesticFlightImages || null,
      includeFlights: data.includeFlights ?? false,
      outboundCabinBaggage: data.outboundCabinBaggage ?? false,
      outboundHoldBaggage: data.outboundHoldBaggage ?? false,
      returnCabinBaggage: data.returnCabinBaggage ?? false,
      returnHoldBaggage: data.returnHoldBaggage ?? false,
      domesticCabinBaggage: data.domesticCabinBaggage ?? false,
      domesticHoldBaggage: data.domesticHoldBaggage ?? false,
      turkeyUpgrade: data.turkeyUpgrade || null,
      italiaUpgrade: data.italiaUpgrade || null,
      granTourUpgrade: data.granTourUpgrade || null,
      trm: data.trm
        ? (typeof data.trm === "number" ? data.trm.toString() : data.trm)
        : null,
      customFilename: data.customFilename || null,
      minPayment: data.minPayment
        ? (typeof data.minPayment === "number"
            ? data.minPayment.toString()
            : data.minPayment)
        : null,
      minPaymentCOP: data.minPaymentCOP
        ? (typeof data.minPaymentCOP === "number"
            ? data.minPaymentCOP.toString()
            : data.minPaymentCOP)
        : null,
      finalPrice: data.finalPrice
        ? (typeof data.finalPrice === "number"
            ? data.finalPrice.toString()
            : data.finalPrice)
        : null,
      finalPriceCOP: data.finalPriceCOP
        ? (typeof data.finalPriceCOP === "number"
            ? data.finalPriceCOP.toString()
            : data.finalPriceCOP)
        : null,
      finalPriceCurrency: data.finalPriceCurrency || "USD",
      status: "draft" as const,
    };

    const quote = await storage.createQuote(quoteData, data.destinations);
    
    // Clear cache for affected destinations
    data.destinations.forEach((dest) => {
      if (dest.destinationId) {
        clearDestinationCache(dest.destinationId);
      }
    });

    logger.info("Quote created", { quoteId: quote.id, userId: user.id });
    return quote;
  }

  async updateQuote(id: string, data: Partial<CreateQuoteInput>, user: User) {
    const existingQuote = await storage.getQuote(id, user.id);
    
    if (!existingQuote) {
      throw new NotFoundError("Quote");
    }

    // Validate turkeyUpgrade if provided
    if (data.turkeyUpgrade && data.destinations) {
      const destinationIds = data.destinations.map((d) => d.destinationId);
      const allDestinations = await storage.getDestinations();
      const hasTurkeyEsencial = allDestinations.some(
        (dest) => destinationIds.includes(dest.id) && dest.name === "Turquía Esencial"
      );

      if (!hasTurkeyEsencial) {
        throw new ValidationError(
          "Turkey upgrade can only be selected for Turquía Esencial destination"
        );
      }
    }

    // Convert numbers to strings for decimal fields
    const quoteData: Record<string, any> = {};
    if (data.totalPrice !== undefined) {
      quoteData.totalPrice = typeof data.totalPrice === "number"
        ? data.totalPrice.toString()
        : data.totalPrice;
    }
    if (data.flightsAndExtras !== undefined) {
      quoteData.flightsAndExtras = data.flightsAndExtras
        ? (typeof data.flightsAndExtras === "number"
            ? data.flightsAndExtras.toString()
            : data.flightsAndExtras)
        : null;
    }
    if (data.originCity !== undefined) {
      quoteData.originCity = data.originCity || null;
    }
    if (data.outboundFlightImages !== undefined) {
      quoteData.outboundFlightImages = data.outboundFlightImages || null;
    }
    if (data.returnFlightImages !== undefined) {
      quoteData.returnFlightImages = data.returnFlightImages || null;
    }
    if (data.domesticFlightImages !== undefined) {
      quoteData.domesticFlightImages = data.domesticFlightImages || null;
    }
    if (data.includeFlights !== undefined) {
      quoteData.includeFlights = data.includeFlights;
    }
    if (data.outboundCabinBaggage !== undefined) {
      quoteData.outboundCabinBaggage = data.outboundCabinBaggage;
    }
    if (data.outboundHoldBaggage !== undefined) {
      quoteData.outboundHoldBaggage = data.outboundHoldBaggage;
    }
    if (data.returnCabinBaggage !== undefined) {
      quoteData.returnCabinBaggage = data.returnCabinBaggage;
    }
    if (data.returnHoldBaggage !== undefined) {
      quoteData.returnHoldBaggage = data.returnHoldBaggage;
    }
    if (data.domesticCabinBaggage !== undefined) {
      quoteData.domesticCabinBaggage = data.domesticCabinBaggage;
    }
    if (data.domesticHoldBaggage !== undefined) {
      quoteData.domesticHoldBaggage = data.domesticHoldBaggage;
    }
    if (data.turkeyUpgrade !== undefined) {
      quoteData.turkeyUpgrade = data.turkeyUpgrade || null;
    }
    if (data.italiaUpgrade !== undefined) {
      quoteData.italiaUpgrade = data.italiaUpgrade || null;
    }
    if (data.granTourUpgrade !== undefined) {
      quoteData.granTourUpgrade = data.granTourUpgrade || null;
    }
    if (data.trm !== undefined) {
      quoteData.trm = data.trm
        ? (typeof data.trm === "number" ? data.trm.toString() : data.trm)
        : null;
    }
    if (data.customFilename !== undefined) {
      quoteData.customFilename = data.customFilename || null;
    }
    if (data.minPayment !== undefined) {
      quoteData.minPayment = data.minPayment
        ? (typeof data.minPayment === "number"
            ? data.minPayment.toString()
            : data.minPayment)
        : null;
    }
    if (data.minPaymentCOP !== undefined) {
      quoteData.minPaymentCOP = data.minPaymentCOP
        ? (typeof data.minPaymentCOP === "number"
            ? data.minPaymentCOP.toString()
            : data.minPaymentCOP)
        : null;
    }
    if (data.finalPrice !== undefined) {
      quoteData.finalPrice = data.finalPrice
        ? (typeof data.finalPrice === "number"
            ? data.finalPrice.toString()
            : data.finalPrice)
        : null;
    }
    if (data.finalPriceCOP !== undefined) {
      quoteData.finalPriceCOP = data.finalPriceCOP
        ? (typeof data.finalPriceCOP === "number"
            ? data.finalPriceCOP.toString()
            : data.finalPriceCOP)
        : null;
    }
    if (data.finalPriceCurrency !== undefined) {
      quoteData.finalPriceCurrency = data.finalPriceCurrency || "USD";
    }

    const quote = await storage.updateQuote(
      id,
      user.id,
      quoteData,
      data.destinations || []
    );

    // Clear cache
    if (data.destinations) {
      data.destinations.forEach((dest) => {
        if (dest.destinationId) {
          clearDestinationCache(dest.destinationId);
        }
      });
    }

    logger.info("Quote updated", { quoteId: quote.id, userId: user.id });
    return quote;
  }
}

export const quoteService = new QuoteService();
