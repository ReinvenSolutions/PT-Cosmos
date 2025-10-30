import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type Destination } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, Upload, X, Send, FileText, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getDestinationImage } from "@/lib/destination-images";

export default function QuoteSummary() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [outboundImages, setOutboundImages] = useState<string[]>([]);
  const [returnImages, setReturnImages] = useState<string[]>([]);
  const [uploadingOutbound, setUploadingOutbound] = useState(false);
  const [uploadingReturn, setUploadingReturn] = useState(false);
  const [flightsAndExtras, setFlightsAndExtras] = useState("");
  const [originCity, setOriginCity] = useState("");

  const { data: destinations = [] } = useQuery<Destination[]>({
    queryKey: ["/api/destinations?isActive=true"],
  });

  useEffect(() => {
    const savedData = sessionStorage.getItem("quoteData");
    if (savedData) {
      const { destinations: destIds, startDate: start } = JSON.parse(savedData);
      setSelectedDestinations(destIds);
      setStartDate(start);
    } else {
      setLocation("/");
    }
  }, [setLocation]);

  const selectedDests = destinations.filter((d) => selectedDestinations.includes(d.id));

  const hasTurkeyDestinations = selectedDests.some((d) => d.requiresTuesday);

  const calculateEndDate = (): string => {
    if (!startDate || selectedDests.length === 0) return "";
    
    let totalDuration = selectedDests.reduce((sum, dest) => {
      return sum + (dest.duration || 0);
    }, 0);

    if (hasTurkeyDestinations) {
      totalDuration += 1;
    }

    if (totalDuration === 0) return "";

    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + totalDuration - 1);
    
    return end.toISOString().split("T")[0];
  };

  const endDate = calculateEndDate();
  
  const landPortionTotal = selectedDests.reduce((sum, dest) => {
    const basePrice = dest.basePrice ? parseFloat(dest.basePrice) : 0;
    return sum + basePrice;
  }, 0);
  
  const flightsAndExtrasValue = flightsAndExtras ? parseFloat(flightsAndExtras) : 0;
  const grandTotal = landPortionTotal + flightsAndExtrasValue;

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
    
    const message = `Hola! Quiero cotizar los siguientes destinos: ${destinationsText}. Fechas: ${startDate || "Por definir"} al ${endDate || "Por definir"}. Total: US$ ${grandTotal.toFixed(2)}`;
    
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank");
  };
  
  const handleExportPDF = async () => {
    try {
      const response = await fetch("/api/public/quote-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destinations: selectedDests.map(d => ({
            id: d.id,
            name: d.name,
            country: d.country,
            duration: d.duration,
            nights: d.nights,
            basePrice: d.basePrice || "0",
          })),
          startDate,
          endDate,
          flightsAndExtras: flightsAndExtrasValue,
          landPortionTotal,
          grandTotal,
          originCity: originCity || "",
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cotizacion-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "PDF generado",
        description: "Tu cotización ha sido descargada exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar el PDF. Intenta nuevamente.",
        variant: "destructive",
      });
    }
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
              {selectedDests.map((dest) => {
                const basePrice = dest.basePrice ? parseFloat(dest.basePrice) : 0;
                const imageUrl = getDestinationImage(dest);
                
                return (
                  <div key={dest.id} className="flex gap-4 p-3 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-blue-100">
                    {imageUrl && (
                      <div className="w-32 h-24 flex-shrink-0 rounded-md overflow-hidden">
                        <img 
                          src={imageUrl} 
                          alt={dest.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-gray-800">{dest.name}</h3>
                        <p className="text-sm text-gray-600">{dest.country}</p>
                        <Badge variant="secondary" className="mt-1">
                          {dest.duration} Días / {dest.nights} Noches
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-extrabold text-blue-600">
                          US$ {basePrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-xs text-gray-500">Porción terrestre</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <div className="border-t border-blue-200 pt-3 mt-3">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span className="text-gray-700">Subtotal Porciones Terrestres:</span>
                  <span className="text-blue-600">
                    US$ {landPortionTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
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
                <p className="font-semibold text-lg" data-testid="text-start-date">
                  {startDate ? new Date(startDate + "T00:00:00").toLocaleDateString("es-CO", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }) : "Por definir"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Fecha de Finalización (Calculada)</p>
                <p className="font-semibold text-lg" data-testid="text-end-date-summary">
                  {endDate ? new Date(endDate + "T00:00:00").toLocaleDateString("es-CO", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }) : "Por definir"}
                </p>
                {endDate && (
                  <p className="text-xs text-gray-500 mt-1">
                    Duración total: {selectedDests.reduce((sum, dest) => sum + (dest.duration || 0), 0)}{hasTurkeyDestinations && " +1"} días
                    {hasTurkeyDestinations && <span className="text-orange-600"> (incluye día de vuelo a Turquía)</span>}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Ciudad de Origen y Retorno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Ingresa las ciudades de origen y retorno (ejemplo: MED - BOG - PEI)
            </p>
            <Input
              type="text"
              placeholder="MED - BOG - PEI"
              value={originCity}
              onChange={(e) => setOriginCity(e.target.value.toUpperCase())}
              className="text-lg font-semibold"
              data-testid="input-origin-city"
            />
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

        <Card className="mb-6 bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Vuelos, Asistencia y Comisión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Ingresa el valor total de: Vuelos + Asistencia al Viajero + Comisión
            </p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-gray-700">US$</span>
              <Input
                type="number"
                placeholder="0.00"
                value={flightsAndExtras}
                onChange={(e) => setFlightsAndExtras(e.target.value)}
                className="text-lg font-semibold"
                data-testid="input-flights-extras"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm opacity-90 mb-1">Precio Total de la Cotización</div>
                <div className="text-4xl font-extrabold">
                  US$ {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-right text-sm opacity-90">
                <div>Porciones Terrestres: US$ {landPortionTotal.toFixed(2)}</div>
                <div>Vuelos y Extras: US$ {flightsAndExtrasValue.toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            size="lg"
            variant="outline"
            className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
            onClick={handleExportPDF}
            data-testid="button-export-pdf"
          >
            <FileText className="w-5 h-5 mr-2" />
            Exportar Cotización (PDF)
          </Button>
          
          <Button
            size="lg"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={handleSendWhatsApp}
            data-testid="button-send-whatsapp"
          >
            <Send className="w-5 h-5 mr-2" />
            Enviar por WhatsApp
          </Button>
        </div>
      </main>
    </div>
  );
}
