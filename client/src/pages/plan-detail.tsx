import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import type { Destination, ItineraryDay, Hotel, Inclusion, Exclusion, DestinationImage } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { OptimizedImage } from "@/components/optimized-image";
import { PlanAudioPlayer } from "@/components/plan-audio-player";
import { getDestinationImage } from "@/lib/destination-images";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Hotel as HotelIcon,
  Images,
  Info,
  ListChecks,
  ListX,
  MapPin,
  Plane,
  Stethoscope,
  UtensilsCrossed,
  ZoomIn,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

type PlanDetailPayload = Destination & {
  itinerary: ItineraryDay[];
  hotels: Hotel[];
  inclusions: Inclusion[];
  exclusions: Exclusion[];
  images: DestinationImage[];
};

function formatUsd(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = parseFloat(String(value));
  if (Number.isNaN(n)) return String(value);
  return `US$ ${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function normalizeGalleryUrls(urls: string[] | null | undefined): string[] {
  if (!urls?.length) return [];
  return urls.map((u) => String(u).trim()).filter((u) => u.length > 0);
}

function GalleryThumb({
  src,
  alt,
  onOpen,
  ratio = "4/3",
  className,
}: {
  src: string;
  alt: string;
  onOpen: () => void;
  /** `video` para mapas o banners anchos */
  ratio?: "4/3" | "video";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative w-full overflow-hidden rounded-lg border border-border bg-muted text-left outline-none",
        ratio === "video" ? "aspect-video" : "aspect-[4/3]",
        "shadow-sm transition hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <OptimizedImage
        src={src}
        alt={alt}
        containerClassName="absolute inset-0 size-full"
        imageClassName="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
      />
      <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
        <ZoomIn className="h-4 w-4" aria-hidden />
      </span>
      <span className="sr-only">Ampliar imagen</span>
    </button>
  );
}

const HERO_AUTOPLAY_MS = 4500;

/** Carrusel del hero: galerías del plan (hoteles, adicionales, imágenes del programa). Sin asistencia médica ni mapa. */
function PlanHeroGalleryCarousel({
  slides,
  fallbackCoverUrl,
  planName,
  onSlideClick,
}: {
  slides: { url: string; alt: string; lightboxIndex: number }[];
  fallbackCoverUrl: string | null;
  planName: string;
  /** Índice dentro del visor ampliado (`gallerySlides` completo). */
  onSlideClick: (lightboxIndex: number) => void;
}) {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    onSelect();
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api || slides.length <= 1) return;
    const id = window.setInterval(() => {
      api.scrollNext();
    }, HERO_AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [api, slides.length]);

  if (slides.length === 0) {
    if (fallbackCoverUrl) {
      return (
        <OptimizedImage
          src={fallbackCoverUrl}
          alt={planName}
          priority
          containerClassName="aspect-[21/9] min-h-[200px] w-full"
          imageClassName="object-cover"
        />
      );
    }
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center text-muted-foreground text-sm">
        Sin imagen principal
      </div>
    );
  }

  return (
    <Carousel
      setApi={setApi}
      opts={{ loop: slides.length > 1, align: "start", duration: 20 }}
      className="h-full w-full"
    >
      <CarouselContent className="-ml-0 h-full">
        {slides.map((slide, i) => (
          <CarouselItem key={`${slide.url}-${slide.lightboxIndex}-${i}`} className="basis-full pl-0">
            <button
              type="button"
              className="relative block aspect-[21/9] min-h-[200px] w-full overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => onSlideClick(slide.lightboxIndex)}
              aria-label={`Ampliar imagen ${i + 1} de ${slides.length}`}
            >
              <OptimizedImage
                src={slide.url}
                alt={slide.alt}
                priority={i === 0}
                containerClassName="absolute inset-0 size-full min-h-[200px]"
                imageClassName="object-cover"
              />
            </button>
          </CarouselItem>
        ))}
      </CarouselContent>
      {slides.length > 1 && (
        <div
          className="pointer-events-none absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5"
          aria-hidden
        >
          {slides.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === current ? "w-6 bg-background shadow-sm" : "w-1.5 bg-background/45",
              )}
            />
          ))}
        </div>
      )}
    </Carousel>
  );
}

export default function PlanDetail() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [, params] = useRoute("/plan/:id");
  const id = params?.id;

  const { data: plan, isLoading, isError, error } = useQuery<PlanDetailPayload>({
    queryKey: id ? ["/api/destinations", id] : ["/api/destinations", "__none"],
    enabled: !!id,
  });

  /** Mismo orden que en la pestaña Galería: asistencia médica → hoteles → adicionales → programa → mapa */
  const gallerySlides = useMemo(() => {
    if (!plan) return [];
    const slides: { url: string; alt: string }[] = [];
    const medical = plan.medicalAssistanceImageUrl?.trim();
    if (medical) {
      slides.push({ url: medical, alt: `Asistencia médica · ${plan.name}` });
    }
    const hg = normalizeGalleryUrls(plan.hotelGalleryImageUrls);
    hg.forEach((url, i) => slides.push({ url, alt: `${plan.name} · hotel · ${i + 1}` }));
    const adic = normalizeGalleryUrls(plan.adicionalesGalleryImageUrls);
    adic.forEach((url, i) => slides.push({ url, alt: `${plan.name} · adicional · ${i + 1}` }));
    const extra = normalizeGalleryUrls((plan.images ?? []).map((im) => im.imageUrl));
    extra.forEach((url, i) => slides.push({ url, alt: `${plan.name} · imagen ${i + 1}` }));
    const map = plan.itineraryMapImageUrl?.trim();
    if (map) slides.push({ url: map, alt: `Mapa del circuito · ${plan.name}` });
    return slides;
  }, [plan]);

  /** Solo galerías (hoteles, adicionales, imágenes del programa). Excluye asistencia médica y mapa. `lightboxIndex` apunta a la posición en `gallerySlides`. */
  const heroCarouselSlides = useMemo(() => {
    if (!plan) return [];
    const out: { url: string; alt: string; lightboxIndex: number }[] = [];
    let lightboxIndex = plan.medicalAssistanceImageUrl?.trim() ? 1 : 0;

    const hg = normalizeGalleryUrls(plan.hotelGalleryImageUrls);
    hg.forEach((url, i) => {
      out.push({ url, alt: `${plan.name} · hotel · ${i + 1}`, lightboxIndex });
      lightboxIndex += 1;
    });
    const adic = normalizeGalleryUrls(plan.adicionalesGalleryImageUrls);
    adic.forEach((url, i) => {
      out.push({ url, alt: `${plan.name} · adicional · ${i + 1}`, lightboxIndex });
      lightboxIndex += 1;
    });
    const extra = normalizeGalleryUrls((plan.images ?? []).map((im) => im.imageUrl));
    extra.forEach((url, i) => {
      out.push({ url, alt: `${plan.name} · imagen ${i + 1}`, lightboxIndex });
      lightboxIndex += 1;
    });
    return out;
  }, [plan]);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const goPrevSlide = useCallback(() => {
    setLightboxIndex((i) => {
      if (i === null || gallerySlides.length <= 1) return i;
      return (i - 1 + gallerySlides.length) % gallerySlides.length;
    });
  }, [gallerySlides.length]);

  const goNextSlide = useCallback(() => {
    setLightboxIndex((i) => {
      if (i === null || gallerySlides.length <= 1) return i;
      return (i + 1) % gallerySlides.length;
    });
  }, [gallerySlides.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    if (gallerySlides.length === 0) {
      setLightboxIndex(null);
      return;
    }
    if (lightboxIndex >= gallerySlides.length) {
      setLightboxIndex(gallerySlides.length - 1);
    }
  }, [lightboxIndex, gallerySlides.length]);

  useEffect(() => {
    if (lightboxIndex === null || gallerySlides.length <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrevSlide();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNextSlide();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, gallerySlides.length, goPrevSlide, goNextSlide]);

  if (!id) {
    return (
      <div className="container mx-auto max-w-3xl py-16 px-4">
        <Alert>
          <AlertDescription>Enlace de plan no válido.</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-accent/40 to-background">
        <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="aspect-[21/9] w-full rounded-2xl" />
          <Skeleton className="h-12 w-full max-w-md" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !plan) {
    return (
      <div className="container mx-auto max-w-3xl py-16 px-4">
        <Alert variant="destructive">
          <AlertDescription>
            {(error as Error)?.message || "No se pudo cargar este plan."}
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    );
  }

  const heroUrl = getDestinationImage(plan);
  const tierRows = plan.priceTiers ?? [];
  const hotelGallery = normalizeGalleryUrls(plan.hotelGalleryImageUrls);
  const adicionalesGallery = normalizeGalleryUrls(plan.adicionalesGalleryImageUrls);
  const extraImages = normalizeGalleryUrls(
    (plan.images ?? []).map((i) => i.imageUrl),
  );
  const mapUrl = plan.itineraryMapImageUrl?.trim() || null;
  const medicalImageUrl = plan.medicalAssistanceImageUrl?.trim() || null;
  const medicalInfo = plan.medicalAssistanceInfo?.trim() || null;

  const hasGalleryTabContent =
    hotelGallery.length > 0 ||
    adicionalesGallery.length > 0 ||
    extraImages.length > 0 ||
    !!mapUrl ||
    !!medicalImageUrl ||
    !!medicalInfo;

  const sortedItinerary = [...(plan.itinerary ?? [])].sort((a, b) => a.dayNumber - b.dayNumber);

  /** Índices alineados con `gallerySlides` (mismo orden que las secciones en la pestaña). */
  const hotelSlideStart = medicalImageUrl ? 1 : 0;
  const adicSlideStart = hotelSlideStart + hotelGallery.length;
  const extraSlideStart = adicSlideStart + adicionalesGallery.length;
  const mapSlideIndex = mapUrl ? extraSlideStart + extraImages.length : -1;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-accent/40 to-background pb-24">
      <div className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-20">
        <div className="container mx-auto max-w-4xl px-4 py-3 flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Volver al cotizador
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-6 hidden sm:block" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">
              {plan.country}
            </p>
            <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">{plan.name}</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
        <p className="text-sm text-muted-foreground flex items-start gap-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
          <span>
            Revisa aquí el itinerario y las condiciones. Para armar la cotización, vuelve al inicio, selecciona este u otros planes, elige fechas y continúa.
          </span>
        </p>

        {plan.descriptiveAudioUrl?.trim() ? (
          <div className="sticky top-14 z-[15] -mx-1 px-1 pb-1">
            <PlanAudioPlayer
              destinationId={plan.id}
              src={plan.descriptiveAudioUrl.trim()}
              planTitle={plan.name}
            />
          </div>
        ) : null}

        <div className="rounded-2xl overflow-hidden border border-border/80 shadow-lg bg-card">
          <div className="relative aspect-[21/9] min-h-[200px] w-full bg-muted">
            <PlanHeroGalleryCarousel
              slides={heroCarouselSlides}
              fallbackCoverUrl={heroUrl}
              planName={plan.name}
              onSlideClick={(idx) => setLightboxIndex(idx)}
            />
            {plan.isBloqueo && (
              <div className="absolute bottom-3 left-3 z-20 flex flex-wrap gap-2">
                <Badge className="bg-primary text-primary-foreground">Bloqueo</Badge>
                {plan.bloqueoSalidaFecha && (
                  <Badge variant="secondary" className="backdrop-blur-sm bg-background/90">
                    Salida{" "}
                    {new Date(plan.bloqueoSalidaFecha + "T12:00:00").toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </Badge>
                )}
                {plan.bloqueoCuposDisponibles != null && (
                  <Badge
                    variant={plan.bloqueoCuposDisponibles <= 0 ? "destructive" : "outline"}
                    className="backdrop-blur-sm bg-background/90"
                  >
                    {plan.bloqueoCuposDisponibles <= 0
                      ? "Sin cupos"
                      : `${plan.bloqueoCuposDisponibles} cupos`}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap gap-4 justify-between items-start">
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    {plan.duration} días / {plan.nights} noches
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5">
                  <MapPin className="h-4 w-4 text-price-accent" />
                  <span className="font-medium capitalize">{plan.category || "plan"}</span>
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  {plan.isBloqueo ? "Precio fijo" : "Precio desde"}
                </div>
                <div className="text-3xl font-extrabold text-price-accent tabular-nums">
                  {formatUsd(plan.basePrice)}
                </div>
                <div className="text-xs text-muted-foreground">Porción terrestre</div>
              </div>
            </div>

            {plan.description?.trim() && (
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {plan.description}
              </p>
            )}
          </div>
        </div>

        <Tabs defaultValue="itinerario" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto sm:h-11 gap-1 p-1">
            <TabsTrigger value="itinerario" className="text-xs sm:text-sm gap-1">
              <CalendarDays className="h-3.5 w-3.5 hidden sm:inline" />
              Itinerario
            </TabsTrigger>
            <TabsTrigger value="hoteles" className="text-xs sm:text-sm gap-1">
              <HotelIcon className="h-3.5 w-3.5 hidden sm:inline" />
              Hoteles
            </TabsTrigger>
            <TabsTrigger value="galeria" className="text-xs sm:text-sm gap-1">
              <Images className="h-3.5 w-3.5 hidden sm:inline" />
              Galería
            </TabsTrigger>
            <TabsTrigger value="precios" className="text-xs sm:text-sm gap-1">
              <ListChecks className="h-3.5 w-3.5 hidden sm:inline" />
              Precios / fechas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="itinerario" className="mt-6 space-y-4">
            {sortedItinerary.length === 0 ? (
              <Card variant="glass">
                <CardContent className="py-10 text-center text-muted-foreground text-sm">
                  No hay días de itinerario cargados para este plan.
                </CardContent>
              </Card>
            ) : (
              sortedItinerary.map((day) => (
                <Card key={day.id} variant="glass" className="overflow-hidden">
                  <CardHeader className="pb-2 bg-accent/30 border-b border-border/60">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <CardTitle className="text-base sm:text-lg">
                        Día {day.dayNumber}
                        {day.title ? ` · ${day.title}` : ""}
                      </CardTitle>
                      {day.location && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {day.location}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3 text-sm">
                    <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {day.description}
                    </p>
                    {day.activities && day.activities.length > 0 && (
                      <div>
                        <p className="font-semibold text-foreground mb-1">Actividades</p>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          {day.activities.map((a, i) => (
                            <li key={`${day.id}-act-${i}`}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-4 text-muted-foreground">
                      {day.meals && day.meals.length > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                          <UtensilsCrossed className="h-4 w-4 text-price-accent" />
                          {day.meals.join(" · ")}
                        </span>
                      )}
                      {day.accommodation?.trim() && (
                        <span className="inline-flex items-center gap-1.5">
                          <HotelIcon className="h-4 w-4 text-primary" />
                          {day.accommodation}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            {mapUrl && (
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="text-base">Mapa del circuito</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg overflow-hidden border border-border">
                    <OptimizedImage
                      src={mapUrl}
                      alt={`Mapa · ${plan.name}`}
                      containerClassName="w-full aspect-video"
                      imageClassName="object-contain bg-muted"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="hoteles" className="mt-6">
            {(!plan.hotels || plan.hotels.length === 0) ? (
              <Card variant="glass">
                <CardContent className="py-10 text-center text-muted-foreground text-sm">
                  No hay hoteles detallados en el catálogo.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {plan.hotels.map((h) => (
                  <Card key={h.id} variant="glass" className="overflow-hidden">
                    {h.imageUrl && (
                      <div className="aspect-video bg-muted">
                        <OptimizedImage
                          src={h.imageUrl}
                          alt={h.name}
                          containerClassName="aspect-video w-full"
                          imageClassName="object-cover"
                        />
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{h.name}</CardTitle>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {h.category && <p>{h.category}</p>}
                        {h.location && <p>{h.location}</p>}
                        {h.nights != null && <p>{h.nights} noche(s)</p>}
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="galeria" className="mt-6 space-y-8">
            {(medicalImageUrl || medicalInfo) && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-primary mb-3 flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-emerald-600" aria-hidden />
                  Asistencia médica
                </h2>
                <Card variant="glass" className="overflow-hidden">
                  {medicalImageUrl && medicalInfo ? (
                    <CardContent className="p-0">
                      <div className="grid md:grid-cols-2 md:divide-x divide-border">
                        <div className="p-3 bg-muted/20">
                          <GalleryThumb
                            src={medicalImageUrl}
                            alt={`Asistencia médica · ${plan.name}`}
                            onOpen={() => setLightboxIndex(0)}
                          />
                        </div>
                        <div className="p-4 sm:p-5 flex flex-col justify-center border-t md:border-t-0 border-border">
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                            {medicalInfo}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  ) : medicalImageUrl ? (
                    <CardContent className="p-3 sm:p-4 max-w-3xl">
                      <GalleryThumb
                        src={medicalImageUrl}
                        alt={`Asistencia médica · ${plan.name}`}
                        onOpen={() => setLightboxIndex(0)}
                      />
                    </CardContent>
                  ) : (
                    <CardContent className="p-4 sm:p-5">
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                        {medicalInfo}
                      </p>
                    </CardContent>
                  )}
                </Card>
              </section>
            )}

            {hotelGallery.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-primary mb-3">
                  Hoteles (galería)
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {hotelGallery.map((url, i) => (
                    <GalleryThumb
                      key={`hg-${i}-${url.slice(-24)}`}
                      src={url}
                      alt={`${plan.name} · hotel · ${i + 1}`}
                      onOpen={() => setLightboxIndex(hotelSlideStart + i)}
                    />
                  ))}
                </div>
              </section>
            )}
            {adicionalesGallery.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-primary mb-3">
                  Adicionales
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {adicionalesGallery.map((url, i) => (
                    <GalleryThumb
                      key={`ag-${i}-${url.slice(-24)}`}
                      src={url}
                      alt={`${plan.name} · adicional · ${i + 1}`}
                      onOpen={() => setLightboxIndex(adicSlideStart + i)}
                    />
                  ))}
                </div>
              </section>
            )}
            {extraImages.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-primary mb-3">
                  Imágenes del programa
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {extraImages.map((url, i) => (
                    <GalleryThumb
                      key={`ex-${i}-${url.slice(-24)}`}
                      src={url}
                      alt={`${plan.name} · imagen ${i + 1}`}
                      onOpen={() => setLightboxIndex(extraSlideStart + i)}
                    />
                  ))}
                </div>
              </section>
            )}

            {mapUrl && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-primary mb-3">
                  Mapa del circuito
                </h2>
                <div className="max-w-3xl">
                  <GalleryThumb
                    ratio="video"
                    src={mapUrl}
                    alt={`Mapa del circuito · ${plan.name}`}
                    onOpen={() => mapSlideIndex >= 0 && setLightboxIndex(mapSlideIndex)}
                  />
                </div>
              </section>
            )}

            {!hasGalleryTabContent && (
              <Card variant="glass">
                <CardContent className="py-10 text-center text-muted-foreground text-sm">
                  No hay imágenes de galería ni asistencia médica configuradas para este plan.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="precios" className="mt-6 space-y-6">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  Resumen de precio base
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>
                  <span className="text-muted-foreground">Tarifa referencial: </span>
                  <strong className="text-price-accent text-lg">{formatUsd(plan.basePrice)}</strong>
                  <span className="text-muted-foreground"> (terrestre)</span>
                </p>
                {tierRows.length > 0 && (
                  <p className="text-muted-foreground">
                    Este plan tiene tarifas por fechas o temporadas. En el calendario del inicio verás las fechas
                    habilitadas y podrás alinear la cotización con el precio vigente.
                  </p>
                )}
              </CardContent>
            </Card>

            {tierRows.length > 0 && (
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Tramos y fechas (precio dinámico)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 sm:p-6 pt-0">
                  <ScrollArea className="w-full max-h-[360px] sm:max-h-[420px] rounded-md border border-border/80">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10">
                        <tr className="border-b border-border text-left">
                          <th className="p-3 font-semibold">Inicio</th>
                          <th className="p-3 font-semibold">Fin / fecha</th>
                          <th className="p-3 font-semibold text-right">Precio</th>
                          <th className="p-3 font-semibold hidden sm:table-cell">Nota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tierRows.map((tier, idx) => (
                          <tr key={`tier-${idx}`} className="border-b border-border/60 hover:bg-accent/20">
                            <td className="p-3 text-muted-foreground whitespace-nowrap">
                              {tier.startDate || "—"}
                            </td>
                            <td className="p-3 font-medium">{tier.endDate}</td>
                            <td className="p-3 text-right font-semibold text-price-accent tabular-nums">
                              {formatUsd(tier.price)}
                            </td>
                            <td className="p-3 text-muted-foreground text-xs hidden sm:table-cell">
                              {tier.isFlightDay && (
                                <Badge variant="outline" className="mr-1">
                                  Vuelo
                                </Badge>
                              )}
                              {tier.flightLabel || ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {plan.internalFlights && plan.internalFlights.length > 0 && (
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plane className="h-4 w-4" />
                    Vuelos internos / conexiones (referencia)
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4">
                  {plan.internalFlights.map((f, i) => (
                    <div
                      key={`if-${i}`}
                      className="rounded-lg border border-border overflow-hidden bg-card"
                    >
                      {f.imageUrl && (
                        <OptimizedImage
                          src={f.imageUrl}
                          alt={f.label || `Vuelo ${i + 1}`}
                          containerClassName="aspect-[16/10] w-full"
                          imageClassName="object-cover"
                        />
                      )}
                      <div className="p-3 text-sm">
                        <p className="font-medium">{f.label || `Segmento ${i + 1}`}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {f.flightRole === "outbound" && "Ida"}
                          {f.flightRole === "return" && "Regreso"}
                          {f.flightRole === "domestic" && "Interno / conexión"}
                          {!f.flightRole && "—"}
                          {f.cabinBaggage ? " · Cabina" : ""}
                          {f.holdBaggage ? " · Bodega" : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <Card variant="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
                    <ListChecks className="h-4 w-4" />
                    Incluye
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {plan.inclusions?.length ? (
                    <ul className="text-sm space-y-2 list-disc list-inside text-foreground/90">
                      {[...(plan.inclusions ?? [])]
                        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
                        .map((inc) => (
                          <li key={inc.id}>{inc.item}</li>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin listado en catálogo.</p>
                  )}
                </CardContent>
              </Card>
              <Card variant="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-200">
                    <ListX className="h-4 w-4" />
                    No incluye
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {plan.exclusions?.length ? (
                    <ul className="text-sm space-y-2 list-disc list-inside text-foreground/90">
                      {[...(plan.exclusions ?? [])]
                        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
                        .map((exc) => (
                          <li key={exc.id}>{exc.item}</li>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin listado en catálogo.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {(plan.flightTerms?.trim() || plan.termsConditions?.trim()) && (
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="text-base">Condiciones y términos</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-4 text-muted-foreground whitespace-pre-wrap">
                  {plan.flightTerms?.trim() && (
                    <div>
                      <p className="font-semibold text-foreground mb-1">Vuelos</p>
                      {plan.flightTerms}
                    </div>
                  )}
                  {plan.termsConditions?.trim() && (
                    <div>
                      <p className="font-semibold text-foreground mb-1">Generales</p>
                      {plan.termsConditions}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-center pt-4">
          <Button asChild size="lg" className="shadow-lg">
            <Link href="/">Listo — volver y seleccionar planes</Link>
          </Button>
        </div>
      </div>

      <Dialog
        open={lightboxIndex !== null && gallerySlides.length > 0}
        onOpenChange={(open) => !open && closeLightbox()}
      >
        <DialogContent className="max-w-[min(96vw,56rem)] w-full p-2 sm:p-4 gap-3 border-border">
          <DialogHeader className="space-y-1 px-1 pr-10">
            <DialogTitle className="text-base">Vista ampliada</DialogTitle>
            {lightboxIndex !== null && gallerySlides[lightboxIndex] && (
              <>
                <DialogDescription className="text-xs sm:text-sm line-clamp-3">
                  {gallerySlides[lightboxIndex].alt}
                </DialogDescription>
                {gallerySlides.length > 1 && (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {lightboxIndex + 1} / {gallerySlides.length}
                  </p>
                )}
              </>
            )}
          </DialogHeader>
          {lightboxIndex !== null && gallerySlides[lightboxIndex] && (
            <div className="flex w-full items-center gap-2 sm:gap-4">
              {gallerySlides.length > 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full border border-border bg-background shadow-md sm:h-12 sm:w-12"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrevSlide();
                  }}
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              )}
              <div className="min-w-0 flex-1 overflow-hidden rounded-md border border-border bg-muted">
                <img
                  src={gallerySlides[lightboxIndex].url}
                  alt={gallerySlides[lightboxIndex].alt}
                  className="mx-auto block max-h-[min(85vh,800px)] w-full object-contain"
                />
              </div>
              {gallerySlides.length > 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full border border-border bg-background shadow-md sm:h-12 sm:w-12"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNextSlide();
                  }}
                  aria-label="Imagen siguiente"
                >
                  <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
