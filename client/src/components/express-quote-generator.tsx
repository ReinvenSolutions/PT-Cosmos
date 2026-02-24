import { useState, useRef } from "react";
import { toJpeg } from "html-to-image";
import { saveAs } from "file-saver";
import { QuoteTemplate } from "./quote-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Upload, Image as ImageIcon, ImagePlus, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackQuote } from "@/lib/tracking";
import { cn } from "@/lib/utils";

export function ExpressQuoteGenerator() {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

  // Estado del formulario
  const [mainTitle, setMainTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hotelStars, setHotelStars] = useState(4);
  const [includes, setIncludes] = useState<string[]>([]);
  const [plan, setPlan] = useState<"solo" | "empaquetado">("empaquetado");
  const [numberOfPeople, setNumberOfPeople] = useState(2);
  const [price, setPrice] = useState("");
  const [disclaimer, setDisclaimer] = useState("");
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dragMain, setDragMain] = useState(false);
  const [dragLogo, setDragLogo] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processMainImageFile(file);
    e.target.value = "";
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processLogoFile(file);
    e.target.value = "";
  };

  const processLogoFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: "El logo es demasiado grande. Máximo 2MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setLogoUrl(reader.result as string);
    reader.onerror = () => toast({ title: "Error", description: "Error al cargar el logo.", variant: "destructive" });
    reader.readAsDataURL(file);
  };

  const processMainImageFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "La imagen es demasiado grande. Máximo 5MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setMainImage(reader.result as string);
    reader.onerror = () => toast({ title: "Error", description: "Error al cargar la imagen.", variant: "destructive" });
    reader.readAsDataURL(file);
  };

  const handleIncludesChange = (item: string, checked: boolean) => {
    setIncludes(prev => 
      checked 
        ? [...prev, item]
        : prev.filter(i => i !== item)
    );
  };

  const formatPrice = (value: string): string => {
    // Remover todo excepto números
    const numbers = value.replace(/\D/g, '');
    
    if (!numbers) return '';
    
    // Convertir a número y formatear con separadores de miles
    const formatted = parseInt(numbers).toLocaleString('es-CO');
    
    return formatted;
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Si el usuario está borrando, permitir campo vacío
    if (inputValue === '') {
      setPrice('');
      return;
    }
    
    // Extraer solo números
    const numbers = inputValue.replace(/\D/g, '');
    
    if (numbers) {
      // Formatear y guardar
      const formatted = formatPrice(numbers);
      setPrice(formatted);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) {
      toast({
        title: "Error",
        description: "No se puede generar la imagen. Intenta de nuevo.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Generando imagen...",
        description: "Por favor espera mientras se procesa la imagen.",
      });

      // Track Express Quote Generation
      trackQuote({
        totalPrice: price,
        passengers: numberOfPeople,
        isSaved: false,
        metadata: {
          action: "express_download",
          mainTitle: mainTitle,
          description: description,
          includes: includes,
          plan: plan,
        }
      });

      const dataUrl = await toJpeg(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width: 800,
        height: cardRef.current.scrollHeight,
      });

      saveAs(dataUrl, `cotizacion-express-${Date.now()}.jpg`);

      toast({
        title: "¡Éxito!",
        description: "La imagen se ha descargado correctamente.",
      });
    } catch (error) {
      console.error("Error al generar imagen:", error);
      toast({
        title: "Error",
        description: "Hubo un problema al generar la imagen. Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const includeOptions = [
    { id: "vuelo", label: "Vuelo" },
    { id: "traslado", label: "Traslado" },
    { id: "hotel", label: "Hotel" },
    { id: "actividades", label: "Actividades" },
    { id: "asistencia-medica", label: "Asistencia Médica" },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-7rem)] min-h-[500px]">
      {/* Panel Izquierdo: Formulario compacto */}
      <div className="lg:w-1/2 overflow-y-auto pr-0 lg:pr-4 flex-shrink-0">
        <Card className="glass-card overflow-hidden">
          <CardHeader className="py-3 px-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="w-4 h-4 text-primary" />
              Formulario de Cotización
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            {/* Imagen Principal (100% ancho) - zona de carga moderna */}
            <div className="space-y-1.5">
              <Label className="text-xs">Imagen Principal *</Label>
              <label
                htmlFor="mainImage"
                onDragOver={(e) => { e.preventDefault(); setDragMain(true); }}
                onDragLeave={() => setDragMain(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragMain(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file?.type.startsWith("image/")) processMainImageFile(file);
                }}
                className={cn(
                  "block w-full cursor-pointer rounded-xl border-2 border-dashed transition-all",
                  mainImage
                    ? "border-primary/40 bg-primary/5 overflow-hidden"
                    : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50",
                  dragMain && !mainImage && "border-primary bg-primary/10"
                )}
              >
                <input
                  id="mainImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="sr-only"
                />
                {mainImage ? (
                  <div className="relative aspect-video w-full group">
                    <img src={mainImage} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <ImagePlus className="w-6 h-6 text-white" />
                      <span className="text-sm font-medium text-white">Cambiar imagen</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 px-4">
                    <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                    <span className="text-sm font-medium text-foreground">Arrastra una imagen o haz clic para subir</span>
                    <span className="text-xs text-muted-foreground mt-0.5">PNG, JPG o WebP · Máx. 5MB</span>
                  </div>
                )}
              </label>
            </div>

            {/* Logo (100% ancho) - zona de carga moderna */}
            <div className="space-y-1.5">
              <Label className="text-xs">Logo (Opcional)</Label>
              <label
                htmlFor="logo"
                onDragOver={(e) => { e.preventDefault(); setDragLogo(true); }}
                onDragLeave={() => setDragLogo(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragLogo(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file?.type.startsWith("image/")) processLogoFile(file);
                }}
                className={cn(
                  "block w-full cursor-pointer rounded-xl border-2 border-dashed transition-all",
                  logoUrl
                    ? "border-primary/40 bg-primary/5 p-3"
                    : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50 py-6",
                  dragLogo && !logoUrl && "border-primary bg-primary/10"
                )}
              >
                <input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="sr-only"
                />
                {logoUrl ? (
                  <div className="flex items-center justify-between gap-3">
                    <img src={logoUrl} alt="Logo" className="h-12 w-auto max-w-[200px] object-contain" />
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <ImagePlus className="w-3.5 h-3.5" />
                      Cambiar
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground mb-1.5" />
                    <span className="text-xs font-medium text-foreground">Arrastra el logo o haz clic para subir</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">Máx. 2MB</span>
                  </div>
                )}
              </label>
            </div>

            {/* Título (ancho completo) */}
            <div className="space-y-1.5">
              <Label htmlFor="mainTitle" className="text-xs">Título Principal *</Label>
              <Input
                id="mainTitle"
                value={mainTitle}
                onChange={(e) => setMainTitle(e.target.value)}
                placeholder="Ej: Hotel Paradise Beach"
                className="h-9"
              />
            </div>

            {/* Descripción (ancho completo) - más espacio para texto largo */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs">Descripción *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: 4 días y 3 noches, vuelo incluido, hoteles 4 estrellas..."
                rows={2}
                className="min-h-[60px] resize-none text-sm"
              />
            </div>

            {/* Fila 3: Incluye (horizontal compacto) */}
            <div className="space-y-1.5">
              <Label className="text-xs">Incluye</Label>
              <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
                {includeOptions.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-1.5 cursor-pointer text-xs font-medium px-2.5 py-1.5 rounded-md hover:bg-background/50 transition-colors"
                  >
                    <Checkbox
                      id={item.id}
                      checked={includes.includes(item.label)}
                      onCheckedChange={(checked) => handleIncludesChange(item.label, checked as boolean)}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Fila 4: Plan + Personas + Precio (+ Estrellas si Hotel) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {includes.includes("Hotel") && (
                <div className="space-y-1.5">
                  <Label htmlFor="hotelStars" className="text-xs">Estrellas *</Label>
                  <Input
                    id="hotelStars"
                    type="number"
                    min={1}
                    max={5}
                    value={hotelStars}
                    onChange={(e) => setHotelStars(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="h-9"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="plan" className="text-xs">Plan *</Label>
                <Select value={plan} onValueChange={(v: "solo" | "empaquetado") => setPlan(v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solo">Solo</SelectItem>
                    <SelectItem value="empaquetado">Empaquetado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="numberOfPeople" className="text-xs">Personas *</Label>
                <Input
                  id="numberOfPeople"
                  type="number"
                  min={1}
                  value={numberOfPeople}
                  onChange={(e) => setNumberOfPeople(parseInt(e.target.value) || 1)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price" className="text-xs">Precio *</Label>
                <Input
                  id="price"
                  value={price}
                  onChange={handlePriceChange}
                  placeholder="Ej: 2173600"
                  className="h-9"
                />
              </div>
            </div>

            {/* Fila 5: Disclaimer (compacto) */}
            <div className="space-y-1.5">
              <Label htmlFor="disclaimer" className="text-xs">Términos / Disclaimer</Label>
              <Textarea
                id="disclaimer"
                value={disclaimer}
                onChange={(e) => setDisclaimer(e.target.value)}
                placeholder="Términos, vigencia, impuestos..."
                rows={2}
                className="resize-none text-sm min-h-[52px]"
              />
            </div>

            {/* Fila 6: Teléfono + Email + Botón */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs">Teléfono *</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+57 321 456 7890"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@cosmosmayorista.com"
                  className="h-9"
                />
              </div>
            </div>

            <Button
              onClick={handleDownload}
              className="w-full h-10"
              disabled={!mainTitle || !price || !phone || !email}
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar Imagen
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Panel Derecho: Vista Previa — presentación profesional */}
      <div className="preview-showcase lg:w-1/2 flex flex-col min-h-0 flex-1 overflow-hidden">
        <div className="preview-showcase-header flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="preview-showcase-icon">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Vista Previa</h3>
              <p className="text-xs text-muted-foreground">Así se verá tu cotización al descargar</p>
            </div>
          </div>
        </div>
        <div className="preview-showcase-stage flex-1 min-h-0 overflow-auto flex justify-center items-start p-6">
          <div className="preview-showcase-frame">
            <QuoteTemplate
              ref={cardRef}
              mainTitle={mainTitle}
              description={description}
              hotelStars={hotelStars}
              includes={includes}
              plan={plan}
              numberOfPeople={numberOfPeople}
              price={price}
              disclaimer={disclaimer}
              mainImage={mainImage}
              logoUrl={logoUrl}
              phone={phone}
              email={email}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
