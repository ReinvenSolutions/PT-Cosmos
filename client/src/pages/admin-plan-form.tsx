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
import { ArrowLeft, Plus, Trash2, Upload, Save, ImageIcon, Check, ChevronRight, Building2, ChevronLeft, ImagePlus, GripVertical, FileText, CheckCircle2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CosmoProcessingDialog } from "@/components/cosmo-processing-dialog";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
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
import type { InternalFlightItem } from "@/components/plan-modals";

type ItineraryDay = {
  dayNumber: number;
  title: string;
  location?: string;
  description: string;
  activities?: string[];
  meals?: string[];
  accommodation?: string;
};

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
        <img
          src={img.imageUrl}
          alt={`Imagen ${index + 1}`}
          className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg pointer-events-none"
        />
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
  const [imageUrl, setImageUrl] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [category, setCategory] = useState("internacional");
  const [isPromotion, setIsPromotion] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(999);
  const [isActive, setIsActive] = useState(true);
  const [allowedDays, setAllowedDays] = useState<string[]>([]);
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [inclusions, setInclusions] = useState<Inclusion[]>([]);
  const [exclusions, setExclusions] = useState<Exclusion[]>([]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [internalFlights, setInternalFlights] = useState<InternalFlightItem[]>([]);
  const [medicalAssistanceInfo, setMedicalAssistanceInfo] = useState("");
  const [medicalAssistanceImageUrl, setMedicalAssistanceImageUrl] = useState("");
  const [firstPageComments, setFirstPageComments] = useState("");
  const [itineraryMapImageUrl, setItineraryMapImageUrl] = useState("");
  const [flightTerms, setFlightTerms] = useState("");
  const [termsConditions, setTermsConditions] = useState("");
  const [hasInternalOrConnectionFlight, setHasInternalOrConnectionFlight] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingInternalFlight, setUploadingInternalFlight] = useState(false);
  const [uploadingMainImage, setUploadingMainImage] = useState(false);
  const [galleryDialogOpen, setGalleryDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("basico");
  const [dragGallery, setDragGallery] = useState(false);
  const [extractingPlan, setExtractingPlan] = useState(false);
  const [cosmoSuccess, setCosmoSuccess] = useState(false);
  const [cosmoDialogOpen, setCosmoDialogOpen] = useState(false);
  const [cosmoProgress, setCosmoProgress] = useState(0);
  const [cosmoStageLabel, setCosmoStageLabel] = useState("");
  const [dragDocumentOver, setDragDocumentOver] = useState(false);
  const [dragMainImageOver, setDragMainImageOver] = useState(false);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainImageFileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const { data: existing, isLoading } = useQuery<{
    name?: string;
    country?: string;
    duration?: number;
    nights?: number;
    description?: string | null;
    imageUrl?: string | null;
    basePrice?: string | null;
    category?: string;
    isPromotion?: boolean;
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
    hasInternalOrConnectionFlight?: boolean;
  }>({
    queryKey: [`/api/admin/destinations/${id}`],
    enabled: isEditing && !!id,
  });

  useEffect(() => {
    if (existing) {
      setName(existing.name ?? "");
      setCountry(existing.country ?? "");
      setDuration(existing.duration ?? 1);
      setNights(existing.nights ?? 0);
      setDescription(existing.description ?? "");
      setImageUrl(existing.imageUrl ?? "");
      setBasePrice(existing.basePrice ?? "");
      setCategory(existing.category ?? "internacional");
      setIsPromotion(existing.isPromotion ?? false);
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
      setFlightTerms(existing.flightTerms ?? "");
      setTermsConditions(existing.termsConditions ?? "");
      setHasInternalOrConnectionFlight(existing.hasInternalOrConnectionFlight ?? false);
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (isEditing && id) {
        const res = await apiRequest("PUT", `/api/admin/destinations/${id}`, payload);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/admin/destinations", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/destinations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/destinations?isActive=true"] });
      toast({ title: isEditing ? "Plan actualizado" : "Plan creado", description: "Los cambios se han guardado correctamente." });
      setLocation("/admin/plans");
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    const payload = {
      name,
      country,
      duration,
      nights,
      description: description || null,
      imageUrl: imageUrl || null,
      basePrice: basePrice ? String(basePrice) : null,
      category,
      isPromotion,
      displayOrder,
      isActive,
      requiresTuesday: allowedDays.length === 1 && allowedDays[0] === "tuesday",
      allowedDays: allowedDays.length ? allowedDays : null,
      priceTiers: priceTiers.length ? priceTiers : null,
      upgrades: upgrades.length ? upgrades : null,
      itinerary,
      hotels,
      inclusions,
      exclusions,
      images,
      hasInternalOrConnectionFlight,
      internalFlights: internalFlights.length ? internalFlights : null,
      medicalAssistanceInfo: medicalAssistanceInfo || null,
      medicalAssistanceImageUrl: medicalAssistanceImageUrl || null,
      firstPageComments: firstPageComments || null,
      itineraryMapImageUrl: itineraryMapImageUrl || null,
      flightTerms: flightTerms || null,
      termsConditions: termsConditions || null,
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

  const addUpgrade = () => setUpgrades((prev) => [...prev, { code: "", name: "", price: 0 }]);
  const updateUpgrade = (i: number, f: Partial<Upgrade>) => setUpgrades((prev) => prev.map((u, j) => (j === i ? { ...u, ...f } : u)));
  const removeUpgrade = (i: number) => setUpgrades((prev) => prev.filter((_, j) => j !== i));

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

  const removeImage = (i: number) => setImages((prev) => prev.filter((_, j) => j !== i));

  const applyPlanToForm = (plan: Record<string, unknown>) => {
    if (plan.name) setName(String(plan.name));
    if (plan.country) setCountry(String(plan.country));
    if (plan.duration) setDuration(Number(plan.duration));
    if (plan.nights !== undefined) setNights(Number(plan.nights));
    if (plan.description) setDescription(String(plan.description));
    if (plan.basePrice) setBasePrice(String(plan.basePrice));
    if (Array.isArray(plan.itinerary) && plan.itinerary.length) {
      setItinerary((plan.itinerary as ItineraryDay[]).map((d, i) => ({ ...d, dayNumber: d.dayNumber ?? i + 1 })));
    }
    if (Array.isArray(plan.hotels) && plan.hotels.length) setHotels(plan.hotels as Hotel[]);
    if (Array.isArray(plan.inclusions) && plan.inclusions.length) setInclusions(plan.inclusions as Inclusion[]);
    if (Array.isArray(plan.exclusions) && plan.exclusions.length) setExclusions(plan.exclusions as Exclusion[]);
    if (Array.isArray(plan.priceTiers) && plan.priceTiers.length) setPriceTiers(plan.priceTiers as PriceTier[]);
    if (Array.isArray(plan.upgrades) && plan.upgrades.length) setUpgrades(plan.upgrades as Upgrade[]);
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
          <Save className="mr-2 h-4 w-4" />
          {saveMutation.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>

      {!isEditing && (
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
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Descripción breve del plan..." />
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

              {/* Activo y Es promoción - debajo del bloque imagen */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={isActive} onCheckedChange={(c) => setIsActive(!!c)} />
                  <span>Activo en catálogo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={isPromotion} onCheckedChange={(c) => setIsPromotion(!!c)} />
                  Es promoción
                </label>
              </div>

              {/* Días permitidos - debajo de Activo/Promoción */}
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
                <Label className="text-sm font-medium">Comentarios primera hoja del PDF</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Texto de la sección COMENTARIOS. Usa **texto** para resaltar en negrita.
                </p>
                <Textarea
                  value={firstPageComments}
                  onChange={(e) => setFirstPageComments(e.target.value)}
                  placeholder="Tarifa sujeta a cambios sin previo aviso y disponibilidad. Para el destino, cuenta con acompañamiento de guía de habla hispana..."
                  rows={4}
                  className="mt-1"
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
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Términos debajo de cada vuelo</Label>
                    <Textarea
                      value={flightTerms}
                      onChange={(e) => setFlightTerms(e.target.value)}
                      placeholder="Los boletos de avión no son reembolsables..."
                      rows={5}
                      className="mt-1 font-mono text-sm"
                    />
                  </div>
                </div>
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
                      className="mt-1"
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
                                  value={(day.meals ?? []).join(", ")}
                                  onChange={(e) => updateItineraryDay(i, {
                                    meals: e.target.value.split(/[,;\n]/).map((m) => m.trim()).filter(Boolean),
                                  })}
                                  placeholder="Desayuno, Almuerzo, Cena"
                                  className="h-9"
                                />
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  Separa con comas. Se usa para el conteo en cotizaciones.
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

                {hasInternalOrConnectionFlight && (
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
                            return existing ?? { imageUrl: url, cabinBaggage: false, holdBaggage: false };
                          })
                        );
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
                            setInternalFlights((prev) => [...prev, { imageUrl: url, cabinBaggage: false, holdBaggage: false }]);
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
                    allowUploadWithoutPlan
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
            <CardContent className="space-y-3">
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
