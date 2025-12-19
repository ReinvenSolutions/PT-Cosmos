import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, X, Save, Star, Download } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatUSD, formatDate } from "@shared/schema";

interface Client {
  id: string;
  name: string;
  email: string;
}

interface Upgrade {
  code: string;
  name: string;
  description?: string;
  price: number;
}

interface Destination {
  id: string;
  name: string;
  country: string;
  duration: number;
  upgrades?: Upgrade[];
}

interface QuoteDestination {
  id: string;
  destinationId: string;
  startDate: string;
  passengers: number;
  price: string;
  destination: Destination;
}

interface Quote {
  id: string;
  clientId: string;
  totalPrice: string;
  originCity: string | null;
  flightsAndExtras: string | null;
  outboundFlightImages: string[] | null;
  returnFlightImages: string[] | null;
  includeFlights: boolean | null;
  outboundCabinBaggage: boolean | null;
  outboundHoldBaggage: boolean | null;
  returnCabinBaggage: boolean | null;
  returnHoldBaggage: boolean | null;
  turkeyUpgrade: string | null;
  italiaUpgrade: string | null;
  trm: string | null;
  customFilename: string | null;
  minPayment: string | null;
  minPaymentCOP: string | null;
  finalPrice: string | null;
  finalPriceCOP: string | null;
  finalPriceCurrency: string | null;
  status: string;
  client: Client;
  destinations: QuoteDestination[];
}

