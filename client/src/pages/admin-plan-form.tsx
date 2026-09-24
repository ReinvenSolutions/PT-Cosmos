import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Trash2, Upload, Save, ImageIcon, Check, ChevronRight, Building2, ChevronLeft, ImagePlus, GripVertical, FileText, CheckCircle2, Sparkles, Loader2, ImageOff, Headphones, Receipt, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CosmoProcessingDialog } from "@/components/cosmo-processing-dialog";
import { RichTextEditor } from "@/components/rich-text-editor";
import { apiRequest, queryClient, invalidatePublicDestinationQueries, invalidateAdminDestinationQueries } from "@/lib/queryClient";
import { normalizePriceTiers, normalizeTierPrice } from "@shared/priceTiers";
import type { AvailabilityDay } from "@shared/availability";
import { AvailabilityEditor } from "@/components/availability-calendar";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { PLAN_EDITOR_SECTIONS, PlanSectionNav, planSectionNeighbors } from "@/components/plan-section-nav";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, rectSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ImageUploadZone } from "@/components/image-upload-zone";
import { MedicalAssistanceGallery } from "@/components/medical-assistance-gallery";
import { ItineraryMapGallery } from "@/components/itinerary-map-gallery";
import { InternalFlightsModal, type InternalFlightItem } from "@/components/plan-modals";
import { createEmptyPlanTax, type PlanTax } from "@shared/planTaxes";
import { PLAN_MANAGER_ROLES } from "@shared/roles";
import { planNeedsInternalFlightAfterDay } from "@shared/internalFlightPlacement";

type ItineraryDay = {
  dayNumber: number;
  title: string;
  location?: string;
  description: string;
  activities?: string[];
  meals?: string[];
  accommodation?: string;
  /** Borrador de UI al editar comidas; no se envía al API */
  _mealsText?: string;
};

function parseMealsInput(raw: string): string[] {
  return raw.split(/[,;\n]/).map((m) => m.trim()).filter(Boolean);
}

function itineraryDayToPayload(d: ItineraryDay): Omit<ItineraryDay, "_mealsText"> {
  const { _mealsText, ...rest } = d;
  const meals = _mealsText !== undefined ? parseMealsInput(_mealsText) : (rest.meals ?? []);
  return { ...rest, meals };
}

type Hotel = { name: string; category?: string; location?: string; imageUrl?: string; nights?: number };
type Inclusion = { item: string; displayOrder?: number };
type Exclusion = { item: string; displayOrder?: number };
type PriceTier = { startDate?: string; endDate: string; price: string; isFlightDay?: boolean; flightLabel?: string };
type Upgrade = { code: string; name: string; description?: string; price: number };
type ImageItem = { imageUrl: string; displayOrder?: number };

const DAY_OPTIONS = [
  { value: "sunday", label: "Domingo" },
  { value: "monday", label: "Lunes" },
  { value: "tuesday", label: "Martes" },
  { value: "wednesday", label: "Miércoles" },
  { value: "thursday", label: "Jueves" },
  { value: "friday", label: "Viernes" },
  { value: "saturday", label: "Sábado" },
];

// Alternancia de filas: Color A y Color B que se repiten (Día 1→A, 2→B, 3→A, 4→B...)
const ROW_COLOR_A = "bg-muted/50";
const ROW_COLOR_B = "bg-background";

/** Misma tipografía y tamaño en todos los campos de texto largo de la pestaña Básico */
const BASIC_TAB_TEXTAREA_CLASS =
  "mt-1 text-[15px] leading-relaxed md:text-[15px]";

function SortableImageCard({
  img,
  index,
  onRemove,
  isReordering,
}: {
  img: ImageItem;
  index: number;
  onRemove: () => void;
  isReordering: boolean;
}) {
  const [loadError, setLoadError] = useState(false);
  useEffect(() => setLoadError(false), [img.imageUrl]);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: img.imageUrl, disabled: isReordering });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex flex-col rounded-xl border overflow-hidden bg-muted/20 shadow-sm hover:shadow-md transition-shadow",
        isDragging && "opacity-90 shadow-lg z-50 ring-2 ring-primary"
      )}
    >
      <div className="aspect-[4/3] flex items-center justify-center bg-muted/30 p-2 relative">
        {loadError ? (
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="h-12 w-12" />
            <span className="text-xs text-center">Imagen {index + 1}</span>
            <span className="text-xs text-destructive">Error al cargar</span>
          </div>
        ) : (
          <img
            src={img.imageUrl}
            alt={`Imagen ${index + 1}`}
            className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg pointer-events-none"
            onError={() => setLoadError(true)}
          />
        )}
        {!isReordering && (
          <button
            type="button"
            className="absolute top-2 left-2 cursor-grab active:cursor-grabbing p-1.5 rounded-md bg-background/90 border shadow-sm hover:bg-muted touch-none"
            {...attributes}
            {...listeners}
            aria-label="Arrastrar para reordenar"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between px-3 py-2 border-t bg-background/90">
        <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 -mr-1"
          onClick={(e) => { e.preventDefault(); onRemove(); }}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Eliminar
        </Button>
      </div>
    </div>
  );
}

