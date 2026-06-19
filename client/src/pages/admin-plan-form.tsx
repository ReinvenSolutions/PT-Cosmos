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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { FlightImageGallery } from "@/components/flight-image-gallery";
import { ImageUploadZone } from "@/components/image-upload-zone";
import { MedicalAssistanceGallery } from "@/components/medical-assistance-gallery";
import { ItineraryMapGallery } from "@/components/itinerary-map-gallery";
import { InternalFlightsModal, type InternalFlightItem } from "@/components/plan-modals";
import { createEmptyPlanTax, type PlanTax } from "@shared/planTaxes";

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
const ROW_COLOR_A = "bg-slate-200/70 dark:bg-slate-600/40";
const ROW_COLOR_B = "bg-white dark:bg-slate-800/50";

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
  const [bulkPriceInput, setBulkPriceInput] = useState("");
  const [bulkExcludeFlightDays, setBulkExcludeFlightDays] = useState(false);
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
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
  const [requiresExtraDay, setRequiresExtraDay] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingHotelGallery, setUploadingHotelGallery] = useState(false);
  const [uploadingAdicionalesGallery, setUploadingAdicionalesGallery] = useState(false);
  const [uploadingInternalFlight, setUploadingInternalFlight] = useState(false);
  const [uploadingMainImage, setUploadingMainImage] = useState(false);
  const [galleryDialogOpen, setGalleryDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("basico");
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
  const isSuperAdmin = user?.role === "super_admin";
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
      setUpgrades((existing.upgrades as Upgrade[]) ?? []);
      setPlanTaxes((existing.planTaxes as PlanTax[]) ?? []);
      setItinerary((existing.itinerary as ItineraryDay[]) ?? []);
      setHotels((existing.hotels as Hotel[]) ?? []);
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
      upgrades: upgrades.length ? upgrades : null,
      itinerary: itinerary.map(itineraryDayToPayload),
      hotels,
      inclusions,
      exclusions,
      images,
      hasInternalOrConnectionFlight: isBloqueo
        ? internalFlights.length > 0
        : hasInternalOrConnectionFlight,
      internalFlights: internalFlights.length ? internalFlights : null,
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

  const toggleAllowedDay = (day: string) => {
    setAllowedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addItineraryDay = () => {
    setItinerary((prev) => [...prev, { dayNumber: prev.length + 1, title: "", description: "", activities: [], meals: [], accommodation: "" }]);
  };
  const updateItineraryDay = (i: number, f: Partial<ItineraryDay>) => {
    setItinerary((prev) => prev.map((d, j) => (j === i ? { ...d, ...f } : d)));
  };
  const removeItineraryDay = (i: number) => {
    setItinerary((prev) => prev.filter((_, j) => j !== i).map((d, j) => ({ ...d, dayNumber: j + 1 })));
  };

  const addHotel = () => setHotels((prev) => [...prev, { name: "", category: "", location: "", nights: undefined }]);
  const updateHotel = (i: number, f: Partial<Hotel>) => setHotels((prev) => prev.map((h, j) => (j === i ? { ...h, ...f } : h)));
  const removeHotel = (i: number) => setHotels((prev) => prev.filter((_, j) => j !== i));

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

  const addUpgrade = () => setUpgrades((prev) => [...prev, { code: "", name: "", price: 0 }]);
  const updateUpgrade = (i: number, f: Partial<Upgrade>) => setUpgrades((prev) => prev.map((u, j) => (j === i ? { ...u, ...f } : u)));
  const removeUpgrade = (i: number) => setUpgrades((prev) => prev.filter((_, j) => j !== i));

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
    }
    if (Array.isArray(plan.hotels) && plan.hotels.length) setHotels(plan.hotels as Hotel[]);
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
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setLocation("/admin/plans")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saveMutation.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>

      {!isEditing && isSuperAdmin && (
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

      {/* Tabs al estilo categoría: inactivos=solo título, activo=color+relleno dentro del contenedor */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0 tabs-plan-form">
        <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6 rounded-lg">
          <TabsTrigger value="basico">Básico</TabsTrigger>
          <TabsTrigger value="itinerario">Itinerario</TabsTrigger>
          <TabsTrigger value="hoteles">Hoteles</TabsTrigger>
          <TabsTrigger value="incl-excl">Incl./Excl.</TabsTrigger>
          <TabsTrigger value="precios">Precios</TabsTrigger>
          <TabsTrigger value="imagenes">Imágenes</TabsTrigger>
        </TabsList>

      <div className="space-y-4 mt-4">
        <TabsContent value="basico" className="mt-0">
          <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">1</span>
                Información básica
              </CardTitle>
              <CardDescription>Nombre, país, duración, descripción y configuración del plan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  <Label>Precio base (USD)</Label>
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

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
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
                      Opcional. Se muestra en la ficha del plan con reproductor y descarga. Máx. 40 MB. Se guarda en el bucket del plan como{" "}
                      <code className="text-[11px] bg-muted px-1 rounded">audio/programa-descriptivo.mp3</code>.
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
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Dialog open={galleryDialogOpen} onOpenChange={setGalleryDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="default"
                            className="h-10 px-4"
                            disabled={images.length === 0}
                            title={images.length === 0 ? "Sube imágenes en la pestaña Imágenes primero" : undefined}
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
                    Haz clic en el recuadro para seleccionar un archivo
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
                    El precio visible es <strong>basePrice</strong> (porción terrestre). Los vuelos se cargan con «Gestionar vuelos del bloqueo» (ida, regreso y/o
                    conexión interna).
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
            </CardContent>
          </Card>
          <div className="flex justify-between pt-2">
            <div />
            <Button type="button" variant="outline" onClick={() => setActiveTab("itinerario")}>
              Siguiente: Itinerario
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
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
                    <Collapsible key={i} defaultOpen={i === 0}>
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
                                {day.title || "Sin título"}
                              </span>
                              {day.location && (
                                <span className="text-muted-foreground text-xs shrink-0">— {day.location}</span>
                              )}
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
                <div className="rounded-xl border-2 border-primary/30 bg-primary/5 dark:bg-primary/10 px-4 py-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={hasInternalOrConnectionFlight}
                      onCheckedChange={setHasInternalOrConnectionFlight}
                    />
                    <span className="text-sm font-medium">Este plan tiene vuelo interno o de conexión</span>
                  </label>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    Cuando se active, en la cotización aparecerá la opción para subir imágenes del vuelo (interno dentro del país o de conexión entre destinos).
                  </p>
                </div>

                {hasInternalOrConnectionFlight && !isBloqueo && (
                  <div>
                    <Label className="text-sm font-medium">Imágenes del vuelo interno/conexión</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Imágenes por defecto del plan. En la cotización el usuario puede subir las suyas.
                    </p>
                    <FlightImageGallery
                      images={internalFlights.map((f) => f.imageUrl)}
                      setImages={(urlsOrFn) => {
                        const prevUrls = internalFlights.map((f) => f.imageUrl);
                        const nextUrls = typeof urlsOrFn === "function" ? urlsOrFn(prevUrls) : urlsOrFn;
                        setInternalFlights((prev) =>
                          nextUrls.map((url) => {
                            const existing = prev.find((f) => f.imageUrl === url);
                            return existing ?? { imageUrl: url, cabinBaggage: false, holdBaggage: false, flightRole: "outbound" as const };
                          })
                        );
                      }}
                      onRemoveImage={async (url) => {
                        try {
                          await apiRequest("DELETE", `/api/admin/plan-image?url=${encodeURIComponent(url)}`);
                        } catch {
                          toast({ title: "Error", description: "No se pudo eliminar la imagen del almacenamiento.", variant: "destructive" });
                        }
                      }}
                      onFilesUpload={async (files) => {
                        if (!name.trim()) {
                          toast({ title: "Nombre requerido", description: "Ingresa el nombre del plan primero.", variant: "destructive" });
                          return;
                        }
                        setUploadingInternalFlight(true);
                        try {
                          for (let i = 0; i < files.length; i++) {
                            const formData = new FormData();
                            formData.append("file", files[i]);
                            formData.append("planName", name.trim());
                            formData.append("galleryIndex", `internal-${internalFlights.length + i + 1}`);
                            const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
                            if (!res.ok) throw new Error("Upload failed");
                            const { url } = await res.json();
                            setInternalFlights((prev) => [
                              ...prev,
                              { imageUrl: url, cabinBaggage: false, holdBaggage: false, flightRole: "outbound" },
                            ]);
                          }
                          toast({ title: "Imágenes subidas", description: `${files.length} imagen(es) agregada(s).` });
                        } catch {
                          toast({ title: "Error", description: "No se pudieron subir las imágenes.", variant: "destructive" });
                        } finally {
                          setUploadingInternalFlight(false);
                        }
                      }}
                      isUploading={uploadingInternalFlight}
                      label="vuelo interno/conexión"
                      description="Arrastra aquí o haz clic para seleccionar. El orden se usará en el PDF."
                      inputId="internal-flight-images"
                    />
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
          <div className="flex justify-between pt-2">
            <Button type="button" variant="ghost" onClick={() => setActiveTab("basico")}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>
            <Button type="button" variant="outline" onClick={() => setActiveTab("hoteles")}>
              Siguiente: Hoteles
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
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
                    <Collapsible key={i} defaultOpen={i === 0 || hotels.length <= 3}>
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

          <div className="flex justify-between pt-2">
            <Button type="button" variant="ghost" onClick={() => setActiveTab("itinerario")}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>
            <Button type="button" variant="outline" onClick={() => setActiveTab("incl-excl")}>
              Siguiente: Incl./Excl.
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
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
                <div key={i} className="flex gap-2 mb-2">
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
                <div key={i} className="flex gap-2 mb-2">
                  <Input value={x.item} onChange={(e) => updateExclusion(i, e.target.value)} placeholder="Exclusión" />
                  <Button variant="ghost" size="icon" onClick={() => removeExclusion(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="flex justify-between pt-2">
            <Button type="button" variant="ghost" onClick={() => setActiveTab("hoteles")}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>
            <Button type="button" variant="outline" onClick={() => setActiveTab("precios")}>
              Siguiente: Precios
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          </>
        </TabsContent>

        <TabsContent value="precios" className="mt-0">
          <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">5</span>
                Precios por fechas (Price Tiers)
              </CardTitle>
              <CardDescription>Rangos de fechas con precios específicos. Usado para planes como Turquía o Gran Tour.</CardDescription>
              <Button variant="outline" size="sm" onClick={addPriceTier}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar rango
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Precio global
                </div>
                <p className="text-sm text-muted-foreground">
                  Aplica el mismo precio a todas las filas de la lista (incluidos días de vuelo). Después puedes ajustar fechas individuales.
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="bulk-price">Precio USD</Label>
                    <Input
                      id="bulk-price"
                      type="number"
                      min={0}
                      step="0.01"
                      value={bulkPriceInput}
                      onChange={(e) => setBulkPriceInput(e.target.value)}
                      placeholder="Ej: 540"
                      className="w-36"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          applyBulkPriceToAllTiers();
                        }
                      }}
                    />
                  </div>
                  <Button type="button" variant="secondary" onClick={applyBulkPriceToAllTiers} disabled={!priceTiers.length}>
                    Aplicar a todas las fechas
                  </Button>
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={bulkExcludeFlightDays}
                    onCheckedChange={(c) => setBulkExcludeFlightDays(!!c)}
                  />
                  Excluir días de vuelo (solo actualizar fechas de salida con precio)
                </label>
              </div>

              {priceTiers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay fechas configuradas. Usa «Agregar rango» para crear la primera.</p>
              ) : null}

              {priceTiers.map((t, i) => (
                <div key={i} className="flex gap-2 items-center flex-wrap">
                  <Input
                    type="date"
                    value={t.startDate ?? ""}
                    onChange={(e) => updatePriceTier(i, { startDate: e.target.value || undefined })}
                    placeholder="Inicio"
                    className="w-36"
                  />
                  <Input
                    type="date"
                    value={t.endDate}
                    onChange={(e) => updatePriceTier(i, { endDate: e.target.value })}
                    placeholder="Fin"
                    className="w-36"
                  />
                  <Input
                    value={t.price}
                    onChange={(e) => updatePriceTier(i, { price: e.target.value })}
                    onBlur={() => commitPriceTierPrice(i)}
                    placeholder="Precio USD"
                    className="w-24"
                  />
                  <label className="flex items-center gap-1 text-sm">
                    <Checkbox
                      checked={t.isFlightDay ?? false}
                      onCheckedChange={(c) => updatePriceTier(i, { isFlightDay: !!c })}
                    />
                    Día vuelo
                  </label>
                  <Input
                    value={t.flightLabel ?? ""}
                    onChange={(e) => updatePriceTier(i, { flightLabel: e.target.value || undefined })}
                    placeholder="Etiqueta"
                    className="w-28"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removePriceTier(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Upgrades</CardTitle>
              <CardDescription>Opciones de mejora (ej: Turquía option1, option2).</CardDescription>
              <Button variant="outline" size="sm" onClick={addUpgrade}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar upgrade
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {upgrades.map((u, i) => (
                <div key={i} className="flex gap-2 items-center flex-wrap">
                  <Input
                    value={u.code}
                    onChange={(e) => updateUpgrade(i, { code: e.target.value })}
                    placeholder="Código (option1)"
                    className="w-24"
                  />
                  <Input
                    value={u.name}
                    onChange={(e) => updateUpgrade(i, { name: e.target.value })}
                    placeholder="Nombre"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={u.price}
                    onChange={(e) => updateUpgrade(i, { price: Number(e.target.value) || 0 })}
                    placeholder="Precio +"
                    className="w-24"
                  />
                  <Input
                    value={u.description ?? ""}
                    onChange={(e) => updateUpgrade(i, { description: e.target.value || undefined })}
                    placeholder="Descripción"
                    className="w-48"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeUpgrade(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Impuestos del plan
              </CardTitle>
              <CardDescription>
                Montos fijos que se suman al PVP al cotizar este plan. Si el plan no lleva impuestos, déjalo vacío.
              </CardDescription>
              <Button variant="outline" size="sm" onClick={addPlanTax}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar impuesto
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {planTaxes.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin impuestos configurados para este plan.</p>
              )}
              {planTaxes.map((tax, i) => (
                <div key={tax.id} className="flex gap-2 items-start flex-wrap border rounded-lg p-3">
                  <Input
                    value={tax.label}
                    onChange={(e) => updatePlanTax(i, { label: e.target.value })}
                    placeholder="Nombre (ej. Tasa aeroportuaria)"
                    className="flex-1 min-w-[180px]"
                  />
                  <div className="flex rounded-md border border-input p-0.5 bg-background shrink-0">
                    {(["USD", "COP"] as const).map((cur) => (
                      <button
                        key={cur}
                        type="button"
                        onClick={() => updatePlanTax(i, { currency: cur })}
                        className={cn(
                          "px-2 py-1 text-xs font-medium rounded-md transition-colors",
                          tax.currency === cur
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {cur === "USD" ? "US$" : "COP$"}
                      </button>
                    ))}
                  </div>
                  <Input
                    value={tax.amount}
                    onChange={(e) => updatePlanTax(i, { amount: e.target.value.replace(/,/g, "") })}
                    placeholder="Monto"
                    className="w-28"
                  />
                  <label className="flex items-center gap-1.5 text-sm shrink-0 pt-2">
                    <Checkbox
                      checked={tax.perPassenger !== false}
                      onCheckedChange={(c) => updatePlanTax(i, { perPassenger: !!c })}
                    />
                    Por pasajero
                  </label>
                  <Button variant="ghost" size="icon" onClick={() => removePlanTax(i)} className="shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="flex justify-between pt-2">
            <Button type="button" variant="ghost" onClick={() => setActiveTab("incl-excl")}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>
            <Button type="button" variant="outline" onClick={() => setActiveTab("imagenes")}>
              Siguiente: Imágenes
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          </>
        </TabsContent>

        <TabsContent value="imagenes" className="mt-0">
          <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">6</span>
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

          <div className="flex justify-between pt-2">
            <Button type="button" variant="ghost" onClick={() => setActiveTab("precios")}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>
            <div />
          </div>
          </>
        </TabsContent>
      </div>
      </Tabs>
    </div>
  );
}

export default AdminPlanForm;
