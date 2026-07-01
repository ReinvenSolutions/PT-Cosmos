import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ToolItinerary, DayDetails, EventCategory } from "@shared/toolItinerary";

const ITINERARY_QUERY_KEY = "/api/tools/itinerary";

export function useToolItinerary() {
  const { data, isLoading, error } = useQuery<ToolItinerary>({
    queryKey: [ITINERARY_QUERY_KEY],
    retry: false,
    refetchOnWindowFocus: false,
  });

  const saveMutation = useMutation({
    mutationFn: async (itinerary: ToolItinerary) => {
      const response = await apiRequest("POST", ITINERARY_QUERY_KEY, itinerary);
      return await response.json();
    },
    onMutate: async (newItinerary) => {
      await queryClient.cancelQueries({ queryKey: [ITINERARY_QUERY_KEY] });
      const previousItinerary = queryClient.getQueryData([ITINERARY_QUERY_KEY]);
      queryClient.setQueryData([ITINERARY_QUERY_KEY], newItinerary);
      return { previousItinerary };
    },
    onSuccess: (savedItinerary) => {
      queryClient.setQueryData([ITINERARY_QUERY_KEY], savedItinerary);
    },
    onError: (_err, _newItinerary, context) => {
      queryClient.setQueryData([ITINERARY_QUERY_KEY], context?.previousItinerary);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", ITINERARY_QUERY_KEY);
      return await response.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [ITINERARY_QUERY_KEY] });
      const previousItinerary = queryClient.getQueryData([ITINERARY_QUERY_KEY]);
      queryClient.setQueryData([ITINERARY_QUERY_KEY], { startDate: "", days: {} });
      return { previousItinerary };
    },
    onSuccess: () => {
      queryClient.setQueryData([ITINERARY_QUERY_KEY], { startDate: "", days: {} });
    },
    onError: (_err, _variables, context) => {
      queryClient.setQueryData([ITINERARY_QUERY_KEY], context?.previousItinerary);
    },
  });

  const getCurrentState = (): { startDate: string | null; days: Record<string, DayDetails> } => {
    if (data) {
      return {
        startDate: data.startDate && data.startDate !== "" ? data.startDate : null,
        days: data.days || {},
      };
    }
    return { startDate: null, days: {} };
  };

  const currentState = getCurrentState();

  const setStartDate = (date: Date | null) => {
    const newStartDate = date ? date.toISOString().split("T")[0] : null;
    const newItinerary: ToolItinerary = {
      startDate: newStartDate || "",
      days: currentState.days,
    };

    if (newStartDate) {
      saveMutation.mutate(newItinerary);
    }
  };

  const setEvent = (dateKey: string, eventText: string, category?: EventCategory) => {
    const existingDay = currentState.days[dateKey] || {};
    const newItinerary: ToolItinerary = {
      startDate: currentState.startDate || "",
      days: {
        ...currentState.days,
        [dateKey]: {
          ...existingDay,
          event: { text: eventText, category },
        },
      },
    };
    saveMutation.mutate(newItinerary);
  };

  const deleteEvent = (dateKey: string) => {
    const newDays = { ...currentState.days };
    delete newDays[dateKey];

    const newItinerary: ToolItinerary = {
      startDate: currentState.startDate || "",
      days: newDays,
    };
    saveMutation.mutate(newItinerary);
  };

  const clearItinerary = () => {
    deleteMutation.mutate();
  };

  return {
    startDate: currentState.startDate,
    days: currentState.days,
    isLoading,
    error,
    isSaving: saveMutation.isPending || deleteMutation.isPending,
    setStartDate,
    setEvent,
    deleteEvent,
    clearItinerary,
  };
}
