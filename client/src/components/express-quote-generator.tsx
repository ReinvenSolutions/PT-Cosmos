import { useState, useRef, useEffect } from "react";
import { toJpeg } from "html-to-image";
import { saveAs } from "file-saver";
import { QuoteTemplate } from "./quote-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackQuote } from "@/lib/tracking";

// Logo predeterminado de COSMOS MAYORISTA
const DEFAULT_LOGO = "/images/logo/cosmos-mayorista-logo.png";

export function ExpressQuoteGenerator() {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

  // Estado del formulario
  const [hotelName, setHotelName] = useState("");
  const [duration, setDuration] = useState("4 días y 3 noches");
  const [hotelStars, setHotelStars] = useState(4);
  const [roomType, setRoomType] = useState("Estandar vista interna");
  const [mealPlan, setMealPlan] = useState("Desayuno bufet");
  const [numberOfPeople, setNumberOfPeople] = useState(2);
  const [price, setPrice] = useState("");
  const [disclaimer, setDisclaimer] = useState("");
  const [mainImage, setMainImage] = useState<string | null>(null);
  // Logo - inicializado con la ruta del logo
  const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_LOGO);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isCustomLogo, setIsCustomLogo] = useState(false);

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
        // Establecer el nuevo logo cargado por el usuario
        setLogoUrl(reader.result as string);
        setIsCustomLogo(true);
        toast({
          title: "Logo actualizado",
          description: "El logo personalizado ha sido cargado exitosamente.",
        });
      };
      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Error al cargar el logo. Se mantendrá el logo predeterminado.",
          variant: "destructive",
        });
        // Si falla, volver al logo predeterminado
        setLogoUrl(DEFAULT_LOGO);
        setIsCustomLogo(false);
      };
      reader.readAsDataURL(file);
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
          hotelName: hotelName,
          duration: duration,
          roomType: roomType,
          mealPlan: mealPlan,
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
              <p className="text-xs text-gray-500">
                Por defecto se usa el logo de Cosmos Mayorista. Puedes subir un logo personalizado si lo deseas.
              </p>
              <div className="flex items-center gap-4">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="cursor-pointer"
                />
                <div className="flex-shrink-0">
                  <img
                    key={logoUrl || 'default'} // Forzar re-render cuando cambie el logo
                    src={logoUrl || DEFAULT_LOGO}
                    alt="Vista previa del logo"
                    className="h-12 w-auto object-contain border rounded p-1 bg-[#004e7c]"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      console.error("Error loading logo:", target.src);
                      // Si falla, intentar con el logo predeterminado
                      if (target.src !== `${window.location.origin}${DEFAULT_LOGO}`) {
                        target.src = DEFAULT_LOGO;
                      }
                    }}
                  />
                </div>
              </div>
              {isCustomLogo && (
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLogoUrl(DEFAULT_LOGO);
                      setIsCustomLogo(false);
                      // Limpiar el input de archivo
                      const fileInput = document.getElementById('logo') as HTMLInputElement;
                      if (fileInput) fileInput.value = '';
                      toast({
                        title: "Logo restaurado",
                        description: "Se ha restaurado el logo predeterminado de Cosmos Mayorista.",
                      });
                    }}
                    className="text-xs"
                  >
                    Restaurar logo predeterminado
                  </Button>
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

            {/* Nombre del Hotel */}
            <div className="space-y-2">
              <Label htmlFor="hotelName">Nombre del Hotel *</Label>
              <Input
                id="hotelName"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                placeholder="Ej: Hotel Paradise Beach"
              />
            </div>

            {/* Duración */}
            <div className="space-y-2">
              <Label htmlFor="duration">Duración *</Label>
              <Input
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Ej: 4 días y 3 noches"
              />
              <p className="text-xs text-gray-500">
                Se agregará automáticamente "Hospédate por" antes de la duración
              </p>
            </div>

            {/* Estrellas del Hotel */}
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

            {/* Tipo de Habitación */}
            <div className="space-y-2">
              <Label htmlFor="roomType">Tipo de Habitación *</Label>
              <Input
                id="roomType"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                placeholder="Ej: Estandar vista interna"
              />
            </div>

            {/* Régimen Alimenticio */}
            <div className="space-y-2">
              <Label htmlFor="mealPlan">Régimen Alimenticio *</Label>
              <Input
                id="mealPlan"
                value={mealPlan}
                onChange={(e) => setMealPlan(e.target.value)}
                placeholder="Ej: Desayuno bufet"
              />
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
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ej: $ 2.173.600 COPS"
              />
              <p className="text-xs text-gray-500">
                Formato sugerido: $ 2.173.600 COPS o US$ 1,200
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
                placeholder="Ej: (57)314657-6500"
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
                placeholder="Ej: quierovivirviajandoo@gmail.com"
              />
            </div>

            {/* Botón de Descarga */}
            <Button
              onClick={handleDownload}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
              disabled={!hotelName || !price || !phone || !email}
            >
              <Download className="w-5 h-5 mr-2" />
              Descargar Imagen
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Panel Derecho: Vista Previa */}
      <div className="w-1/2 overflow-y-auto bg-gray-50 p-6">
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
            hotelName={hotelName}
            duration={duration}
            hotelStars={hotelStars}
            roomType={roomType}
            mealPlan={mealPlan}
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
