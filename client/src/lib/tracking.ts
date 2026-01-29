import { apiRequest } from "./queryClient";

export interface TrackQuoteParams {
    clientId?: string | null;
    totalPrice?: number | string | null;
    destinationId?: string | null;
    passengers?: number | null;
    startDate?: string | Date | null;
    isSaved?: boolean;
    metadata?: Record<string, any>;
}

/**
 * Tracks a quotation attempt in the backend.
 * This can be called even for unsaved quotes to provide analytics.
 */
export async function trackQuote(params: TrackQuoteParams) {
    try {
        await apiRequest("POST", "/api/quotes/track", {
            clientId: params.clientId || null,
            totalPrice: params.totalPrice || null,
            destinationId: params.destinationId || null,
            passengers: params.passengers || null,
            startDate: params.startDate || null,
            isSaved: params.isSaved || false,
            metadata: params.metadata || {},
        });
    } catch (error) {
        // We don't want tracking errors to break the main UI flow
        console.error("Failed to track quote:", error);
    }
}