function AdminPlanForm() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/plans/:id/edit");
  const [, isNew] = useRoute("/admin/plans/new");
  const id = isNew ? null : params?.id ?? null;
  const isEditing = !!id;

  const { toast } = useToast();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [duration, setDuration] = useState(1);
  const [nights, setNights] = useState(0);
  const [description, setDescription] = useState("");
  const [cardTooltip, setCardTooltip] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [category, setCategory] = useState("internacional");
  const [isBloqueo, setIsBloqueo] = useState(false);
  const [bloqueoSalidaFecha, setBloqueoSalidaFecha] = useState("");
  const [bloqueoCuposDisponibles, setBloqueoCuposDisponibles] = useState<number | "">("");
  const [displayOrder, setDisplayOrder] = useState(999);
  const [isActive, setIsActive] = useState(true);
  const [allowedDays, setAllowedDays] = useState<string[]>([]);
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [availabilityDays, setAvailabilityDays] = useState<AvailabilityDay[]>([]);
  const [bulkPriceInput, setBulkPriceInput] = useState("");
  const [priceQuery, setPriceQuery] = useState("");
  const [bulkExcludeFlightDays, setBulkExcludeFlightDays] = useState(false);
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [openUpgradeIndex, setOpenUpgradeIndex] = useState<number | null>(null);
  const [planTaxes, setPlanTaxes] = useState<PlanTax[]>([]);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [inclusions, setInclusions] = useState<Inclusion[]>([]);
  const [exclusions, setExclusions] = useState<Exclusion[]>([]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [hotelGalleryImages, setHotelGalleryImages] = useState<ImageItem[]>([]);
  const [adicionalesGalleryImages, setAdicionalesGalleryImages] = useState<ImageItem[]>([]);
  const [internalFlights, setInternalFlights] = useState<InternalFlightItem[]>([]);
  const [bloqueoFlightsModalOpen, setBloqueoFlightsModalOpen] = useState(false);
  const [medicalAssistanceInfo, setMedicalAssistanceInfo] = useState("");
  const [medicalAssistanceImageUrl, setMedicalAssistanceImageUrl] = useState("");
  const [firstPageComments, setFirstPageComments] = useState("");
  const [itineraryMapImageUrl, setItineraryMapImageUrl] = useState("");
  const [descriptiveAudioUrl, setDescriptiveAudioUrl] = useState("");
  const [uploadingDescriptiveAudio, setUploadingDescriptiveAudio] = useState(false);
  const [flightTerms, setFlightTerms] = useState("");
  const [termsConditions, setTermsConditions] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [cosmosAssistantNotes, setCosmosAssistantNotes] = useState("");
  const [hasInternalOrConnectionFlight, setHasInternalOrConnectionFlight] = useState(false);
  const [internalFlightAfterDay, setInternalFlightAfterDay] = useState<number | "">("");
  const [requiresExtraDay, setRequiresExtraDay] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingHotelGallery, setUploadingHotelGallery] = useState(false);
  const [uploadingAdicionalesGallery, setUploadingAdicionalesGallery] = useState(false);
  const [uploadingMainImage, setUploadingMainImage] = useState(false);
  const [galleryDialogOpen, setGalleryDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("basico");
  const [openItineraryIndex, setOpenItineraryIndex] = useState<number | null>(null);
  const [openHotelIndex, setOpenHotelIndex] = useState<number | null>(null);
  const [dragGallery, setDragGallery] = useState(false);
  const [dragHotelGallery, setDragHotelGallery] = useState(false);
  const [dragAdicionalesGallery, setDragAdicionalesGallery] = useState(false);
  const [extractingPlan, setExtractingPlan] = useState(false);
  const [cosmoSuccess, setCosmoSuccess] = useState(false);
  const [cosmoDialogOpen, setCosmoDialogOpen] = useState(false);
  const [cosmoProgress, setCosmoProgress] = useState(0);
  const [cosmoStageLabel, setCosmoStageLabel] = useState("");
  const [dragDocumentOver, setDragDocumentOver] = useState(false);
  const [dragMainImageOver, setDragMainImageOver] = useState(false);
  const { user } = useAuth();
  const canUsePlanAssistant =
    !!user?.role && (PLAN_MANAGER_ROLES as readonly string[]).includes(user.role);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hotelGalleryFileInputRef = useRef<HTMLInputElement>(null);
  const adicionalesGalleryFileInputRef = useRef<HTMLInputElement>(null);
  const mainImageFileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const descriptiveAudioFileInputRef = useRef<HTMLInputElement>(null);
  const hydratedPlanIdRef = useRef<string | null>(null);

  const { data: existing, isLoading } = useQuery<{
    name?: string;
    country?: string;
    duration?: number;
    nights?: number;
    description?: string | null;
    cardTooltip?: string | null;
    imageUrl?: string | null;
    basePrice?: string | null;
    category?: string;
    isBloqueo?: boolean;
    bloqueoSalidaFecha?: string | null;
    bloqueoCuposDisponibles?: number | null;
    displayOrder?: number;
    isActive?: boolean;
    allowedDays?: string[] | null;
    priceTiers?: PriceTier[] | null;
    availability?: AvailabilityDay[] | null;
    upgrades?: Upgrade[] | null;
    itinerary?: ItineraryDay[];
    hotels?: Hotel[];
    inclusions?: Inclusion[];
    exclusions?: Exclusion[];
    images?: ImageItem[];
    internalFlights?: InternalFlightItem[] | null;
    medicalAssistanceInfo?: string | null;
    medicalAssistanceImageUrl?: string | null;
    firstPageComments?: string | null;
    itineraryMapImageUrl?: string | null;
    flightTerms?: string | null;
    termsConditions?: string | null;
    recommendations?: string | null;
    cosmosAssistantNotes?: string | null;
    hasInternalOrConnectionFlight?: boolean;
    internalFlightAfterDay?: number | null;
    requiresExtraDay?: boolean;
    hotelGalleryImageUrls?: string[] | null;
    adicionalesGalleryImageUrls?: string[] | null;
    descriptiveAudioUrl?: string | null;
    planTaxes?: PlanTax[] | null;
  }>({
    queryKey: [`/api/admin/destinations/${id}`],
    enabled: isEditing && !!id,
    staleTime: 0,
  });

  useEffect(() => {
    if (!existing || !id) return;
    if (hydratedPlanIdRef.current === id) return;
    hydratedPlanIdRef.current = id;
      setName(existing.name ?? "");
      setCountry(existing.country ?? "");
      setDuration(existing.duration ?? 1);
      setNights(existing.nights ?? 0);
      setDescription(existing.description ?? "");
      setCardTooltip(existing.cardTooltip ?? "");
      setImageUrl(existing.imageUrl ?? "");
      setBasePrice(existing.basePrice ?? "");
      setCategory(existing.category ?? "internacional");
      setIsBloqueo(!!existing.isBloqueo);
      setBloqueoSalidaFecha(existing.bloqueoSalidaFecha?.trim() ?? "");
      setBloqueoCuposDisponibles(
        existing.bloqueoCuposDisponibles != null ? existing.bloqueoCuposDisponibles : "",
      );
      setDisplayOrder(existing.displayOrder ?? 999);
      setIsActive(existing.isActive ?? true);
      setAllowedDays(
        existing.allowedDays && existing.allowedDays.length > 0
          ? existing.allowedDays
          : (existing as { requiresTuesday?: boolean }).requiresTuesday
            ? ["tuesday"]
            : []
      );
      setPriceTiers((existing.priceTiers as PriceTier[]) ?? []);
      setAvailabilityDays(
        (existing.availability ?? []).map((day) => ({
          date: day.date,
          slots: day.slots,
          price: day.price ?? null,
        })),
      );
      setUpgrades((existing.upgrades as Upgrade[]) ?? []);
      setPlanTaxes((existing.planTaxes as PlanTax[]) ?? []);
      setItinerary((existing.itinerary as ItineraryDay[]) ?? []);
      setOpenItineraryIndex((existing.itinerary?.length ?? 0) > 0 ? 0 : null);
      setHotels((existing.hotels as Hotel[]) ?? []);
      setOpenHotelIndex((existing.hotels?.length ?? 0) > 0 ? 0 : null);
      setInclusions((existing.inclusions as Inclusion[]) ?? []);
      setExclusions((existing.exclusions as Exclusion[]) ?? []);
      setImages((existing.images as ImageItem[]) ?? []);
      setInternalFlights((existing.internalFlights as InternalFlightItem[]) ?? []);
      setMedicalAssistanceInfo(existing.medicalAssistanceInfo ?? "");
      setMedicalAssistanceImageUrl(existing.medicalAssistanceImageUrl ?? "");
      setFirstPageComments(existing.firstPageComments ?? "");
      setItineraryMapImageUrl(existing.itineraryMapImageUrl ?? "");
      setDescriptiveAudioUrl(existing.descriptiveAudioUrl ?? "");
      setFlightTerms(existing.flightTerms ?? "");
      setTermsConditions(existing.termsConditions ?? "");
      setRecommendations(existing.recommendations ?? "");
      setCosmosAssistantNotes(existing.cosmosAssistantNotes ?? "");
      setHasInternalOrConnectionFlight(existing.hasInternalOrConnectionFlight ?? false);
      setInternalFlightAfterDay(
        existing.internalFlightAfterDay != null && existing.internalFlightAfterDay > 0
          ? existing.internalFlightAfterDay
          : "",
      );
      setRequiresExtraDay(existing.requiresExtraDay ?? false);
      const hg = existing.hotelGalleryImageUrls;
      setHotelGalleryImages(
        Array.isArray(hg) && hg.length
          ? hg.filter(Boolean).map((url, i) => ({ imageUrl: url, displayOrder: i }))
          : []
      );
      const ag = existing.adicionalesGalleryImageUrls;
      setAdicionalesGalleryImages(
        Array.isArray(ag) && ag.length
          ? ag.filter(Boolean).map((url, i) => ({ imageUrl: url, displayOrder: i }))
          : []
      );
  }, [existing, id]);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (isEditing && id) {
        const res = await apiRequest("PUT", `/api/admin/destinations/${id}`, payload);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/admin/destinations", payload);
      return res.json();
    },
    onSuccess: (saved) => {
      const savedId = isEditing && id ? id : (saved as { id?: string })?.id;
      invalidateAdminDestinationQueries(queryClient, savedId);
      invalidatePublicDestinationQueries(queryClient);
      if (savedId) {
        queryClient.setQueryData([`/api/admin/destinations/${savedId}`], saved);
      }
      toast({ title: isEditing ? "Plan actualizado" : "Plan creado", description: "Los cambios se han guardado correctamente." });
      setLocation("/admin/plans");
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (isBloqueo) {
      if (!basePrice?.trim()) {
        toast({ title: "Bloqueo incompleto", description: "Indica el precio fijo (USD).", variant: "destructive" });
        return;
      }
      if (!bloqueoSalidaFecha?.trim()) {
        toast({ title: "Bloqueo incompleto", description: "Indica la fecha de salida.", variant: "destructive" });
        return;
      }
      if (bloqueoCuposDisponibles === "") {
        toast({ title: "Bloqueo incompleto", description: "Indica los cupos disponibles (0 = agotado).", variant: "destructive" });
        return;
      }
      if (!internalFlights.length) {
        toast({
          title: "Bloqueo incompleto",
          description: "Abre «Gestionar vuelos del bloqueo» y carga al menos una imagen (ida, regreso y/o conexión).",
          variant: "destructive",
        });
        return;
      }
    }
    const needsInternalAfterDay = planNeedsInternalFlightAfterDay({
      hasInternalOrConnectionFlight: isBloqueo
        ? internalFlights.some((f) => f.flightRole === "domestic" && f.imageUrl)
        : hasInternalOrConnectionFlight,
      isBloqueo,
      internalFlights,
    });
    if (needsInternalAfterDay) {
      if (!itinerary.length) {
        toast({
          title: "Itinerario requerido",
          description: "Agrega los días del itinerario para indicar después de cuál va el vuelo interno en el PDF.",
          variant: "destructive",
        });
        return;
      }
      if (
        internalFlightAfterDay === "" ||
        internalFlightAfterDay < 1 ||
        internalFlightAfterDay > itinerary.length
      ) {
        toast({
          title: "Día del vuelo interno",
          description: `Indica después de qué día (1 a ${itinerary.length}) se muestra el vuelo interno en el PDF.`,
          variant: "destructive",
        });
        return;
      }
    }
    const payload = {
      name,
      country,
      duration,
      nights,
      description: description || null,
      cardTooltip: cardTooltip?.trim() || null,
      imageUrl: imageUrl || null,
      basePrice: basePrice ? String(basePrice) : null,
      category,
      isBloqueo,
      bloqueoSalidaFecha: isBloqueo ? bloqueoSalidaFecha.trim() : null,
      bloqueoCuposDisponibles: isBloqueo ? Number(bloqueoCuposDisponibles) : null,
      displayOrder,
      isActive,
      requiresTuesday: allowedDays.length === 1 && allowedDays[0] === "tuesday",
      requiresExtraDay,
      allowedDays: allowedDays.length ? allowedDays : null,
      priceTiers: isBloqueo ? null : priceTiers.length ? normalizePriceTiers(priceTiers) : null,
      availability: isBloqueo ? undefined : availabilityDays,
      upgrades: upgrades.length ? upgrades : null,
      itinerary: itinerary.map(itineraryDayToPayload),
      hotels,
      inclusions,
      exclusions,
      images,
      hasInternalOrConnectionFlight: isBloqueo
        ? internalFlights.some((f) => f.flightRole === "domestic" && f.imageUrl)
        : hasInternalOrConnectionFlight,
      internalFlightAfterDay: needsInternalAfterDay ? Number(internalFlightAfterDay) : null,
      internalFlights: isBloqueo && internalFlights.length ? internalFlights : null,
      medicalAssistanceInfo: medicalAssistanceInfo || null,
      medicalAssistanceImageUrl: medicalAssistanceImageUrl || null,
      firstPageComments: firstPageComments || null,
      itineraryMapImageUrl: itineraryMapImageUrl || null,
      flightTerms: flightTerms || null,
      termsConditions: termsConditions || null,
      recommendations: recommendations.trim() || null,
      cosmosAssistantNotes: cosmosAssistantNotes.trim() || null,
      hotelGalleryImageUrls:
        hotelGalleryImages.length > 0 ? hotelGalleryImages.map((x) => x.imageUrl) : null,
      adicionalesGalleryImageUrls:
        adicionalesGalleryImages.length > 0
          ? adicionalesGalleryImages.map((x) => x.imageUrl)
          : null,
      descriptiveAudioUrl: descriptiveAudioUrl.trim() || null,
      planTaxes: planTaxes.filter((t) => t.label.trim() || t.amount.trim()).length
        ? planTaxes.filter((t) => t.label.trim() || t.amount.trim())
        : null,
    };
    saveMutation.mutate(payload);
  };

  const availabilitySaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleAvailabilityChange = (next: AvailabilityDay[]) => {
    setAvailabilityDays(next);
    if (!id || isBloqueo) return;
    if (availabilitySaveTimer.current) clearTimeout(availabilitySaveTimer.current);
    availabilitySaveTimer.current = setTimeout(() => {
      apiRequest("PUT", `/api/admin/destinations/${id}/availability`, { days: next })
        .then(() => {
          invalidatePublicDestinationQueries(queryClient);
          invalidateAdminDestinationQueries(queryClient, id);
        })
        .catch((error: Error) => {
          toast({
            title: "No se guardaron los cupos",
            description: error.message,
            variant: "destructive",
          });
        });
    }, 400);
  };

  const toggleAllowedDay = (day: string) => {
    setAllowedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addItineraryDay = () => {
    setOpenItineraryIndex(itinerary.length);
    setItinerary((prev) => [...prev, { dayNumber: prev.length + 1, title: "", description: "", activities: [], meals: [], accommodation: "" }]);
  };
  const updateItineraryDay = (i: number, f: Partial<ItineraryDay>) => {
    setItinerary((prev) => prev.map((d, j) => (j === i ? { ...d, ...f } : d)));
  };
  const removeItineraryDay = (i: number) => {
    setOpenItineraryIndex((current) => {
      if (current == null) return null;
      if (current === i) return i > 0 ? i - 1 : 0;
      if (current > i) return current - 1;
      return current;
    });
    setItinerary((prev) => {
      const next = prev.filter((_, j) => j !== i).map((d, j) => ({ ...d, dayNumber: j + 1 }));
      setInternalFlightAfterDay((current) => {
        if (current === "") return current;
        if (next.length === 0) return "";
        return current > next.length ? next.length : current;
      });
      return next;
    });
  };

  const addHotel = () => {
    setOpenHotelIndex(hotels.length);
    setHotels((prev) => [...prev, { name: "", category: "", location: "", nights: undefined }]);
  };
  const updateHotel = (i: number, f: Partial<Hotel>) => setHotels((prev) => prev.map((h, j) => (j === i ? { ...h, ...f } : h)));
  const removeHotel = (i: number) => {
    setOpenHotelIndex((current) => {
      if (current == null) return null;
      if (current === i) return i > 0 ? i - 1 : 0;
      if (current > i) return current - 1;
      return current;
    });
    setHotels((prev) => prev.filter((_, j) => j !== i));
  };

  const addInclusion = () => setInclusions((prev) => [...prev, { item: "" }]);
  const updateInclusion = (i: number, item: string) => setInclusions((prev) => prev.map((x, j) => (j === i ? { ...x, item } : x)));
  const removeInclusion = (i: number) => setInclusions((prev) => prev.filter((_, j) => j !== i));

  const addExclusion = () => setExclusions((prev) => [...prev, { item: "" }]);
  const updateExclusion = (i: number, item: string) => setExclusions((prev) => prev.map((x, j) => (j === i ? { ...x, item } : x)));
  const removeExclusion = (i: number) => setExclusions((prev) => prev.filter((_, j) => j !== i));

  const addPriceTier = () => setPriceTiers((prev) => [...prev, { endDate: "", price: "" }]);
  const updatePriceTier = (i: number, f: Partial<PriceTier>) => setPriceTiers((prev) => prev.map((p, j) => (j === i ? { ...p, ...f } : p)));
  const removePriceTier = (i: number) => setPriceTiers((prev) => prev.filter((_, j) => j !== i));
  const commitPriceTierPrice = (i: number) => {
    setPriceTiers((prev) =>
      prev.map((tier, j) => {
        if (j !== i || !tier.price?.trim()) return tier;
        const normalized = normalizeTierPrice(tier.price);
        return normalized ? { ...tier, price: normalized } : tier;
      }),
    );
  };

  const applyBulkPriceToAllTiers = () => {
    const trimmed = bulkPriceInput.trim();
    if (!trimmed) {
      toast({
        title: "Precio vacío",
        description: "Ingresa un precio en USD para aplicar a todas las fechas.",
        variant: "destructive",
      });
      return;
    }
    const normalizedPrice = normalizeTierPrice(trimmed);
    if (!normalizedPrice) {
      toast({
        title: "Precio inválido",
        description: "Usa un número válido en USD (ej: 540 o 540.00).",
        variant: "destructive",
      });
      return;
    }
    if (priceTiers.length === 0) {
      toast({
        title: "Sin fechas",
        description: "Agrega al menos un rango de fecha antes de aplicar un precio global.",
        variant: "destructive",
      });
      return;
    }
    const eligibleTiers = priceTiers.filter((tier) => !bulkExcludeFlightDays || !tier.isFlightDay);

    if (eligibleTiers.length === 0) {
      toast({
        title: "Nada que actualizar",
        description: "Todas las filas son días de vuelo. Desactiva «Excluir días de vuelo» para actualizarlas también.",
        variant: "destructive",
      });
      return;
    }

    setPriceTiers((prev) =>
      prev.map((tier) => {
        if (bulkExcludeFlightDays && tier.isFlightDay) return tier;
        return { ...tier, price: normalizedPrice };
      }),
    );

    const skipped = priceTiers.length - eligibleTiers.length;
    toast({
      title: "Precio aplicado",
      description:
        skipped > 0
          ? `Se actualizaron ${eligibleTiers.length} fecha(s) a USD ${normalizedPrice}. ${skipped} día(s) de vuelo no se modificaron.`
          : `Se actualizaron ${eligibleTiers.length} fecha(s) a USD ${normalizedPrice}. Puedes ajustar fechas individuales y guardar el plan.`,
    });
  };

  const addUpgrade = () => {
    setUpgrades((prev) => {
      setOpenUpgradeIndex(prev.length);
      return [...prev, { code: "", name: "", price: 0 }];
    });
  };
  const updateUpgrade = (i: number, f: Partial<Upgrade>) => setUpgrades((prev) => prev.map((u, j) => (j === i ? { ...u, ...f } : u)));
  const removeUpgrade = (i: number) => {
    setUpgrades((prev) => prev.filter((_, j) => j !== i));
    setOpenUpgradeIndex((current) => {
      if (current === null) return null;
      if (current === i) return null;
      return current > i ? current - 1 : current;
    });
  };

  const addPlanTax = () => setPlanTaxes((prev) => [...prev, createEmptyPlanTax()]);
  const updatePlanTax = (i: number, f: Partial<PlanTax>) =>
    setPlanTaxes((prev) => prev.map((t, j) => (j === i ? { ...t, ...f } : t)));
  const removePlanTax = (i: number) => setPlanTaxes((prev) => prev.filter((_, j) => j !== i));

  const processImageFiles = async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;
    if (!name.trim()) {
      toast({ title: "Nombre requerido", description: "Ingresa el nombre del plan antes de subir imágenes.", variant: "destructive" });
      return;
    }
    setUploadingImage(true);
    try {
      const startIndex = images.length;
      for (let i = 0; i < imageFiles.length; i++) {
        const formData = new FormData();
        formData.append("file", imageFiles[i]);
        formData.append("planName", name.trim());
        formData.append("galleryIndex", String(startIndex + i + 1));
        const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
        if (!res.ok) throw new Error("Upload failed");
        const { url } = await res.json();
        setImages((prev) => [...prev, { imageUrl: url, displayOrder: prev.length }]);
      }
      toast({ title: "Imágenes subidas", description: `${imageFiles.length} imagen(es) agregada(s).` });
    } catch {
      toast({ title: "Error", description: "No se pudieron subir las imágenes.", variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processImageFiles(files);
    e.target.value = "";
  };

  const processMainImageFile = async (file: File) => {
    if (!file?.type.startsWith("image/")) {
      toast({ title: "Archivo no válido", description: "Solo se permiten imágenes (JPG, PNG, etc.).", variant: "destructive" });
      return;
    }
    const planName = name.trim() || "plan-temp";
    setUploadingMainImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("planName", planName);
      formData.append("galleryIndex", String(images.length + 1));
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setImageUrl(url);
      if (!images.some((img) => img.imageUrl === url)) {
        setImages((prev) => [...prev, { imageUrl: url, displayOrder: prev.length }]);
      }
      toast({ title: "Imagen principal actualizada", description: "La imagen se ha establecido correctamente." });
    } catch {
      toast({ title: "Error", description: "No se pudo subir la imagen.", variant: "destructive" });
    } finally {
      setUploadingMainImage(false);
    }
  };

  const handleMainImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processMainImageFile(file);
    e.target.value = "";
  };

  const processDescriptiveAudioFile = async (file: File) => {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".mp3")) {
      toast({ title: "Formato no válido", description: "Solo se permiten archivos MP3.", variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      toast({ title: "Nombre requerido", description: "Ingresa el nombre del plan antes de subir el audio.", variant: "destructive" });
      return;
    }
    setUploadingDescriptiveAudio(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("planName", name.trim());
      const res = await fetch("/api/admin/upload/plan-descriptive-audio", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body?.message === "string" ? body.message : "Error al subir el audio");
      }
      if (!body?.url) throw new Error("Respuesta sin URL");
      setDescriptiveAudioUrl(String(body.url));
      toast({ title: "Audio subido", description: "Guarda el plan para publicar el audio en la ficha." });
    } catch (e) {
      toast({
        title: "Error",
        description: (e as Error)?.message || "No se pudo subir el audio.",
        variant: "destructive",
      });
    } finally {
      setUploadingDescriptiveAudio(false);
    }
  };

  const handleDescriptiveAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processDescriptiveAudioFile(file);
    e.target.value = "";
  };

  const removeImage = async (i: number) => {
    const img = images[i];
    if (img?.imageUrl?.startsWith("https://")) {
      try {
        await apiRequest("DELETE", `/api/admin/plan-image?url=${encodeURIComponent(img.imageUrl)}`);
      } catch {
        toast({ title: "Error", description: "No se pudo eliminar la imagen del almacenamiento.", variant: "destructive" });
      }
    }
    setImages((prev) => prev.filter((_, j) => j !== i));
  };

  const applyPlanToForm = (plan: Record<string, unknown>) => {
    if (plan.name) setName(String(plan.name));
    if (plan.country) setCountry(String(plan.country));
    if (plan.duration) setDuration(Number(plan.duration));
    if (plan.nights !== undefined) setNights(Number(plan.nights));
    if (plan.description) setDescription(String(plan.description));
    if (plan.cardTooltip) setCardTooltip(String(plan.cardTooltip));
    if (plan.basePrice) setBasePrice(String(plan.basePrice));
    if (Array.isArray(plan.itinerary) && plan.itinerary.length) {
      setItinerary((plan.itinerary as ItineraryDay[]).map((d, i) => ({ ...d, dayNumber: d.dayNumber ?? i + 1 })));
      setOpenItineraryIndex(0);
    }
    if (Array.isArray(plan.hotels) && plan.hotels.length) {
      setHotels(plan.hotels as Hotel[]);
      setOpenHotelIndex(0);
    }
    if (Array.isArray(plan.inclusions) && plan.inclusions.length) setInclusions(plan.inclusions as Inclusion[]);
    if (Array.isArray(plan.exclusions) && plan.exclusions.length) setExclusions(plan.exclusions as Exclusion[]);
    if (Array.isArray(plan.priceTiers) && plan.priceTiers.length) setPriceTiers(plan.priceTiers as PriceTier[]);
    if (Array.isArray(plan.upgrades) && plan.upgrades.length) setUpgrades(plan.upgrades as Upgrade[]);
    if (typeof plan.descriptiveAudioUrl === "string") setDescriptiveAudioUrl(String(plan.descriptiveAudioUrl));
  };

  const processDocumentFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx") {
      toast({ title: "Archivo no válido", description: "Solo se permiten PDF o Word (.docx).", variant: "destructive" });
      return;
    }
    setExtractingPlan(true);
    setCosmoSuccess(false);
    setCosmoDialogOpen(true);
    setCosmoProgress(0);
    setCosmoStageLabel("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/extract-plan", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          "X-Stream-Progress": "true",
          "X-No-Compression": "1",
        },
      });

      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        const text = await res.text();
        let errMsg = "Error al procesar el documento";
        try {
          const err = JSON.parse(text);
          errMsg = (err as { message?: string }).message || errMsg;
        } catch {
          if (text) errMsg = text.slice(0, 200);
        }
        if (res.status === 401) errMsg = "Sesión expirada. Inicia sesión de nuevo.";
        throw new Error(errMsg);
      }

      if (contentType.includes("ndjson") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);
              if (data.progress !== undefined) setCosmoProgress(data.progress);
              if (data.label) setCosmoStageLabel(data.label);
              if (data.stage === "error") throw new Error(data.error || "Error al procesar");
              if (data.plan) {
                applyPlanToForm(data.plan);
                setActiveTab("basico");
                setCosmoSuccess(true);
              }
            } catch (parseErr) {
              if (parseErr instanceof SyntaxError) continue;
              throw parseErr;
            }
          }
        }
        if (buffer.trim()) {
          try {
            const data = JSON.parse(buffer);
            if (data.plan) {
              applyPlanToForm(data.plan);
              setActiveTab("basico");
              setCosmoSuccess(true);
            }
          } catch {
            // ignore parse errors on trailing buffer
          }
        }
        return;
      }

      const text = await res.text();
      if (!contentType.includes("application/json")) {
        const preview = text.slice(0, 150).replace(/\s+/g, " ");
        throw new Error(
          `El servidor devolvió una respuesta inesperada (${res.status}). ` +
            (preview ? `Inicio: "${preview}..."` : "Sin contenido.") +
            " Verifica que el servidor esté corriendo con npm run dev."
        );
      }
      const { plan } = JSON.parse(text);
      if (!plan) throw new Error("La respuesta no incluye el plan extraído.");
      applyPlanToForm(plan);
      setActiveTab("basico");
      setCosmoSuccess(true);
    } catch (err: unknown) {
      setCosmoDialogOpen(false);
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setExtractingPlan(false);
    }
  };

  const handleImportFromDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processDocumentFile(file);
    e.target.value = "";
  };

  const reorderMutation = useMutation({
    mutationFn: async (orderedUrls: string[]) => {
      const res = await apiRequest("POST", "/api/admin/reorder-plan-images", {
        planName: name.trim(),
        imageUrls: orderedUrls,
      });
      const data = await res.json();
      if (!data.urls) throw new Error("Respuesta inválida");
      return data.urls as string[];
    },
    onSuccess: (newUrls, orderedUrls) => {
      setImages(
        newUrls.map((url, i) => ({
          imageUrl: url,
          displayOrder: i,
        }))
      );
      // Si hay imagen principal elegida en Basic y coincide con alguna reordenada, actualizar su URL
      // (el archivo se renombró en Supabase) pero mantener la misma imagen como principal
      if (imageUrl && orderedUrls && Array.isArray(orderedUrls)) {
        const idx = orderedUrls.indexOf(imageUrl);
        if (idx >= 0) {
          setImageUrl(newUrls[idx]);
        }
      }
      toast({ title: "Orden actualizado", description: "Las imágenes se han reordenado. Los nombres (1, 2, 3...) se actualizaron en Supabase." });
    },
    onError: (e: Error) => {
      toast({ title: "Error al reordenar", description: e.message, variant: "destructive" });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleImageReorder = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = images.findIndex((img) => img.imageUrl === active.id);
      const newIndex = images.findIndex((img) => img.imageUrl === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(images, oldIndex, newIndex);
      reorderMutation.mutate(reordered.map((img) => img.imageUrl));
    },
    [images, reorderMutation]
  );

  const processHotelGalleryFiles = async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;
    if (!name.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Ingresa el nombre del plan antes de subir imágenes de hoteles.",
        variant: "destructive",
      });
      return;
    }
    setUploadingHotelGallery(true);
    try {
      const startIndex = hotelGalleryImages.length;
      for (let i = 0; i < imageFiles.length; i++) {
        const formData = new FormData();
        formData.append("file", imageFiles[i]);
        formData.append("planName", name.trim());
        formData.append("galleryIndex", `hotel-${startIndex + i + 1}`);
        const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
        if (!res.ok) throw new Error("Upload failed");
        const { url } = await res.json();
        setHotelGalleryImages((prev) => [...prev, { imageUrl: url, displayOrder: prev.length }]);
      }
      toast({ title: "Imágenes de hoteles subidas", description: `${imageFiles.length} imagen(es) en la galería del plan.` });
    } catch {
      toast({ title: "Error", description: "No se pudieron subir las imágenes de hoteles.", variant: "destructive" });
    } finally {
      setUploadingHotelGallery(false);
    }
  };

  const handleHotelGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processHotelGalleryFiles(files);
    e.target.value = "";
  };

  const removeHotelGalleryImage = async (i: number) => {
    const img = hotelGalleryImages[i];
    if (img?.imageUrl?.startsWith("https://")) {
      try {
        await apiRequest("DELETE", `/api/admin/plan-image?url=${encodeURIComponent(img.imageUrl)}`);
      } catch {
        toast({ title: "Error", description: "No se pudo eliminar la imagen del almacenamiento.", variant: "destructive" });
      }
    }
    setHotelGalleryImages((prev) => prev.filter((_, j) => j !== i));
  };

  const reorderHotelGalleryMutation = useMutation({
    mutationFn: async (orderedUrls: string[]) => {
      const res = await apiRequest("POST", "/api/admin/reorder-plan-hotel-images", {
        planName: name.trim(),
        imageUrls: orderedUrls,
      });
      const data = await res.json();
      if (!data.urls) throw new Error("Respuesta inválida");
      return data.urls as string[];
    },
    onSuccess: (newUrls) => {
      setHotelGalleryImages(newUrls.map((url, i) => ({ imageUrl: url, displayOrder: i })));
      toast({
        title: "Orden actualizado",
        description: "Las imágenes de hoteles se reordenaron en Supabase.",
      });
    },
    onError: (e: Error) => {
      toast({ title: "Error al reordenar", description: e.message, variant: "destructive" });
    },
  });

  const hotelGallerySensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleHotelGalleryReorder = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = hotelGalleryImages.findIndex((img) => img.imageUrl === active.id);
      const newIndex = hotelGalleryImages.findIndex((img) => img.imageUrl === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(hotelGalleryImages, oldIndex, newIndex);
      reorderHotelGalleryMutation.mutate(reordered.map((img) => img.imageUrl));
    },
    [hotelGalleryImages, reorderHotelGalleryMutation]
  );

  const processAdicionalesGalleryFiles = async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;
    if (!name.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Ingresa el nombre del plan antes de subir imágenes de Adicionales.",
        variant: "destructive",
      });
      return;
    }
    setUploadingAdicionalesGallery(true);
    try {
      const startIndex = adicionalesGalleryImages.length;
      for (let i = 0; i < imageFiles.length; i++) {
        const formData = new FormData();
        formData.append("file", imageFiles[i]);
        formData.append("planName", name.trim());
        formData.append("galleryIndex", `adicional-${startIndex + i + 1}`);
        const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
        if (!res.ok) throw new Error("Upload failed");
        const { url } = await res.json();
        setAdicionalesGalleryImages((prev) => [...prev, { imageUrl: url, displayOrder: prev.length }]);
      }
      toast({
        title: "Imágenes de Adicionales subidas",
        description: `${imageFiles.length} imagen(es) en el bucket del plan.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron subir las imágenes de Adicionales.",
        variant: "destructive",
      });
    } finally {
      setUploadingAdicionalesGallery(false);
    }
  };

  const handleAdicionalesGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processAdicionalesGalleryFiles(files);
    e.target.value = "";
  };

  const removeAdicionalesGalleryImage = async (i: number) => {
    const img = adicionalesGalleryImages[i];
    if (img?.imageUrl?.startsWith("https://")) {
      try {
        await apiRequest("DELETE", `/api/admin/plan-image?url=${encodeURIComponent(img.imageUrl)}`);
      } catch {
        toast({ title: "Error", description: "No se pudo eliminar la imagen del almacenamiento.", variant: "destructive" });
      }
    }
    setAdicionalesGalleryImages((prev) => prev.filter((_, j) => j !== i));
  };

  const reorderAdicionalesGalleryMutation = useMutation({
    mutationFn: async (orderedUrls: string[]) => {
      const res = await apiRequest("POST", "/api/admin/reorder-plan-adicionales-images", {
        planName: name.trim(),
        imageUrls: orderedUrls,
      });
      const data = await res.json();
      if (!data.urls) throw new Error("Respuesta inválida");
      return data.urls as string[];
    },
    onSuccess: (newUrls) => {
      setAdicionalesGalleryImages(newUrls.map((url, i) => ({ imageUrl: url, displayOrder: i })));
      toast({
        title: "Orden actualizado",
        description: "Las imágenes de Adicionales se reordenaron en Supabase.",
      });
    },
    onError: (e: Error) => {
      toast({ title: "Error al reordenar", description: e.message, variant: "destructive" });
    },
  });

  const adicionalesGallerySensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleAdicionalesGalleryReorder = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = adicionalesGalleryImages.findIndex((img) => img.imageUrl === active.id);
      const newIndex = adicionalesGalleryImages.findIndex((img) => img.imageUrl === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(adicionalesGalleryImages, oldIndex, newIndex);
      reorderAdicionalesGalleryMutation.mutate(reordered.map((img) => img.imageUrl));
    },
    [adicionalesGalleryImages, reorderAdicionalesGalleryMutation]
  );

  const goToSection = useCallback((id: string) => {
    setActiveTab(id);
    requestAnimationFrame(() => {
      document.querySelector("[data-plan-editor-top]")?.scrollIntoView({ block: "start" });
    });
  }, []);

  useEffect(() => {
    if (isBloqueo && (activeTab === "precios" || activeTab === "cupos")) {
      setActiveTab("basico");
    }
  }, [isBloqueo, activeTab]);

  const visibleSections = PLAN_EDITOR_SECTIONS.filter(
    (section) => !isBloqueo || (section.id !== "precios" && section.id !== "cupos"),
  );
  const publishGaps = [
    !name.trim() ? "el nombre" : null,
    !country.trim() ? "el país" : null,
    !String(basePrice).trim() ? "el precio" : null,
    !imageUrl ? "la portada" : null,
    itinerary.length === 0 ? "días de itinerario" : null,
  ].filter((item): item is string => Boolean(item));
  const readySectionIds = new Set<string>(
    [
      name.trim() && country.trim() && String(basePrice).trim() ? "basico" : null,
      itinerary.length > 0 ? "itinerario" : null,
      hotels.some((hotel) => hotel.name.trim()) ? "hoteles" : null,
      inclusions.some((item) => item.item.trim()) || exclusions.some((item) => item.item.trim()) ? "incl-excl" : null,
      priceTiers.length > 0 ? "precios" : null,
      availabilityDays.length > 0 ? "cupos" : null,
      images.length > 0 || Boolean(imageUrl) ? "imagenes" : null,
    ].filter((id): id is string => Boolean(id)),
  );

  if (isEditing && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Cargando plan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CosmoProcessingDialog
        open={cosmoDialogOpen}
        onOpenChange={setCosmoDialogOpen}
        isProcessing={extractingPlan}
        success={cosmoSuccess}
        userName={user?.name || user?.username}
        onSuccessComplete={() => setCosmoSuccess(false)}
        progress={cosmoProgress}
        stageLabel={cosmoStageLabel}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 shrink-0"
            onClick={() => setLocation("/admin/plans")}
            aria-label="Volver al listado"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {isEditing ? "Editar plan" : "Nuevo plan"}
            </p>
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {name.trim() || "Sin nombre todavía"}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {country.trim() ? (
                <span className="text-sm text-muted-foreground">{country.trim()}</span>
              ) : null}
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? "Visible en el catálogo" : "Oculto"}
              </Badge>
              {isBloqueo ? <Badge variant="outline">Bloqueo</Badge> : null}
              <span className={cn("text-xs", publishGaps.length ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400")}>
                {publishGaps.length ? `Falta ${publishGaps.join(", ")}` : "Listo para publicar"}
              </span>
            </div>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="shrink-0 sm:self-center">
          {saveMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saveMutation.isPending ? "Guardando..." : "Guardar plan"}
        </Button>
      </div>

      {!isEditing && canUsePlanAssistant && (
        <Card
          className={cn(
            "border-dashed border-2 transition-colors overflow-hidden",
            dragDocumentOver ? "border-primary bg-primary/15" : "border-primary/30 bg-primary/5"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!extractingPlan) setDragDocumentOver(true);
          }}
          onDragLeave={() => setDragDocumentOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragDocumentOver(false);
            if (extractingPlan) return;
            const file = e.dataTransfer.files?.[0];
            if (file) processDocumentFile(file);
          }}
        >
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg ring-4 ring-violet-500/20">
                  <Sparkles className="h-10 w-10" />
                </div>
                <p className="text-center text-xs font-semibold text-foreground mt-2">COSMO</p>
              </div>
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <p className="text-base font-medium text-foreground mb-1">
                  ¡Hola! Soy <strong>COSMO</strong>, tu asistente.
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Te puedo ayudar a importar tus archivos Word o PDF para crear un nuevo plan. Arrastra tu documento en este recuadro o haz clic en el botón — yo procesaré la información y te ayudo a organizarla.
                </p>
                <input
                  ref={documentInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleImportFromDocument}
                  disabled={extractingPlan}
                />
                <Button
                  variant="outline"
                  size="lg"
                  className="border-primary/50 hover:bg-primary/10 hover:border-primary"
                  disabled={extractingPlan}
                  onClick={() => documentInputRef.current?.click()}
                >
                  <FileText className="mr-2 h-5 w-5" />
                  {extractingPlan ? "Procesando..." : "Dame mi archivo (PDF o Word)"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={goToSection} className="w-full min-w-0">
      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
        <div className="min-h-full">
          <PlanSectionNav activeId={activeTab} onChange={goToSection} sections={visibleSections} readyIds={readySectionIds} />
        </div>
        <div data-plan-editor-top className="plan-editor min-w-0 space-y-5 scroll-mt-24">
        <TabsContent value="basico" className="mt-0">
          <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">1</span>
                Datos del plan
              </CardTitle>
              <CardDescription>Lo necesario para publicar: nombre, país, duración, precio y categoría.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="plan-group space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre del plan</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Turquía Esencial" />
                </div>
                <div>
                  <Label>País</Label>
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Ej: Turquía" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Duración (días)</Label>
                  <Input type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 1)} />
                </div>
                <div>
                  <Label>Noches</Label>
                  <Input type="number" min={0} value={nights} onChange={(e) => setNights(Number(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Precio del plan (USD)</Label>
                  <Input value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="1599" />
                </div>
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Descripción breve del plan..."
                  className={BASIC_TAB_TEXTAREA_CLASS}
                />
              </div>
              </div>
              {/* Fila: Bloque Imagen principal (50%) + Bloque Categoría (50%, más centrado) */}
              <div className="flex flex-col sm:flex-row gap-4 sm:items-stretch">
                {/* Bloque Imagen principal - ocupa la mitad del layout */}
                <div className="sm:w-1/2 sm:min-w-0 rounded-lg border border-border bg-card p-4">
                  <Label className="block mb-2">Imagen principal</Label>
                  <div className="flex flex-col sm:flex-row gap-3 items-start">
                    <div className="flex-shrink-0">
                      <div className="w-[180px] h-[100px] rounded-lg border bg-muted/50 overflow-hidden flex items-center justify-center">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt="Imagen principal"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-0.5 text-muted-foreground text-xs">
                            <ImageIcon className="h-6 w-6" />
                            <span>Sin imagen</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {images.length > 0 ? (
                      <Dialog open={galleryDialogOpen} onOpenChange={setGalleryDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="default"
                            className="h-10 px-4"
                          >
                            <ImageIcon className="h-4 w-4 mr-2" />
                            Elegir de galería
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                          <DialogHeader>
                            <DialogTitle>Seleccionar imagen principal</DialogTitle>
                          </DialogHeader>
                          <p className="text-sm text-muted-foreground -mt-2">
                            Haz clic en la imagen que deseas usar como portada del plan.
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 overflow-y-auto py-2 pr-1 min-h-0">
                            {images.map((img, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  setImageUrl(img.imageUrl);
                                  setGalleryDialogOpen(false);
                                }}
                                className={`relative rounded-lg border-2 overflow-hidden transition-all hover:scale-[1.02] ${
                                  imageUrl === img.imageUrl
                                    ? "border-primary ring-2 ring-primary/30 shadow-md"
                                    : "border-transparent hover:border-muted-foreground/40"
                                }`}
                              >
                                <img
                                  src={img.imageUrl}
                                  alt={`Imagen ${i + 1}`}
                                  className="h-28 w-full object-cover"
                                />
                                {imageUrl === img.imageUrl && (
                                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                    <div className="rounded-full bg-primary p-1.5">
                                      <Check className="h-5 w-5 text-primary-foreground" />
                                    </div>
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                      ) : null}
                      <input
                        ref={mainImageFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleMainImageUpload}
                        disabled={uploadingMainImage}
                      />
                      {/* Contenedor drag: más grande, con descripción */}
                      <div
                        className={cn(
                          "rounded-lg border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-2 min-h-[100px] min-w-[180px] w-full max-w-[220px] cursor-pointer px-4 py-3",
                          dragMainImageOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted/50"
                        )}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!uploadingMainImage) setDragMainImageOver(true);
                        }}
                        onDragLeave={() => setDragMainImageOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragMainImageOver(false);
                          if (uploadingMainImage) return;
                          const file = e.dataTransfer.files?.[0];
                          if (file) processMainImageFile(file);
                        }}
                        onClick={() => mainImageFileInputRef.current?.click()}
                      >
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {uploadingMainImage ? "Subiendo..." : "Subir nueva"}
                        </span>
                        <span className="text-xs text-muted-foreground text-center">
                          Arrastra y suelta la imagen aquí
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Sube la portada aquí. Si ya hay fotos en la galería, también puedes elegir una.
                  </p>
                </div>

                {/* Bloque Categoría - compacto, solo el ancho necesario */}
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 flex flex-col justify-center w-fit shrink-0">
                  <Label className="block mb-1.5 text-sm">Categoría</Label>
                  <div className="flex rounded-md border border-input p-0.5 bg-background">
                    {["internacional", "nacional", "colombia"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setCategory(opt)}
                        className={cn(
                          "px-2.5 py-1 text-sm font-medium rounded-md transition-colors capitalize",
                          category === opt
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Activo, Bloqueo y Día adicional transatlántico */}
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={isActive} onCheckedChange={(c) => setIsActive(!!c)} />
                  <span>Activo en catálogo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={isBloqueo}
                    onCheckedChange={(c) => {
                      const on = !!c;
                      setIsBloqueo(on);
                      if (!on) {
                        setBloqueoSalidaFecha("");
                        setBloqueoCuposDisponibles("");
                      }
                    }}
                  />
                  Plan bloqueo (salida fija, cupos, precio fijo, vuelos cargados)
                </label>
                <label className="flex items-center gap-2 cursor-pointer" title="Viajes transatlánticos (Turquía, Dubái, Europa) suman +1 día al total por vuelo desde Colombia. En LATAM no aplica.">
                  <Switch checked={requiresExtraDay} onCheckedChange={(c) => setRequiresExtraDay(!!c)} />
                  <span>Día adicional (transatlántico)</span>
                </label>
              </div>

              {isBloqueo && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">Configuración del bloqueo</p>
                  <p className="text-xs text-muted-foreground">
                    El precio del plan es la porción terrestre. Los vuelos se cargan con «Gestionar vuelos del bloqueo» (ida, regreso o conexión).
                    La fecha de salida no se puede cambiar después de guardarla. Puedes ajustar los cupos cuando vendas; en 0 el plan aparece como agotado.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Fecha de salida (fija)</Label>
                      <Input
                        type="date"
                        value={bloqueoSalidaFecha}
                        onChange={(e) => setBloqueoSalidaFecha(e.target.value)}
                        disabled={isEditing && !!existing?.bloqueoSalidaFecha}
                        className="max-w-xs"
                      />
                      {isEditing && existing?.bloqueoSalidaFecha ? (
                        <p className="text-xs text-muted-foreground">La fecha ya está definida y no es editable.</p>
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Cupos disponibles</Label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={bloqueoCuposDisponibles === "" ? "" : bloqueoCuposDisponibles}
                        onChange={(e) => {
                          const v = e.target.value;
                          setBloqueoCuposDisponibles(v === "" ? "" : Math.max(0, parseInt(v, 10) || 0));
                        }}
                        className="max-w-xs"
                      />
                      <p className="text-xs text-muted-foreground">Al guardar cotizaciones se descuenta por pasajeros; al borrar una cotización se liberan.</p>
                    </div>
                  </div>
                  <div className="space-y-2 pt-3 border-t border-amber-500/25">
                    <Label>Vuelos del bloqueo</Label>
                    <p className="text-xs text-muted-foreground">
                      Indica por cada imagen si es ida, regreso o conexión/vuelo interno. Esa información se usa al generar el PDF del bloqueo.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={() => setBloqueoFlightsModalOpen(true)}>
                        {internalFlights.some((f) => f.imageUrl) ? "Gestionar vuelos del bloqueo" : "Cargar vuelos del bloqueo"}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {internalFlights.filter((f) => f.imageUrl).length} imagen(es) con imagen cargada
                      </span>
                    </div>
                    {internalFlights.some((f) => f.imageUrl) && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {internalFlights
                          .map((f, i) => ({ f, i }))
                          .filter(({ f }) => f.imageUrl)
                          .map(({ f, i }) => (
                            <div
                              key={`${f.imageUrl}-${i}`}
                              className="relative h-14 w-20 rounded border overflow-hidden bg-muted"
                              title={f.label}
                            >
                              <img src={f.imageUrl} alt="" className="h-full w-full object-cover" />
                              <span className="absolute bottom-0 left-0 right-0 bg-background/90 text-[10px] text-center font-medium py-0.5 truncate px-0.5">
                                {f.flightRole === "return"
                                  ? "Regreso"
                                  : f.flightRole === "domestic"
                                    ? "Conexión"
                                    : "Ida"}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                    <InternalFlightsModal
                      open={bloqueoFlightsModalOpen}
                      onOpenChange={setBloqueoFlightsModalOpen}
                      internalFlights={internalFlights}
                      onSave={setInternalFlights}
                      planName={name}
                    />
                  </div>
                </div>
              )}

              {/* Días permitidos - debajo de Activo/Bloqueo */}
              <div>
                <Label>Días permitidos para salida</Label>
                <p className="text-sm text-muted-foreground mt-0.5 mb-3">
                  Marca los días de la semana en que este plan permite salidas. Por ejemplo: un plan &quot;Gran Tour&quot; puede salir solo los lunes. Si no marcas ninguno, el plan estará disponible todos los días de la semana para cualquier fecha.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {DAY_OPTIONS.map((d) => {
                    const isSelected = allowedDays.includes(d.value);
                    return (
                      <div
                        key={d.value}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleAllowedDay(d.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleAllowedDay(d.value);
                          }
                        }}
                        className={cn(
                          "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {isSelected ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <span className="h-4 w-4 shrink-0 rounded-sm border border-current opacity-50" />}
                        {d.label}
                      </div>
                    );
                  })}
                </div>
              </div>

              <Collapsible>
                <CollapsibleTrigger asChild>
                  <button type="button" className="group flex w-full items-center justify-between rounded-xl border bg-muted/30 px-4 py-3 text-left hover:bg-muted/50">
                    <span>
                      <span className="block text-sm font-semibold">Detalles</span>
                      <span className="block text-xs text-muted-foreground">Tooltip, notas de Cosmos, audio, términos, recomendaciones y asistencia médica. Opcional para publicar.</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-6 pt-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Tooltip de la tarjeta
                </Label>
                <Textarea
                  value={cardTooltip}
                  onChange={(e) => setCardTooltip(e.target.value)}
                  rows={3}
                  placeholder="Texto que aparece al pasar el cursor sobre la tarjeta del plan en la página principal. Ej: Salidas diarias desde 2 pax. Impuestos no incluidos..."
                  className={BASIC_TAB_TEXTAREA_CLASS}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Si no se completa, se usará un texto por defecto según el plan.
                </p>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" aria-hidden />
                  <div className="space-y-1 min-w-0">
                    <Label className="text-base">Contexto para Cosmos (notas internas)</Label>
                    <p className="text-xs text-muted-foreground">
                      Bloc de notas con texto enriquecido. Aquí puedes dejar ideas, aclaraciones o contexto exclusivo para el asistente Cosmos sobre este plan.
                      <strong className="font-medium text-foreground"> No se publica</strong> en el catálogo, la ficha del plan ni el PDF de cotización.
                    </p>
                  </div>
                </div>
                <RichTextEditor
                  value={cosmosAssistantNotes}
                  onChange={setCosmosAssistantNotes}
                  placeholder="Ej: Si preguntan por visa, aclarar que aplica eVisa para colombianos. No combinar con bloqueos de diciembre. Precio terrestre no incluye tasas aeroportuarias en Estambul..."
                  minHeight={240}
                />
              </div>

              <div className="rounded-lg border border-border bg-muted/15 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Headphones className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
                  <div className="space-y-1 min-w-0">
                    <Label className="text-base">Audio descriptivo del programa (MP3)</Label>
                    <p className="text-xs text-muted-foreground">
                      Opcional. Se escucha en la ficha del plan. Máximo 40 MB.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs text-muted-foreground">URL pública del MP3</Label>
                    <Input
                      value={descriptiveAudioUrl}
                      onChange={(e) => setDescriptiveAudioUrl(e.target.value)}
                      placeholder="https://…/programa-descriptivo.mp3"
                      className="mt-1 font-mono text-xs"
                    />
                  </div>
                  <input
                    ref={descriptiveAudioFileInputRef}
                    type="file"
                    accept=".mp3,audio/mpeg,audio/mp3"
                    className="hidden"
                    onChange={handleDescriptiveAudioUpload}
                    disabled={uploadingDescriptiveAudio}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={uploadingDescriptiveAudio || !name.trim()}
                    onClick={() => descriptiveAudioFileInputRef.current?.click()}
                    className="shrink-0"
                  >
                    {uploadingDescriptiveAudio ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Subiendo…
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Subir MP3
                      </>
                    )}
                  </Button>
                  {descriptiveAudioUrl ? (
                    <Button type="button" variant="ghost" size="sm" className="shrink-0 text-destructive" onClick={() => setDescriptiveAudioUrl("")}>
                      Quitar
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* Comentarios primera hoja del PDF */}
              <div className="border-t border-border pt-4 mt-4">
                <Label className="text-sm font-medium">Comentarios del PDF (después de Excluido)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Texto en recuadro después de la sección Excluido. Usa **texto** para resaltar en negrita.
                </p>
                <Textarea
                  value={firstPageComments}
                  onChange={(e) => setFirstPageComments(e.target.value)}
                  placeholder="Tarifa sujeta a cambios sin previo aviso y disponibilidad. Para el destino, cuenta con acompañamiento de guía de habla hispana..."
                  rows={4}
                  className={BASIC_TAB_TEXTAREA_CLASS}
                />
              </div>

              {/* Términos y condiciones */}
              <div className="border-t border-border pt-4 mt-4">
                <Label className="text-sm font-medium">Términos y condiciones</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Términos generales del plan y términos debajo de cada vuelo en el PDF.
                </p>
                <div className="space-y-3 mt-2">
                  <div>
                    <Label className="text-xs">Términos generales</Label>
                    <Textarea
                      value={termsConditions}
                      onChange={(e) => setTermsConditions(e.target.value)}
                      placeholder="Servicios: Cambios en el itinerario posibles según condiciones..."
                      rows={4}
                      className={BASIC_TAB_TEXTAREA_CLASS}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Términos debajo de cada vuelo</Label>
                    <Textarea
                      value={flightTerms}
                      onChange={(e) => setFlightTerms(e.target.value)}
                      placeholder="Los boletos de avión no son reembolsables..."
                      rows={5}
                      className={BASIC_TAB_TEXTAREA_CLASS}
                    />
                  </div>
                </div>
              </div>

              {/* Recomendaciones (última sección del PDF) */}
              <div className="border-t border-border pt-4 mt-4">
                <Label className="text-sm font-medium">Recomendaciones</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Texto adicional sobre recomendaciones o aspectos a tener en cuenta. Se imprime al final del PDF, en una o más hojas según la extensión del contenido.
                </p>
                <Textarea
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  placeholder="Ej: Llevar calzado cómodo para recorridos. Verificar requisitos de visa con anticipación. **Importante:** confirmar horarios de traslados 48 h antes de la salida."
                  rows={6}
                  className={BASIC_TAB_TEXTAREA_CLASS}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Usa saltos de línea para separar párrafos y **texto** para resaltar en negrita en el PDF.
                </p>
              </div>

              {/* Asistencia médica */}
              <div className="border-t border-border pt-4 mt-4">
                <Label className="text-sm font-medium">Asistencia médica</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Información e imagen que se exporta en el PDF.
                </p>
                <div className="space-y-3 mt-2">
                  <div>
                    <Label className="text-xs">Información</Label>
                    <Textarea
                      value={medicalAssistanceInfo}
                      onChange={(e) => setMedicalAssistanceInfo(e.target.value)}
                      placeholder="Seguro de viaje y asistencia 24 horas incluido..."
                      rows={3}
                      className={BASIC_TAB_TEXTAREA_CLASS}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Imagen de asistencia médica</Label>
                    <MedicalAssistanceGallery
                      selectedUrl={medicalAssistanceImageUrl}
                      onSelect={setMedicalAssistanceImageUrl}
                      allowUploadWithoutPlan
                      planName={name}
                    />
                  </div>
                </div>
              </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
          </>
        </TabsContent>

        <TabsContent value="itinerario" className="mt-0">
          <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">2</span>
                Itinerario
              </CardTitle>
              <CardDescription>
                Escribe el contenido de cada día. Usa viñetas (•) para actividades. Las comidas se usan para el conteo en cotizaciones.
              </CardDescription>
              <Button variant="outline" size="sm" onClick={addItineraryDay}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar día
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {itinerary.map((day, i) => {
                  const rowBg = i % 2 === 0 ? ROW_COLOR_A : ROW_COLOR_B;
                  return (
                    <Collapsible key={i} open={openItineraryIndex === i} onOpenChange={(open) => setOpenItineraryIndex(open ? i : null)}>
                      <div
                        className={cn(
                          "rounded-lg border border-border overflow-hidden",
                          "transition-shadow"
                        )}
                      >
                        <div className={cn("flex items-center gap-2 px-4 py-3", rowBg)}>
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="flex-1 min-w-0 flex items-center gap-2 text-left group hover:opacity-90 transition-opacity py-1"
                            >
                              <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                              <span className="rounded px-2 py-0.5 text-xs font-semibold shrink-0 bg-muted-foreground/15 text-foreground">
                                Día {day.dayNumber}
                              </span>
                              <span className="truncate text-sm font-medium">
                                {day.location || day.title || "Sin título"}
                              </span>
                            </button>
                          </CollapsibleTrigger>
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => removeItineraryDay(i)}
                            className="h-8 w-8 p-0 shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <CollapsibleContent>
                          <div className="p-4 pt-0 space-y-3 border-t border-border/50">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                              <div className="sm:col-span-2">
                                <Label className="text-xs">Título</Label>
                                <Input
                                  value={day.title}
                                  onChange={(e) => updateItineraryDay(i, { title: e.target.value })}
                                  placeholder="Ej: Llegada a Estambul"
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Ubicación</Label>
                                <Input
                                  value={day.location ?? ""}
                                  onChange={(e) => updateItineraryDay(i, { location: e.target.value || undefined })}
                                  placeholder="Ej: Estambul"
                                  className="h-9"
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Contenido del día</Label>
                              <Textarea
                                value={day.description}
                                onChange={(e) => updateItineraryDay(i, { description: e.target.value })}
                                rows={4}
                                placeholder={`Describe el día. Usa viñetas (•) para actividades:

• Visita a Santa Sofía
• Paseo por el Bazar

Puedes usar **texto** para resaltar.`}
                                className="resize-none font-sans"
                              />
                              <p className="text-[11px] text-muted-foreground mt-1">
                                Viñetas (•) y **negrita** aparecerán en el PDF.
                              </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Comidas</Label>
                                <Input
                                  value={
                                    day._mealsText !== undefined
                                      ? day._mealsText
                                      : (day.meals ?? []).join(", ")
                                  }
                                  onChange={(e) =>
                                    updateItineraryDay(i, { _mealsText: e.target.value })
                                  }
                                  onBlur={() => {
                                    const raw =
                                      day._mealsText !== undefined
                                        ? day._mealsText
                                        : (day.meals ?? []).join(", ");
                                    updateItineraryDay(i, {
                                      meals: parseMealsInput(raw),
                                      _mealsText: undefined,
                                    });
                                  }}
                                  placeholder="Desayuno, Almuerzo, Cena"
                                  className="h-9"
                                />
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  Separa con comas o punto y coma. El conteo en cotizaciones se actualiza al salir del campo o al guardar.
                                </p>
                              </div>
                              <div>
                                <Label className="text-xs">Alojamiento</Label>
                                <Input
                                  value={day.accommodation ?? ""}
                                  onChange={(e) => updateItineraryDay(i, { accommodation: e.target.value || undefined })}
                                  placeholder="Hotel en Estambul"
                                  className="h-9"
                                />
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
              {itinerary.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground text-sm mb-4">No hay días en el itinerario.</p>
                  <Button variant="outline" size="sm" onClick={addItineraryDay}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar primer día
                  </Button>
                </div>
              )}

              {/* Vuelo interno/conexión y mapa del itinerario */}
              <div className="border-t border-border pt-4 mt-4 space-y-4">
                {!isBloqueo && (
                <div className="rounded-xl border-2 border-primary/30 bg-primary/5 dark:bg-primary/10 px-4 py-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={hasInternalOrConnectionFlight}
                      onCheckedChange={setHasInternalOrConnectionFlight}
                    />
                    <span className="text-sm font-medium">Este plan tiene vuelo interno</span>
                  </label>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    Actívalo si hay un vuelo dentro del programa (p. ej. Estambul→Capadocia). Aquí solo eliges el día. Las fotos se suben al cotizar ese plan; el PDF las inserta después del día indicado.
                  </p>
                </div>
                )}

                {(hasInternalOrConnectionFlight ||
                  internalFlights.some((f) => f.flightRole === "domestic" && f.imageUrl)) && (
                  <div className="rounded-xl border border-border bg-background/60 px-4 py-3 space-y-2">
                    <Label className="text-sm font-medium">Mostrar el vuelo interno en el PDF después del día</Label>
                    {itinerary.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Primero agrega los días del itinerario para elegir el punto de inserción.
                      </p>
                    ) : (
                      <select
                        className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={internalFlightAfterDay === "" ? "" : String(internalFlightAfterDay)}
                        onChange={(e) =>
                          setInternalFlightAfterDay(e.target.value ? Number(e.target.value) : "")
                        }
                      >
                        <option value="">Selecciona un día</option>
                        {itinerary.map((day) => (
                          <option key={day.dayNumber} value={day.dayNumber}>
                            Día {day.dayNumber}
                            {day.title?.trim() ? ` — ${day.title.trim()}` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                    <p className="text-xs text-muted-foreground">
                      En cotización aparecerá el paso «Vuelo interno de este plan». El PDF lo coloca justo después de este día.
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">Mapa del itinerario</Label>
                  <ItineraryMapGallery
                    selectedUrl={itineraryMapImageUrl}
                    onSelect={setItineraryMapImageUrl}
                    planName={name}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          </>
        </TabsContent>

        <TabsContent value="hoteles" className="mt-0">
          <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">3</span>
                <Building2 className="h-5 w-5" />
                Hoteles
              </CardTitle>
              <CardDescription>
                Hoteles del plan. Se agrupan por ubicación en el PDF (ej: Estambul, Capadocia, Dubai).
              </CardDescription>
              <Button variant="outline" size="sm" onClick={addHotel}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar hotel
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {hotels.map((h, i) => {
                  const rowBg = i % 2 === 0 ? ROW_COLOR_A : ROW_COLOR_B;
                  return (
                    <Collapsible key={i} open={openHotelIndex === i} onOpenChange={(open) => setOpenHotelIndex(open ? i : null)}>
                      <div
                        className={cn(
                          "rounded-lg border border-border overflow-hidden",
                          "transition-shadow"
                        )}
                      >
                        <div className={cn("flex items-center gap-2 px-4 py-3", rowBg)}>
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="flex-1 min-w-0 flex items-center gap-2 text-left group hover:opacity-90 transition-opacity py-1"
                            >
                              <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                              <span className="rounded px-2 py-0.5 text-xs font-semibold shrink-0 bg-muted-foreground/15 text-foreground">
                                {i + 1}
                              </span>
                              <span className="truncate text-sm font-medium">
                                {h.name || "Hotel sin nombre"}
                              </span>
                              {h.location && (
                                <span className="text-muted-foreground text-xs shrink-0">— {h.location}</span>
                              )}
                              {h.category && (
                                <span className="text-muted-foreground text-xs shrink-0">• {h.category}</span>
                              )}
                            </button>
                          </CollapsibleTrigger>
                          <Button variant="ghost" size="sm" type="button" onClick={() => removeHotel(i)} className="h-8 w-8 p-0 shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <CollapsibleContent>
                          <div className="p-4 pt-0 space-y-3 border-t border-border/50">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
                              <div className="sm:col-span-2">
                                <Label className="text-xs">Nombre del hotel</Label>
                                <Input
                                  value={h.name}
                                  onChange={(e) => updateHotel(i, { name: e.target.value })}
                                  placeholder="Ej: Hotel Estambul Center"
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Ubicación / Ciudad</Label>
                                <Input
                                  value={h.location ?? ""}
                                  onChange={(e) => updateHotel(i, { location: e.target.value || undefined })}
                                  placeholder="Estambul, Capadocia..."
                                  className="h-9"
                                />
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  Agrupa hoteles en el PDF
                                </p>
                              </div>
                              <div>
                                <Label className="text-xs">Categoría</Label>
                                <Input
                                  value={h.category ?? ""}
                                  onChange={(e) => updateHotel(i, { category: e.target.value || undefined })}
                                  placeholder="5*, 4*, 3*"
                                  className="h-9"
                                />
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <div className="w-24">
                                <Label className="text-xs">Noches</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={h.nights ?? ""}
                                  onChange={(e) => updateHotel(i, { nights: e.target.value ? Number(e.target.value) : undefined })}
                                  placeholder="2"
                                  className="h-9"
                                />
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
              {hotels.length === 0 && (
                <div className="py-12 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-sm mb-4">No hay hoteles agregados.</p>
                  <Button variant="outline" size="sm" onClick={addHotel}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar primer hotel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Galería de imágenes de hoteles</CardTitle>
              <CardDescription>
                Fotos extra solo de este plan: bucket propio en Supabase y PDF «Adicionales». Arrastra archivos al área de
                abajo o haz clic; en la rejilla, arrastra las miniaturas para ordenar. Eliminar quita el archivo del bucket
                al instante o al guardar si quedó huérfana.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label
                htmlFor="hotel-gallery-upload"
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!uploadingHotelGallery && name.trim()) setDragHotelGallery(true);
                }}
                onDragLeave={() => setDragHotelGallery(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragHotelGallery(false);
                  if (!name.trim() || uploadingHotelGallery) return;
                  const files = Array.from(e.dataTransfer.files || []);
                  processHotelGalleryFiles(files);
                }}
                className={cn(
                  "block w-full rounded-xl border-2 border-dashed transition-all",
                  name.trim()
                    ? "cursor-pointer border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
                    : "cursor-not-allowed opacity-60 border-muted-foreground/20",
                  dragHotelGallery && name.trim() && "border-primary bg-primary/10"
                )}
              >
                <input
                  id="hotel-gallery-upload"
                  ref={hotelGalleryFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={handleHotelGalleryUpload}
                  disabled={uploadingHotelGallery || !name.trim()}
                />
                <div className="flex flex-col items-center justify-center py-10 px-6">
                  {uploadingHotelGallery ? (
                    <>
                      <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
                      <span className="text-sm font-medium text-foreground">Subiendo imágenes...</span>
                    </>
                  ) : (
                    <>
                      <ImagePlus className="w-12 h-12 text-muted-foreground mb-3" />
                      <span className="text-sm font-medium text-foreground">
                        Arrastra imágenes de hoteles o haz clic para subir
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">PNG, JPG o WebP · Múltiples archivos</span>
                    </>
                  )}
                </div>
              </label>
              {!name.trim() && (
                <p className="text-xs text-muted-foreground">Define primero el nombre del plan en la pestaña Básico.</p>
              )}

              {hotelGalleryImages.length > 0 && (
                <div className="space-y-3">
                  <DndContext
                    sensors={hotelGallerySensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleHotelGalleryReorder}
                  >
                    <SortableContext
                      items={hotelGalleryImages.map((img) => img.imageUrl)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {hotelGalleryImages.map((img, i) => (
                          <SortableImageCard
                            key={img.imageUrl}
                            img={img}
                            index={i}
                            onRemove={() => removeHotelGalleryImage(i)}
                            isReordering={reorderHotelGalleryMutation.isPending}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  <p className="text-xs text-muted-foreground">
                    Arrastra las miniaturas para cambiar el orden; los nombres en Supabase se actualizan al soltar.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          </>
        </TabsContent>

        <TabsContent value="incl-excl" className="mt-0">
          <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">4</span>
                Inclusiones
              </CardTitle>
              <Button variant="outline" size="sm" onClick={addInclusion}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </CardHeader>
            <CardContent>
              {inclusions.map((x, i) => (
                <div key={i} className="plan-list-row">
                  <Input value={x.item} onChange={(e) => updateInclusion(i, e.target.value)} placeholder="Inclusión" />
                  <Button variant="ghost" size="icon" onClick={() => removeInclusion(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Exclusiones</CardTitle>
              <Button variant="outline" size="sm" onClick={addExclusion}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </CardHeader>
            <CardContent>
              {exclusions.map((x, i) => (
                <div key={i} className="plan-list-row">
                  <Input value={x.item} onChange={(e) => updateExclusion(i, e.target.value)} placeholder="Exclusión" />
                  <Button variant="ghost" size="icon" onClick={() => removeExclusion(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
          </>
        </TabsContent>

        <TabsContent value="precios" className="mt-0 space-y-4">
          <Card>
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Precios por fechas</CardTitle>
                  <CardDescription>
                    {priceTiers.length === 0
                      ? "Agrega una salida con su precio."
                      : `${priceTiers.length} salida${priceTiers.length === 1 ? "" : "s"}`}
                  </CardDescription>
                </div>
                <Button type="button" size="sm" onClick={addPriceTier}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar salida
                </Button>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  value={priceQuery}
                  onChange={(e) => setPriceQuery(e.target.value)}
                  placeholder="Buscar por fecha o precio"
                  className="sm:max-w-xs"
                />
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={bulkPriceInput}
                    onChange={(e) => setBulkPriceInput(e.target.value)}
                    placeholder="Precio USD para todas"
                    className="w-40"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyBulkPriceToAllTiers();
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={applyBulkPriceToAllTiers} disabled={!priceTiers.length}>
                    Aplicar
                  </Button>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox
                      checked={bulkExcludeFlightDays}
                      onCheckedChange={(c) => setBulkExcludeFlightDays(!!c)}
                    />
                    Sin días de vuelo
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {priceTiers.length === 0 ? (
                <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  Todavía no hay salidas. Agrega la primera con su fecha y precio.
                </p>
              ) : (
                <div className="max-h-[min(28rem,58vh)] overflow-auto rounded-xl border">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Desde</th>
                        <th className="px-3 py-2 font-medium">Hasta</th>
                        <th className="px-3 py-2 font-medium">Precio USD</th>
                        <th className="px-3 py-2 font-medium">Día de vuelo</th>
                        <th className="w-10 px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {priceTiers.map((tier, index) => {
                        const query = priceQuery.trim().toLowerCase();
                        const haystack = `${tier.startDate ?? ""} ${tier.endDate} ${tier.price} ${tier.flightLabel ?? ""}`.toLowerCase();
                        if (query && !haystack.includes(query)) return null;
                        return (
                          <tr key={index} className="border-b last:border-0 align-middle">
                            <td className="px-2 py-1.5">
                              <Input
                                type="date"
                                value={tier.startDate ?? ""}
                                onChange={(e) => updatePriceTier(index, { startDate: e.target.value || undefined })}
                                aria-label="Fecha desde"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input
                                type="date"
                                value={tier.endDate}
                                onChange={(e) => updatePriceTier(index, { endDate: e.target.value })}
                                aria-label="Fecha hasta"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input
                                value={tier.price}
                                onChange={(e) => updatePriceTier(index, { price: e.target.value })}
                                onBlur={() => commitPriceTierPrice(index)}
                                placeholder="0"
                                aria-label="Precio en dólares"
                                className="w-28"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={tier.isFlightDay ?? false}
                                  onCheckedChange={(checked) => updatePriceTier(index, { isFlightDay: !!checked })}
                                  aria-label="Marcar como día de vuelo"
                                />
                                {tier.isFlightDay ? (
                                  <Input
                                    value={tier.flightLabel ?? ""}
                                    onChange={(e) => updatePriceTier(index, { flightLabel: e.target.value || undefined })}
                                    placeholder="Etiqueta"
                                    className="h-8 w-28"
                                  />
                                ) : (
                                  <span className="text-xs text-muted-foreground">Salida</span>
                                )}
                              </div>
                            </td>
                            <td className="px-1 py-1.5">
                              <Button variant="ghost" size="icon" onClick={() => removePriceTier(index)} aria-label="Quitar salida">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Mejoras
                </CardTitle>
                <CardDescription>
                  Extras opcionales que el asesor elige al cotizar. El cliente ve el nombre, qué incluye y el precio adicional en dólares.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addUpgrade} className="shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                Agregar mejora
              </Button>
            </CardHeader>
            <CardContent>
              {upgrades.length === 0 ? (
                <div className="rounded-xl border border-dashed px-4 py-10 text-center">
                  <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm font-medium">Este plan todavía no tiene mejoras</p>
                  <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                    Úsalas para hoteles superiores, tours extra o comidas. Si no aplica, puedes dejar esta sección vacía.
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={addUpgrade} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar la primera mejora
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upgrades.map((upgrade, index) => {
                    const title = upgrade.name.trim() || "Mejora sin nombre";
                    const priceLabel = `+ US$ ${Number(upgrade.price || 0).toLocaleString("en-US")}`;
                    return (
                      <Collapsible
                        key={index}
                        open={openUpgradeIndex === index}
                        onOpenChange={(open) => setOpenUpgradeIndex(open ? index : null)}
                      >
                        <div className="overflow-hidden rounded-xl border bg-card">
                          <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
                            <CollapsibleTrigger asChild>
                              <button type="button" className="group flex min-w-0 flex-1 items-center gap-3 text-left">
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                                  {index + 1}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold">{title}</span>
                                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                    {upgrade.description?.trim() || "Sin detalle de lo que incluye"}
                                    {upgrade.code.trim() ? ` · código ${upgrade.code.trim()}` : ""}
                                  </span>
                                </span>
                              </button>
                            </CollapsibleTrigger>
                            <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                              {priceLabel}
                            </span>
                            <Button variant="ghost" size="icon" onClick={() => removeUpgrade(index)} aria-label={`Quitar ${title}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <CollapsibleContent>
                            <div className="grid gap-4 border-t bg-muted/20 p-4 sm:grid-cols-2">
                              <div className="sm:col-span-2">
                                <Label htmlFor={`upgrade-name-${index}`}>Nombre</Label>
                                <p className="mb-1.5 text-xs text-muted-foreground">Lo que lee el asesor al elegir la mejora.</p>
                                <Input
                                  id={`upgrade-name-${index}`}
                                  value={upgrade.name}
                                  onChange={(e) => updateUpgrade(index, { name: e.target.value })}
                                  placeholder="Hotel céntrico + tour por el Bósforo"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`upgrade-price-${index}`}>Precio adicional (USD)</Label>
                                <p className="mb-1.5 text-xs text-muted-foreground">Se suma al plan por persona.</p>
                                <div className="relative">
                                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">US$</span>
                                  <Input
                                    id={`upgrade-price-${index}`}
                                    type="number"
                                    min={0}
                                    value={upgrade.price}
                                    onChange={(e) => updateUpgrade(index, { price: Number(e.target.value) || 0 })}
                                    className="pl-12"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label htmlFor={`upgrade-code-${index}`}>Código interno</Label>
                                <p className="mb-1.5 text-xs text-muted-foreground">Identificador corto. No se muestra al cliente.</p>
                                <Input
                                  id={`upgrade-code-${index}`}
                                  value={upgrade.code}
                                  onChange={(e) => updateUpgrade(index, { code: e.target.value })}
                                  placeholder="opcion-1"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <Label htmlFor={`upgrade-description-${index}`}>Qué incluye</Label>
                                <p className="mb-1.5 text-xs text-muted-foreground">Detalle visible junto al nombre en la cotización.</p>
                                <Textarea
                                  id={`upgrade-description-${index}`}
                                  value={upgrade.description ?? ""}
                                  onChange={(e) => updateUpgrade(index, { description: e.target.value || undefined })}
                                  placeholder="8 almuerzos, hotel céntrico en Estambul y tour clásico"
                                  rows={3}
                                  className="resize-y"
                                />
                              </div>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Collapsible>
            <CollapsibleTrigger asChild>
              <button type="button" className="group flex w-full items-center justify-between rounded-xl border bg-card px-4 py-3 text-left">
                <span>
                  <span className="block text-sm font-semibold">Impuestos</span>
                  <span className="block text-xs text-muted-foreground">
                    {planTaxes.length === 0 ? "Opcional. Se suman al cotizar." : `${planTaxes.length} impuesto${planTaxes.length === 1 ? "" : "s"}`}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={addPlanTax}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar impuesto
                </Button>
              </div>
              {planTaxes.map((tax, index) => (
                <div key={tax.id} className="flex flex-wrap items-center gap-2 rounded-xl border p-3">
                  <Input
                    value={tax.label}
                    onChange={(e) => updatePlanTax(index, { label: e.target.value })}
                    placeholder="Nombre, por ejemplo tasa aeroportuaria"
                    className="min-w-[180px] flex-1"
                  />
                  <div className="flex rounded-md border border-input bg-background p-0.5">
                    {(["USD", "COP"] as const).map((currency) => (
                      <button
                        key={currency}
                        type="button"
                        onClick={() => updatePlanTax(index, { currency })}
                        className={cn(
                          "rounded-md px-2 py-1 text-xs font-medium",
                          tax.currency === currency ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                        )}
                      >
                        {currency === "USD" ? "US$" : "COP$"}
                      </button>
                    ))}
                  </div>
                  <Input
                    value={tax.amount}
                    onChange={(e) => updatePlanTax(index, { amount: e.target.value.replace(/,/g, "") })}
                    placeholder="Monto"
                    className="w-28"
                  />
                  <label className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={tax.perPassenger !== false}
                      onCheckedChange={(checked) => updatePlanTax(index, { perPassenger: !!checked })}
                    />
                    Por pasajero
                  </label>
                  <Button variant="ghost" size="icon" onClick={() => removePlanTax(index)} aria-label="Quitar impuesto">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </TabsContent>
        <TabsContent value="cupos" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Disponibilidad por fecha</CardTitle>
              <CardDescription>
                Cupos de cada salida. El color del calendario sigue la cantidad: verde, amarillo, naranja, rojo y gris si ya no hay cupos.
                {isEditing
                  ? " Al actualizar, las fechas se publican en la ficha y en el cotizador."
                  : " En un plan nuevo, pulsa Guardar para publicarlas."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isBloqueo ? (
                <p className="text-sm text-muted-foreground">
                  Este plan es un bloqueo. La salida y los cupos se cargan en la pestaña Básico.
                </p>
              ) : (
                <AvailabilityEditor days={availabilityDays} onChange={handleAvailabilityChange} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="imagenes" className="mt-0">
          <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">7</span>
                Galería de imágenes
              </CardTitle>
              <CardDescription>Imágenes del destino para el catálogo y PDF. La primera puede usarse como imagen principal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <label
                htmlFor="gallery-upload"
                onDragOver={(e) => { e.preventDefault(); setDragGallery(true); }}
                onDragLeave={() => setDragGallery(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragGallery(false);
                  const files = Array.from(e.dataTransfer.files || []);
                  processImageFiles(files);
                }}
                className={cn(
                  "block w-full cursor-pointer rounded-xl border-2 border-dashed transition-all",
                  "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30",
                  dragGallery && "border-primary bg-primary/10"
                )}
              >
                <input
                  id="gallery-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  {uploadingImage ? (
                    <>
                      <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
                      <span className="text-sm font-medium text-foreground">Subiendo imágenes...</span>
                    </>
                  ) : (
                    <>
                      <ImagePlus className="w-12 h-12 text-muted-foreground mb-3" />
                      <span className="text-sm font-medium text-foreground">Arrastra imágenes o haz clic para subir</span>
                      <span className="text-xs text-muted-foreground mt-1">PNG, JPG o WebP · Múltiples archivos</span>
                    </>
                  )}
                </div>
              </label>

              {images.length > 0 && (
                <div className="space-y-3">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleImageReorder}
                  >
                    <SortableContext
                      items={images.map((img) => img.imageUrl)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {images.map((img, i) => (
                          <SortableImageCard
                            key={img.imageUrl}
                            img={img}
                            index={i}
                            onRemove={() => removeImage(i)}
                            isReordering={reorderMutation.isPending}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  <p className="text-xs text-muted-foreground">
                    Arrastra las imágenes para cambiar el orden. Las 6 primeras se usan en el PDF. Los nombres (1.jpg, 2.jpg...) se actualizan en Supabase automáticamente.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="rounded-xl border border-primary/20 bg-muted/30 p-4 sm:p-5 space-y-4">
            <div>
              <h3 className="text-base font-semibold tracking-tight">Adicionales</h3>
              <p className="text-sm text-muted-foreground mt-1.5">
                Galería aparte del catálogo del plan: estas imágenes se imprimen en la última hoja del PDF, bloque ADICIONALES, después de las fotos de la galería de hoteles. Almacenamiento en Supabase: bucket <code className="text-xs rounded bg-background/80 px-1 py-0.5">plan-…-adicionales</code>.
              </p>
            </div>
            <div className="space-y-4">
              <label
                htmlFor="adicionales-gallery-upload"
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!uploadingAdicionalesGallery && name.trim()) setDragAdicionalesGallery(true);
                }}
                onDragLeave={() => setDragAdicionalesGallery(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragAdicionalesGallery(false);
                  if (!name.trim() || uploadingAdicionalesGallery) return;
                  const files = Array.from(e.dataTransfer.files || []);
                  processAdicionalesGalleryFiles(files);
                }}
                className={cn(
                  "block w-full rounded-xl border-2 border-dashed transition-all",
                  name.trim()
                    ? "cursor-pointer border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
                    : "cursor-not-allowed opacity-60 border-muted-foreground/20",
                  dragAdicionalesGallery && name.trim() && "border-primary bg-primary/10"
                )}
              >
                <input
                  id="adicionales-gallery-upload"
                  ref={adicionalesGalleryFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={handleAdicionalesGalleryUpload}
                  disabled={uploadingAdicionalesGallery || !name.trim()}
                />
                <div className="flex flex-col items-center justify-center py-10 px-6">
                  {uploadingAdicionalesGallery ? (
                    <>
                      <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
                      <span className="text-sm font-medium text-foreground">Subiendo imágenes...</span>
                    </>
                  ) : (
                    <>
                      <ImagePlus className="w-12 h-12 text-muted-foreground mb-3" />
                      <span className="text-sm font-medium text-foreground">
                        Arrastra imágenes o haz clic para subir (Adicionales)
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">PNG, JPG o WebP · Múltiples archivos</span>
                    </>
                  )}
                </div>
              </label>
              {!name.trim() && (
                <p className="text-xs text-muted-foreground">Define primero el nombre del plan en la pestaña Básico.</p>
              )}

              {adicionalesGalleryImages.length > 0 && (
                <div className="space-y-3">
                  <DndContext
                    sensors={adicionalesGallerySensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleAdicionalesGalleryReorder}
                  >
                    <SortableContext
                      items={adicionalesGalleryImages.map((img) => img.imageUrl)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {adicionalesGalleryImages.map((img, i) => (
                          <SortableImageCard
                            key={img.imageUrl}
                            img={img}
                            index={i}
                            onRemove={() => removeAdicionalesGalleryImage(i)}
                            isReordering={reorderAdicionalesGalleryMutation.isPending}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  <p className="text-xs text-muted-foreground">
                    Arrastra las miniaturas para cambiar el orden; los nombres en Supabase se actualizan al soltar.
                  </p>
                </div>
              )}
            </div>
          </div>

          </>
        </TabsContent>

        {(() => {
          const { prev, next, index } = planSectionNeighbors(activeTab, visibleSections);
          return (
            <div className="sticky bottom-3 z-20 flex items-center justify-between gap-2 rounded-2xl border bg-background/95 px-2 py-2 shadow-lg backdrop-blur">
              {prev ? (
                <Button type="button" variant="ghost" onClick={() => goToSection(prev.id)}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  {prev.label}
                </Button>
              ) : (
                <span />
              )}
              <p className="hidden text-xs tabular-nums text-muted-foreground sm:block">
                {index + 1} / {visibleSections.length}
              </p>
              {next ? (
                <Button type="button" variant="outline" onClick={() => goToSection(next.id)}>
                  {next.label}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSave} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar plan
                </Button>
              )}
            </div>
          );
        })()}
      </div>
      </div>
      </Tabs>
    </div>
  );
}

export default AdminPlanForm;