export default function QuoteEdit() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/advisor/quotes/:id/edit");
  const quoteId = params?.id;
  const { toast } = useToast();

  const [clientId, setClientId] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [originCity, setOriginCity] = useState("");
  const [flightsAndExtras, setFlightsAndExtras] = useState("");
  const [outboundImages, setOutboundImages] = useState<string[]>([]);
  const [returnImages, setReturnImages] = useState<string[]>([]);
  const [uploadingOutbound, setUploadingOutbound] = useState(false);
  const [uploadingReturn, setUploadingReturn] = useState(false);
  const [includeFlights, setIncludeFlights] = useState(false);
  const [outboundCabinBaggage, setOutboundCabinBaggage] = useState(false);
  const [outboundHoldBaggage, setOutboundHoldBaggage] = useState(false);
  const [returnCabinBaggage, setReturnCabinBaggage] = useState(false);
  const [returnHoldBaggage, setReturnHoldBaggage] = useState(false);
  const [turkeyUpgrade, setTurkeyUpgrade] = useState<string>("");
  const [italiaUpgrade, setItaliaUpgrade] = useState<string>("");
  
  // New fields state
  const [trm, setTrm] = useState("");
  const [customFilename, setCustomFilename] = useState("");
  const [minPayment, setMinPayment] = useState("");
  const [minPaymentCOP, setMinPaymentCOP] = useState("");
  const [finalPrice, setFinalPrice] = useState("");
  const [finalPriceCOP, setFinalPriceCOP] = useState("");
  const [finalPriceCurrency, setFinalPriceCurrency] = useState("USD");

  const { data: quote, isLoading } = useQuery<Quote>({
    queryKey: ["/api/quotes", quoteId],
    queryFn: async () => {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error al cargar la cotización");
      return response.json();
    },
    enabled: !!quoteId,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/admin/clients"],
    queryFn: async () => {
      const response = await fetch("/api/admin/clients", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error al cargar clientes");
      return response.json();
    },
  });

  useEffect(() => {
    if (quote) {
      setClientId(quote.clientId);
      setTotalPrice(quote.totalPrice);
      setOriginCity(quote.originCity || "");
      setFlightsAndExtras(quote.flightsAndExtras || "");
      setOutboundImages(quote.outboundFlightImages || []);
      setReturnImages(quote.returnFlightImages || []);
      setIncludeFlights(quote.includeFlights ?? false);
      setOutboundCabinBaggage(quote.outboundCabinBaggage ?? false);
      setOutboundHoldBaggage(quote.outboundHoldBaggage ?? false);
      setReturnCabinBaggage(quote.returnCabinBaggage ?? false);
      setReturnHoldBaggage(quote.returnHoldBaggage ?? false);
      setTurkeyUpgrade(quote.turkeyUpgrade || "");
      setItaliaUpgrade(quote.italiaUpgrade || "");
      
      // Set new fields
      setTrm(quote.trm || "");
      setCustomFilename(quote.customFilename || "");
      setMinPayment(quote.minPayment || "");
      setMinPaymentCOP(quote.minPaymentCOP || "");
      setFinalPrice(quote.finalPrice || "");
      setFinalPriceCOP(quote.finalPriceCOP || "");
      setFinalPriceCurrency(quote.finalPriceCurrency || "USD");
    }
  }, [quote]);

  const updateQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error al actualizar la cotización");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cotización actualizada",
        description: "Los cambios se han guardado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId] });
      setLocation(`/advisor/quotes/${quoteId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la cotización",
        variant: "destructive",
      });
    },
  });

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
          credentials: "include",
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
          credentials: "include",
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

  const hasTurkeyEsencial = quote?.destinations.some(qd => qd.destination.name === "Turquía Esencial") || false;
  
  const hasItaliaTuristica = quote?.destinations.some(qd => qd.destination.name === "Italia Turística - Euro Express") || false;
  const italiaDestination = quote?.destinations.find(qd => qd.destination.name === "Italia Turística - Euro Express")?.destination;
  const italiaUpgrades = italiaDestination?.upgrades || [];

  const getTurkeyUpgradeCost = () => {
    if (!hasTurkeyEsencial || !turkeyUpgrade) return 0;
    if (turkeyUpgrade === "option1") return 500;
    if (turkeyUpgrade === "option2") return 770;
    if (turkeyUpgrade === "option3") return 1100;
    return 0;
  };

  const getItaliaUpgradeCost = () => {
    if (!hasItaliaTuristica || !italiaUpgrade) return 0;
    const upgrade = italiaUpgrades.find(u => u.code === italiaUpgrade);
    return upgrade ? Number(upgrade.price) : 0;
  };

  const handleDownloadPDF = async () => {
    if (!quoteId) return;
    
    try {
      const response = await fetch(`/api/quotes/${quoteId}/pdf`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Error al descargar el PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const filename = customFilename 
        ? (customFilename.endsWith('.pdf') ? customFilename : `${customFilename}.pdf`)
        : `cotizacion-${quoteId}.pdf`;
        
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error downloading PDF:", err);
      toast({
        title: "Error",
        description: "No se pudo descargar el PDF",
        variant: "destructive",
      });
    }
  };

  const handleSave = () => {
    if (!clientId || !totalPrice) {
      toast({
        title: "Error",
        description: "El cliente y el precio total son obligatorios",
        variant: "destructive",
      });
      return;
    }

    if (!quote) return;

    const updateData = {
      clientId,
      totalPrice: parseFloat(totalPrice),
      originCity: originCity || null,
      flightsAndExtras: flightsAndExtras ? parseFloat(flightsAndExtras) : null,
      outboundFlightImages: outboundImages.length > 0 ? outboundImages : null,
      returnFlightImages: returnImages.length > 0 ? returnImages : null,
      includeFlights,
      outboundCabinBaggage,
      outboundHoldBaggage,
      returnCabinBaggage,
      returnHoldBaggage,
      turkeyUpgrade: turkeyUpgrade || null,
      italiaUpgrade: italiaUpgrade || null,
      trm: trm || null,
      customFilename: customFilename || null,
      minPayment: minPayment || null,
      minPaymentCOP: minPaymentCOP || null,
      finalPrice: finalPrice || null,
      finalPriceCOP: finalPriceCOP || null,
      finalPriceCurrency: finalPriceCurrency || "USD",
      destinations: quote.destinations.map(qd => ({
        destinationId: qd.destinationId,
        startDate: qd.startDate.split("T")[0],
        passengers: qd.passengers,
        price: parseFloat(qd.price),
      })),
    };

    updateQuoteMutation.mutate(updateData);
  };

  if (isLoading || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center gap-4 p-4 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1">
              <h1 className="text-xl font-semibold">Editar Cotización</h1>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setLocation(`/advisor/quotes/${quoteId}`)}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateQuoteMutation.isPending}
                  data-testid="button-save"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateQuoteMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadPDF}
                  data-testid="button-download-pdf"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger data-testid="select-client">
                      <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} ({client.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Precio Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">US$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={totalPrice}
                      onChange={(e) => setTotalPrice(e.target.value)}
                      data-testid="input-total-price"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ciudad de Origen y Retorno</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="text"
                    placeholder="MED - BOG - PEI"
                    value={originCity}
                    onChange={(e) => setOriginCity(e.target.value.toUpperCase())}
                    data-testid="input-origin-city"
                  />
                </CardContent>
              </Card>

              {hasTurkeyEsencial && (
                <Card className="border-orange-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-600">
                      <Star className="w-5 h-5" />
                      Mejora tu Plan Turquía Esencial
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Selecciona una opción para mejorar tu experiencia en Turquía:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover-elevate">
                        <Checkbox
                          id="upgrade-option1"
                          checked={turkeyUpgrade === "option1"}
                          onCheckedChange={(checked) => setTurkeyUpgrade(checked ? "option1" : "")}
                          data-testid="checkbox-upgrade-option1"
                        />
                        <div className="flex-1">
                        <label htmlFor="upgrade-option1" className="font-semibold cursor-pointer">
                          + 500 USD
                        </label>
                        <p className="text-sm text-gray-600">8 almuerzos + Tour por el Bósforo + Tour Estambul Clásico</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover-elevate">
                        <Checkbox
                          id="upgrade-option2"
                          checked={turkeyUpgrade === "option2"}
                          onCheckedChange={(checked) => setTurkeyUpgrade(checked ? "option2" : "")}
                          data-testid="checkbox-upgrade-option2"
                        />
                        <div className="flex-1">
                        <label htmlFor="upgrade-option2" className="font-semibold cursor-pointer">
                          + 770 USD
                        </label>
                        <p className="text-sm text-gray-600">Hotel céntrico Estambul + 8 almuerzos + Tour por el Bósforo + Tour Estambul Clásico</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover-elevate">
                        <Checkbox
                          id="upgrade-option3"
                          checked={turkeyUpgrade === "option3"}
                          onCheckedChange={(checked) => setTurkeyUpgrade(checked ? "option3" : "")}
                          data-testid="checkbox-upgrade-option3"
                        />
                        <div className="flex-1">
                        <label htmlFor="upgrade-option3" className="font-semibold cursor-pointer">
                          + 1,100 USD
                        </label>
                        <p className="text-sm text-gray-600">Hotel céntrico Estambul + Hotel cueva Capadocia + 8 almuerzos + Tour por el Bósforo + Tour Estambul Clásico</p>
                        </div>
                      </div>
                    </div>
                    {turkeyUpgrade && (
                      <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <p className="text-sm font-semibold text-orange-700">
                          Mejora seleccionada: +US$ {formatUSD(getTurkeyUpgradeCost())}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {hasItaliaTuristica && italiaUpgrades.length > 0 && (
                <Card className="border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-600">
                      <Star className="w-5 h-5" />
                      Mejora tu Plan Italia Turística
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Selecciona una opción para mejorar tu experiencia en Italia:
                    </p>
                    <div className="space-y-3">
                      {italiaUpgrades.map((upgrade) => (
                        <div key={upgrade.code} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover-elevate">
                          <Checkbox
                            id={`upgrade-${upgrade.code}`}
                            checked={italiaUpgrade === upgrade.code}
                            onCheckedChange={(checked) => setItaliaUpgrade(checked ? upgrade.code : "")}
                          />
                          <div className="flex-1">
                            <label htmlFor={`upgrade-${upgrade.code}`} className="font-semibold cursor-pointer">
                              + {formatUSD(Number(upgrade.price))} USD
                            </label>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">{upgrade.name}</span>
                              {upgrade.description && ` - ${upgrade.description}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {italiaUpgrade && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-semibold text-blue-700">
                          Mejora seleccionada: +US$ {formatUSD(getItaliaUpgradeCost())}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Vuelos, Asistencia y Comisión</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">US$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={flightsAndExtras}
                      onChange={(e) => setFlightsAndExtras(e.target.value)}
                      data-testid="input-flights-extras"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>TRM (Tasa Representativa del Mercado)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={trm}
                      onChange={(e) => setTrm(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Se sumarán 30 COP automáticamente al valor ingresado.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Precio Final de Venta PVP</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Moneda</Label>
                      <Select value={finalPriceCurrency || "USD"} onValueChange={setFinalPriceCurrency}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD - Dólares</SelectItem>
                          <SelectItem value="COP">COP - Pesos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Valor</Label>
                      <Input
                        type="text"
                        value={finalPrice}
                        onChange={(e) => setFinalPrice(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pago Mínimo para Separar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Valor en USD</Label>
                        <Input
                          type="text"
                          value={minPayment}
                          onChange={(e) => setMinPayment(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>Valor en COP</Label>
                        <Input
                          type="text"
                          value={minPaymentCOP}
                          onChange={(e) => setMinPaymentCOP(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Si se deja vacío, se calculará automáticamente.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Nombre del Archivo (Opcional)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="text"
                    value={customFilename}
                    onChange={(e) => setCustomFilename(e.target.value)}
                    placeholder="Ej: Cotización Familia Perez"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Adjuntar Vuelos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="include-flights"
                      checked={includeFlights}
                      onCheckedChange={(checked) => setIncludeFlights(checked as boolean)}
                      data-testid="checkbox-include-flights"
                    />
                    <Label htmlFor="include-flights" className="cursor-pointer">
                      Incluir páginas de vuelos en el PDF
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Si no seleccionas esta opción, el PDF funcionará como una cotización de porción terrestre sin páginas de vuelos.
                  </p>
                </CardContent>
              </Card>

              {includeFlights && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Vuelos de Ida</CardTitle>
                    </CardHeader>
                    <CardContent>
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

                      <div className="mt-4 space-y-3 pt-4 border-t">
                        <p className="text-sm font-medium">Equipajes Incluidos:</p>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="outbound-cabin-baggage"
                            checked={outboundCabinBaggage}
                            onCheckedChange={(checked) => setOutboundCabinBaggage(checked as boolean)}
                            data-testid="checkbox-outbound-cabin"
                          />
                          <Label htmlFor="outbound-cabin-baggage" className="cursor-pointer">
                            Equipaje de cabina 10kg
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="outbound-hold-baggage"
                            checked={outboundHoldBaggage}
                            onCheckedChange={(checked) => setOutboundHoldBaggage(checked as boolean)}
                            data-testid="checkbox-outbound-hold"
                          />
                          <Label htmlFor="outbound-hold-baggage" className="cursor-pointer">
                            Equipaje de bodega 23kg
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          * Personal 8kg siempre está incluido
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Vuelos de Regreso</CardTitle>
                    </CardHeader>
                    <CardContent>
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

                      <div className="mt-4 space-y-3 pt-4 border-t">
                        <p className="text-sm font-medium">Equipajes Incluidos:</p>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="return-cabin-baggage"
                            checked={returnCabinBaggage}
                            onCheckedChange={(checked) => setReturnCabinBaggage(checked as boolean)}
                            data-testid="checkbox-return-cabin"
                          />
                          <Label htmlFor="return-cabin-baggage" className="cursor-pointer">
                            Equipaje de cabina 10kg
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="return-hold-baggage"
                            checked={returnHoldBaggage}
                            onCheckedChange={(checked) => setReturnHoldBaggage(checked as boolean)}
                            data-testid="checkbox-return-hold"
                          />
                          <Label htmlFor="return-hold-baggage" className="cursor-pointer">
                            Equipaje de bodega 23kg
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          * Personal 8kg siempre está incluido
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Destinos Seleccionados</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Los destinos, fechas y pasajeros están bloqueados. Para cambiarlos, crea una nueva cotización.
                  </p>
                  <div className="space-y-3">
                    {quote.destinations.map((qd, index) => (
                      <div key={qd.id} className="p-3 border rounded-lg bg-muted/50">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">
                              {index + 1}. {qd.destination.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {qd.destination.country} • {qd.destination.duration} días
                            </p>
                            <p className="text-sm mt-1">
                              Fecha: {formatDate(qd.startDate)} • Pasajeros: {qd.passengers}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${formatUSD(qd.price)}</p>
                            <p className="text-xs text-muted-foreground">por persona</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
