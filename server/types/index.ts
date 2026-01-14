import type { Destination, QuoteDestination } from "@shared/schema";

export interface DestinationInput {
  id: string;
  destinationId?: string;
  startDate?: string | Date;
  passengers?: number;
  price?: string | number;
}

export interface CreateQuoteInput {
  clientId: string;
  totalPrice: number | string;
  destinations: Array<Omit<QuoteDestination, "id" | "quoteId">>;
  originCity?: string | null;
  flightsAndExtras?: number | string | null;
  outboundFlightImages?: string[] | null;
  returnFlightImages?: string[] | null;
  domesticFlightImages?: string[] | null;
  includeFlights?: boolean;
  outboundCabinBaggage?: boolean;
  outboundHoldBaggage?: boolean;
  returnCabinBaggage?: boolean;
  returnHoldBaggage?: boolean;
  domesticCabinBaggage?: boolean;
  domesticHoldBaggage?: boolean;
  turkeyUpgrade?: string | null;
  italiaUpgrade?: string | null;
  granTourUpgrade?: string | null;
  trm?: number | string | null;
  customFilename?: string | null;
  minPayment?: number | string | null;
  minPaymentCOP?: number | string | null;
  finalPrice?: number | string | null;
  finalPriceCOP?: number | string | null;
  finalPriceCurrency?: string;
}

export interface PublicQuotePdfInput {
  destinations: Array<{ id: string }>;
  startDate?: string;
  endDate?: string;
  flightsAndExtras?: number | string;
  landPortionTotal?: number | string;
  grandTotal?: number | string;
  originCity?: string;
  outboundFlightImages?: string[];
  returnFlightImages?: string[];
  includeFlights?: boolean;
  outboundCabinBaggage?: boolean;
  outboundHoldBaggage?: boolean;
  returnCabinBaggage?: boolean;
  returnHoldBaggage?: boolean;
  domesticFlightImages?: string[];
  domesticCabinBaggage?: boolean;
  domesticHoldBaggage?: boolean;
  connectionFlightImages?: string[];
  connectionCabinBaggage?: boolean;
  connectionHoldBaggage?: boolean;
  turkeyUpgrade?: string | null;
  italiaUpgrade?: string | null;
  granTourUpgrade?: string | null;
  trm?: number | string;
  grandTotalCOP?: number | string | null;
  finalPrice?: number | string | null;
  finalPriceCOP?: number | string | null;
  finalPriceCurrency?: string;
  customFilename?: string;
  minPayment?: number | string | null;
  minPaymentCOP?: number | string | null;
}

export interface DestinationWithDetails extends Destination {
  itinerary?: any[];
  hotels?: any[];
  inclusions?: any[];
  exclusions?: any[];
  images?: any[];
}
