import type { Destination } from "@shared/schema";
import { toQuoteCatalogDestination } from "@shared/destinationCatalog";

/** Campos internos que no deben exponerse en APIs públicas ni cotizaciones. */
export function stripInternalDestinationFields<T extends Destination>(destination: T): Omit<T, "cosmosAssistantNotes"> {
  const { cosmosAssistantNotes: _notes, ...publicDestination } = destination;
  return publicDestination;
}

/** Catálogo de cotización: sin HTML, galerías ni audio descriptivo. */
export function toPublicQuoteCatalog<T extends Destination>(destination: T): Omit<T, "cosmosAssistantNotes"> {
  return stripInternalDestinationFields(toQuoteCatalogDestination(destination));
}

export function stripInternalDestinationFieldsList<T extends Destination>(
  destinations: T[],
): Array<Omit<T, "cosmosAssistantNotes">> {
  return destinations.map(stripInternalDestinationFields);
}

export function toPublicQuoteCatalogList<T extends Destination>(
  destinations: T[],
): Array<Omit<T, "cosmosAssistantNotes">> {
  return destinations.map(toPublicQuoteCatalog);
}

type QuoteDestinationWithPlan = {
  destination: Destination;
  [key: string]: unknown;
};

export function stripInternalFieldsFromQuoteDestinations<T extends QuoteDestinationWithPlan>(
  quoteDestinations: T[],
): Array<Omit<T, "destination"> & { destination: Omit<Destination, "cosmosAssistantNotes"> }> {
  return quoteDestinations.map((qd) => ({
    ...qd,
    destination: stripInternalDestinationFields(qd.destination),
  }));
}
