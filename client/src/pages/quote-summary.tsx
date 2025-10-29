import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type Destination } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Upload, X, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function QuoteSummary() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [outboundImages, setOutboundImages] = useState<string[]>([]);
  const [returnImages, setReturnImages] = useState<string[]>([]);
  const [uploadingOutbound, setUploadingOutbound] = useState(false);
  const [uploadingReturn, setUploadingReturn] = useState(false);

  const { data: destinations = [] } = useQuery<Destination[]>({
    queryKey: ["/api/destinations?isActive=true"],
  });

  useEffect(() => {
    const savedData = sessionStorage.getItem("quoteData");
    if (savedData) {
      const { destinations: destIds, startDate: start, endDate: end } = JSON.parse(savedData);
      setSelectedDestinations(destIds);
      setStartDate(start);
      setEndDate(end);
    } else {
      setLocation("/");
    }
  }, [setLocation]);

  const selectedDests = destinations.filter((d) => selectedDestinations.includes(d.id));

  const handleOutboundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingOutbound(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error("Upload failed");
        }
        
        const { url } = await response.json();
        uploadedUrls.push(url);
      }
      
      setOutboundImages([...outboundImages, ...uploadedUrls]);
      
      toast({
        title: "Imágenes subidas",
        description: `${files.length} imagen(es) del vuelo de ida guardadas`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron subir algunas imágenes.",
        variant: "destructive",
      });
    } finally {
      setUploadingOutbound(false);
      e.target.value = "";
    }
  };

  const handleReturnUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingReturn(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error("Upload failed");
        }
        
        const { url } = await response.json();
        uploadedUrls.push(url);
      }
      
      setReturnImages([...returnImages, ...uploadedUrls]);
      
      toast({
        title: "Imágenes subidas",
        description: `${files.length} imagen(es) del vuelo de regreso guardadas`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron subir algunas imágenes.",
        variant: "destructive",
      });
    } finally {
      setUploadingReturn(false);
      e.target.value = "";
    }
  };

  const handleSendWhatsApp = () => {
    const whatsappNumber = "573146576500";
    const destinationsText = selectedDests
      .map((d) => `${d.name} (${d.duration}D/${d.nights}N)`)
      .join(", ");
    
    const message = `Hola! Quiero cotizar los siguientes destinos: ${destinationsText}. Fechas: ${startDate || "Por definir"} al ${endDate || "Por definir"}.`;
    
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank");
  };

  if (selectedDests.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-extrabold text-blue-600 tracking-tight">
            Cosmos <span className="text-blue-400 font-light">Industria de Viajes</span>
          </h1>
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            ← Volver
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-extrabold text-gray-800 mb-2">Resumen de tu Cotización</h2>
          <p className="text-gray-600">Revisa los detalles y agrega la información de tus vuelos</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Destinos Seleccionados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedDests.map((dest) => (
                <div key={dest.id} className="flex items-start justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-gray-800">{dest.name}</h3>
                    <p className="text-sm text-gray-600">{dest.country}</p>
                    <Badge variant="secondary" className="mt-1">
                      {dest.duration} Días / {dest.nights} Noches
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Fechas del Viaje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Fecha de Inicio</p>
                <p className="font-semibold text-lg">{startDate || "Por definir"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Fecha de Finalización</p>
                <p className="font-semibold text-lg">{endDate || "Por definir"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Vuelos de Ida</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Sube capturas de los detalles del vuelo de ida (puedes subir múltiples imágenes)
            </p>
            {outboundImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3">
                {outboundImages.map((url, idx) => (
                  <div key={idx} className="relative border rounded-md overflow-hidden">
                    <img 
                      src={url} 
                      alt={`Vuelo ida ${idx + 1}`} 
                      className="w-full h-32 object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => setOutboundImages(outboundImages.filter((_, i) => i !== idx))}
                      data-testid={`button-remove-outbound-${idx}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div>
              <input
                type="file"
                id="outbound-flight-images"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleOutboundUpload}
                data-testid="input-outbound-images"
              />
              <label htmlFor="outbound-flight-images">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={uploadingOutbound}
                  asChild
                >
                  <span>
                    {uploadingOutbound ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Subir Imágenes de Vuelo de Ida
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Vuelos de Regreso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Sube capturas de los detalles del vuelo de regreso (puedes subir múltiples imágenes)
            </p>
            {returnImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3">
                {returnImages.map((url, idx) => (
                  <div key={idx} className="relative border rounded-md overflow-hidden">
                    <img 
                      src={url} 
                      alt={`Vuelo regreso ${idx + 1}`} 
                      className="w-full h-32 object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => setReturnImages(returnImages.filter((_, i) => i !== idx))}
                      data-testid={`button-remove-return-${idx}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div>
              <input
                type="file"
                id="return-flight-images"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleReturnUpload}
                data-testid="input-return-images"
              />
              <label htmlFor="return-flight-images">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={uploadingReturn}
                  asChild
                >
                  <span>
                    {uploadingReturn ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Subir Imágenes de Vuelo de Regreso
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>

        <Button
          size="lg"
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          onClick={handleSendWhatsApp}
          data-testid="button-send-whatsapp"
        >
          <Send className="w-5 h-5 mr-2" />
          Enviar Cotización por WhatsApp
        </Button>
      </main>
    </div>
  );
}
