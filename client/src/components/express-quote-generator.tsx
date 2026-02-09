import { useState, useRef, useEffect } from "react";
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
import { Download, Upload, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackQuote } from "@/lib/tracking";

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "La imagen es demasiado grande. Máximo 5MB.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setMainImage(reader.result as string);
      };
      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Error al cargar la imagen.",
          variant: "destructive",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "El logo es demasiado grande. Máximo 2MB.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
        toast({
          title: "Logo cargado",
          description: "El logo ha sido cargado exitosamente.",
        });
      };
      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Error al cargar el logo.",
          variant: "destructive",
        });
      };
      reader.readAsDataURL(file);
    }
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

  return (
    <div className="flex gap-6 h-[calc(100vh-180px)]">
      {/* Panel Izquierdo: Formulario */}
      <div className="w-1/2 overflow-y-auto pr-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Formulario de Cotización
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo */}
            <div className="space-y-2">
              <Label htmlFor="logo">Logo (Opcional)</Label>
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="cursor-pointer"
              />
              {logoUrl && (
                <div className="mt-2">
                  <img
                    src={logoUrl}
                    alt="Vista previa del logo"
                    className="h-12 w-auto object-contain border rounded p-2 bg-[#004e7c]"
                  />
                </div>
              )}
            </div>

            {/* Imagen Principal */}
            <div className="space-y-2">
              <Label htmlFor="mainImage">Imagen Principal *</Label>
              <Input
                id="mainImage"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="cursor-pointer"
              />
              {mainImage && (
                <div className="mt-2">
                  <img
                    src={mainImage}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded border"
                  />
                </div>
              )}
            </div>

            {/* Título Principal */}
            <div className="space-y-2">
              <Label htmlFor="mainTitle">Título Principal *</Label>
              <Input
                id="mainTitle"
                value={mainTitle}
                onChange={(e) => setMainTitle(e.target.value)}
                placeholder="Ej: Hotel Paradise Beach"
              />
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción *</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: 4 días y 3 noches"
              />
            </div>

            {/* Incluye - Selector Múltiple */}
            <div className="space-y-2">
              <Label>Incluye</Label>
              <div className="space-y-3 border rounded-md p-4">
                {[
                  { id: "vuelo", label: "Vuelo" },
                  { id: "traslado", label: "Traslado" },
                  { id: "hotel", label: "Hotel" },
                  { id: "actividades", label: "Actividades" },
                  { id: "asistencia-medica", label: "Asistencia Médica" }
                ].map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={item.id}
                      checked={includes.includes(item.label)}
                      onCheckedChange={(checked) => 
                        handleIncludesChange(item.label, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={item.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {item.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Estrellas del Hotel - Solo visible si Hotel está seleccionado */}
            {includes.includes("Hotel") && (
              <div className="space-y-2">
                <Label htmlFor="hotelStars">Estrellas del Hotel *</Label>
                <Input
                  id="hotelStars"
                  type="number"
                  min="1"
                  max="5"
                  value={hotelStars}
                  onChange={(e) => setHotelStars(parseInt(e.target.value) || 1)}
                />
              </div>
            )}

            {/* Plan */}
            <div className="space-y-2">
              <Label htmlFor="plan">Plan *</Label>
              <Select value={plan} onValueChange={(value: "solo" | "empaquetado") => setPlan(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solo">Solo</SelectItem>
                  <SelectItem value="empaquetado">Empaquetado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Número de Personas */}
            <div className="space-y-2">
              <Label htmlFor="numberOfPeople">Número de Personas *</Label>
              <Input
                id="numberOfPeople"
                type="number"
                min="1"
                value={numberOfPeople}
                onChange={(e) => setNumberOfPeople(parseInt(e.target.value) || 1)}
              />
            </div>

            {/* Precio */}
            <div className="space-y-2">
              <Label htmlFor="price">Precio *</Label>
              <Input
                id="price"
                value={price}
                onChange={handlePriceChange}
                placeholder="Ej: 2173600"
              />
              <p className="text-xs text-gray-500">
                El precio se formateará automáticamente con separadores de miles
              </p>
            </div>

            {/* Disclaimer */}
            <div className="space-y-2">
              <Label htmlFor="disclaimer">Términos y Condiciones / Disclaimer</Label>
              <Textarea
                id="disclaimer"
                value={disclaimer}
                onChange={(e) => setDisclaimer(e.target.value)}
                placeholder="Ej: Consulta términos y condiciones. Promoción sujeta a disponibilidad y cambio sin previo aviso. Viaja del 18 feb. 2026 a 21 feb. 2026. Impuestos incluidos."
                rows={4}
              />
            </div>

            {/* Teléfono */}
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono de Contacto *</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+57 321 456 7890"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email de Contacto *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@cosmosmayorista.com"
              />
            </div>

            {/* Botón de Descarga */}
            <Button
              onClick={handleDownload}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
              disabled={!mainTitle || !price || !phone || !email}
            >
              <Download className="w-5 h-5 mr-2" />
              Descargar Imagen
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Panel Derecho: Vista Previa */}
      <div className="w-1/2 overflow-visible bg-gray-50 p-6 flex flex-col items-center min-w-[800px]">
        <div className="sticky top-0 mb-4 bg-gray-50 pb-2 z-10">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Vista Previa
          </h3>
          <p className="text-sm text-gray-500">
            Esta es la vista previa de cómo se verá tu cotización
          </p>
        </div>
        <div className="flex justify-center pb-6">
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
  );
}
