import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Destination, formatUSD, formatDate } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, MapPin, Upload, X, Send, FileText, DollarSign, Save, Star, ChevronDown, Plane, MessageCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getDestinationImage } from "@/lib/destination-images";
import { useAuth } from "@/contexts/AuthContext";
import { DatePicker } from "@/components/ui/date-picker";
import { isTuesday } from "date-fns";
import { isTurkeyHoliday } from "@/lib/turkey-holidays";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { PDFLoadingModal } from "@/components/pdf-loading-modal";

// WhatsApp Icon Component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

export default function QuoteSummary() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [outboundImages, setOutboundImages] = useState<string[]>([]);
  const [returnImages, setReturnImages] = useState<string[]>([]);
  const [domesticFlightImages, setDomesticFlightImages] = useState<string[]>([]);
  const [connectionFlightImages, setConnectionFlightImages] = useState<string[]>([]);
  const [uploadingOutbound, setUploadingOutbound] = useState(false);
  const [uploadingReturn, setUploadingReturn] = useState(false);
  const [uploadingDomesticFlight, setUploadingDomesticFlight] = useState(false);
  const [uploadingConnectionFlight, setUploadingConnectionFlight] = useState(false);
  const [flightsCost, setFlightsCost] = useState("");
  const [assistanceCost, setAssistanceCost] = useState("");
  const [inputCurrencyFlights, setInputCurrencyFlights] = useState<"USD" | "COP">("USD");
  const [inputCurrencyAssistance, setInputCurrencyAssistance] = useState<"USD" | "COP">("USD");
  const [inputCurrencyFinal, setInputCurrencyFinal] = useState<"USD" | "COP">("USD");
  const [originCity, setOriginCity] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [outboundCabinBaggage, setOutboundCabinBaggage] = useState(false);
  const [outboundHoldBaggage, setOutboundHoldBaggage] = useState(false);
  const [returnCabinBaggage, setReturnCabinBaggage] = useState(false);
  const [returnHoldBaggage, setReturnHoldBaggage] = useState(false);
  const [domesticCabinBaggage, setDomesticCabinBaggage] = useState(false);
  const [domesticHoldBaggage, setDomesticHoldBaggage] = useState(false);
  const [connectionCabinBaggage, setConnectionCabinBaggage] = useState(false);
  const [connectionHoldBaggage, setConnectionHoldBaggage] = useState(false);
  const [turkeyUpgrade, setTurkeyUpgrade] = useState<string>("");
  const [italiaUpgrade, setItaliaUpgrade] = useState<string>("");
  const [granTourUpgrade, setGranTourUpgrade] = useState<string>("");
  const [trm, setTrm] = useState("");
  const [finalPrice, setFinalPrice] = useState("");
  const [minPayment, setMinPayment] = useState("");
  const [customFilename, setCustomFilename] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPDFComplete, setIsPDFComplete] = useState(false);
  const pdfCompletionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // New Client State
  const [activeTab, setActiveTab] = useState("existing");
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");

  const { data: destinations = [] } = useQuery<Destination[]>({
    queryKey: ["/api/destinations?isActive=true"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/admin/clients"],
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/admin/clients", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      toast({
        title: "Cliente creado",
        description: "El cliente ha sido creado exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear cliente",
        description: error.message || "Ha ocurrido un error",
        variant: "destructive",
      });
    },
  });

  const saveQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/quotes", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Cotización guardada",
        description: "La cotización se ha guardado exitosamente",
      });
      setShowSaveDialog(false);
      setLocation("/advisor");
    },
    onError: (error: any) => {
      toast({
        title: "Error al guardar cotización",
        description: error.message || "Ha ocurrido un error",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const savedData = sessionStorage.getItem("quoteData");
    if (savedData) {
      const { destinations: destIds, startDate: start } = JSON.parse(savedData);
      setSelectedDestinations(destIds);
      
      // Parsear fecha en zona horaria local para evitar problemas de UTC
      if (start) {
        const [year, month, day] = start.split('-').map(Number);
        setStartDate(new Date(year, month - 1, day));
      } else {
        setStartDate(undefined);
      }
    } else {
      setLocation("/");
    }
  }, [setLocation]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (pdfCompletionTimeoutRef.current) {
        clearTimeout(pdfCompletionTimeoutRef.current);
      }
    };
  }, []);

  const selectedDests = destinations.filter((d) => selectedDestinations.includes(d.id));

  const hasTurkeyDestinations = selectedDests.some((d) => d.requiresTuesday);
  const hasTurkeyEsencial = selectedDests.some((d) => d.name === "Turquía Esencial");
  const hasGranTourEuropa = selectedDests.some((d) => d.name === "Gran Tour de Europa");
  const hasDubaiMaravilloso = selectedDests.some((d) => d.name === "DUBAI Maravilloso");
  
  // Detectar cualquier destino de Turquía
  const hasTurkey = selectedDests.some((d) => 
    d.country?.toLowerCase().includes('turquía') || 
    d.country?.toLowerCase().includes('turquia') ||
    d.name.toLowerCase().includes('turquía') ||
    d.name.toLowerCase().includes('turquia')
  );
  
  // Detectar cualquier destino de Dubai o Emiratos
  const hasDubaiOrEmirates = selectedDests.some((d) => 
    d.country?.toLowerCase().includes('emiratos') ||
    d.country?.toLowerCase().includes('emirates') ||
    d.name.toLowerCase().includes('dubai') ||
    d.name.toLowerCase().includes('emiratos')
  );
  
  // Mostrar vuelo de conexión si hay combinación de Turquía + Dubai/Emiratos
  const showConnectionFlight = hasTurkey && hasDubaiOrEmirates;
  
  // Debug logs
  console.log('🔍 Connection Flight Debug:', {
    selectedDestsCount: selectedDests.length,
    selectedDestsNames: selectedDests.map(d => d.name),
    hasTurkey,
    hasDubaiOrEmirates,
    showConnectionFlight,
    countries: selectedDests.map(d => d.country)
  });
  
  const hasItaliaTuristica = selectedDests.some((d) => d.name === "Italia Turística - Euro Express");
  const italiaDestination = selectedDests.find((d) => d.name === "Italia Turística - Euro Express");
  const italiaUpgrades = italiaDestination?.upgrades || [];
  
  const granTourDestination = selectedDests.find((d) => d.name === "Gran Tour de Europa");
  const granTourUpgrades = granTourDestination?.upgrades || [];

  const hasAllowedDaysRestriction = selectedDests.some((d) => d.allowedDays && d.allowedDays.length > 0);
  const allowedDaysDestination = selectedDests.find((d) => d.allowedDays && d.allowedDays.length > 0);

  const isAllowedDay = (date: Date, allowedDays: string[]): boolean => {
    const dayOfWeek = date.getDay();
    const dayNames: Record<number, string> = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday'
    };
    return allowedDays.includes(dayNames[dayOfWeek]);
  };

  const disableDates = (date: Date) => {
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) {
      return true;
    }
    
    if (hasAllowedDaysRestriction && allowedDaysDestination?.allowedDays) {
      // If priceTiers exist with specific dates, only allow those exact dates
      if (allowedDaysDestination.priceTiers && allowedDaysDestination.priceTiers.length > 0) {
        const dateStr = date.toISOString().split('T')[0];
        
        // Check if this exact date exists in priceTiers
        const hasExactDate = allowedDaysDestination.priceTiers.some(tier => tier.endDate === dateStr);
        
        // Only enable dates that are in the priceTiers list
        return !hasExactDate;
      }
      
      // Otherwise, just check if it's an allowed day of the week
      if (!isAllowedDay(date, allowedDaysDestination.allowedDays)) {
        return true;
      }
      
      return false;
    }
    
    // For Turkey Esencial, allow Tuesday (flight day) or Wednesday (direct arrival)
    if (hasTurkeyEsencial) {
      if (isTurkeyHoliday(date)) {
        return true;
      }
      const dayOfWeek = date.getDay();
      // Allow Tuesday (2) for Colombia flights and Wednesday (3) for direct arrivals
      return !(dayOfWeek === 2 || dayOfWeek === 3);
    }
    
    // For Gran Tour de Europa, allow Sunday (flight day) or Monday (direct arrival)
    if (hasGranTourEuropa) {
      const dayOfWeek = date.getDay();
      // Allow Sunday (0) for Colombia flights and Monday (1) for direct arrivals
      return !(dayOfWeek === 0 || dayOfWeek === 1);
    }
    
    if (hasTurkeyDestinations) {
      return !isTuesday(date);
    }
    
    return false;
  };

  const calculateEndDate = (): string => {
    if (!startDate || selectedDests.length === 0) return "";
    
    let totalDuration = selectedDests.reduce((sum, dest) => {
      let duration = dest.duration || 0;
      
      // Ajuste especial para Turquía Esencial
      if (dest.name === "Turquía Esencial") {
        const dayOfWeek = startDate.getDay();
        // Si es martes (día 2): vuelo desde Colombia, son 11 días
        // Si es miércoles (día 3): llegada directa, son 10 días
        if (dayOfWeek === 2) {
          duration = 11; // Martes: incluye día de vuelo
        } else if (dayOfWeek === 3) {
          duration = 10; // Miércoles: llegada directa
        }
      }
      
      // Ajuste especial para Gran Tour de Europa
      if (dest.name === "Gran Tour de Europa") {
        const dayOfWeek = startDate.getDay();
        // Si es domingo (día 0): vuelo desde Colombia, son 17 días
        // Si es lunes (día 1): llegada directa, son 16 días
        if (dayOfWeek === 0) {
          duration = 17; // Domingo: incluye día de vuelo
        } else if (dayOfWeek === 1) {
          duration = 16; // Lunes: llegada directa
        }
      }
      
      return sum + duration;
    }, 0);

    // Ajuste para combinado Turquía + Dubai: Restar 1 día por el vuelo de conexión/solapamiento
    if (hasTurkeyEsencial && hasDubaiMaravilloso) {
      totalDuration -= 1;
    }

    // No agregar día extra si ya se ajustó en Turquía o Gran Tour
    const hasTurkeyEsencialAdjusted = selectedDests.some(d => 
      d.name === "Turquía Esencial" && (startDate.getDay() === 2 || startDate.getDay() === 3)
    );
    
    if (hasTurkeyDestinations && !hasTurkeyEsencialAdjusted) {
      totalDuration += 1;
    }

    if (totalDuration === 0) return "";

    // Convert startDate to YYYY-MM-DD string to avoid timezone issues
    const startDateStr = startDate.toISOString().split("T")[0];
    const [year, month, day] = startDateStr.split('-').map(Number);
    
    // Create a new date in local timezone
    const start = new Date(year, month - 1, day);
    const end = new Date(start);
    end.setDate(end.getDate() + totalDuration - 1);
    
    // Format as YYYY-MM-DD
    const endYear = end.getFullYear();
    const endMonth = String(end.getMonth() + 1).padStart(2, '0');
    const endDay = String(end.getDate()).padStart(2, '0');
    
    return `${endYear}-${endMonth}-${endDay}`;
  };

  const endDate = calculateEndDate();

  // Calculate display duration (same logic as calculateEndDate but returning number)
  const calculateDisplayDuration = (): number => {
    if (!startDate || selectedDests.length === 0) return 0;
    
    let totalDuration = selectedDests.reduce((sum, dest) => {
      let duration = dest.duration || 0;
      
      if (dest.name === "Turquía Esencial") {
        const dayOfWeek = startDate.getDay();
        if (dayOfWeek === 2) duration = 11;
        else if (dayOfWeek === 3) duration = 10;
      }
      
      if (dest.name === "Gran Tour de Europa") {
        const dayOfWeek = startDate.getDay();
        if (dayOfWeek === 0) duration = 17;
        else if (dayOfWeek === 1) duration = 16;
      }
      
      return sum + duration;
    }, 0);

    if (hasTurkeyEsencial && hasDubaiMaravilloso) {
      totalDuration -= 1;
    }

    const hasTurkeyEsencialAdjusted = selectedDests.some(d => 
      d.name === "Turquía Esencial" && (startDate.getDay() === 2 || startDate.getDay() === 3)
    );
    
    if (hasTurkeyDestinations && !hasTurkeyEsencialAdjusted) {
      totalDuration += 1;
    }

    return totalDuration;
  };

  const displayDuration = calculateDisplayDuration();
  
  const getPriceForDate = (dest: Destination, date: Date | undefined): number => {
    if (!date || !dest.priceTiers || dest.priceTiers.length === 0) {
      return dest.basePrice ? parseFloat(dest.basePrice) : 0;
    }
    
    const dateStr = date.toISOString().split('T')[0];
    
    // Find the appropriate price tier
    for (const tier of dest.priceTiers) {
      if (dateStr <= tier.endDate) {
        return parseFloat(tier.price);
      }
    }
    
    // If no tier matches, return the last tier's price
    const lastTier = dest.priceTiers[dest.priceTiers.length - 1];
    return parseFloat(lastTier.price);
  };
  
  const landPortionPerPerson = selectedDests.reduce((sum, dest) => {
    const price = getPriceForDate(dest, startDate);
    return sum + price;
  }, 0);
  
  const landPortionTotal = landPortionPerPerson * passengers;
  
  const trmValue = trm ? parseFloat(trm) : 0;
  const effectiveTrm = trmValue > 0 ? trmValue + 30 : 0;

  const formatAllowedDays = (days: string[]): string => {
    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayMapSpanish: Record<string, string> = {
      'monday': 'Lunes',
      'tuesday': 'Martes',
      'wednesday': 'Miércoles',
      'thursday': 'Jueves',
      'friday': 'Viernes',
      'saturday': 'Sábado',
      'sunday': 'Domingo'
    };
    
    // Sort days by their order in the week
    const sortedDays = days.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
    
    // Check for consecutive days to create ranges
    if (sortedDays.length >= 5) {
      const firstDay = dayMapSpanish[sortedDays[0]];
      const lastDay = dayMapSpanish[sortedDays[sortedDays.length - 1]];
      return `${firstDay} a ${lastDay}`;
    }
    
    // For few days, list them
    return sortedDays.map(d => dayMapSpanish[d]).join(' y ');
  };

  // Auto-switch to COP when TRM is entered
  useEffect(() => {
    if (trmValue > 0) {
      setInputCurrencyFlights("COP");
      setInputCurrencyAssistance("COP");
      setInputCurrencyFinal("COP");
    } else {
      setInputCurrencyFlights("USD");
      setInputCurrencyAssistance("USD");
      setInputCurrencyFinal("USD");
    }
  }, [trmValue > 0]);

  const formatNumber = (value: string) => {
    const clean = value.replace(/[^\d.]/g, "");
    if (!clean) return "";
    const parts = clean.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  const parseNumber = (value: string) => {
    return parseFloat(value.replace(/,/g, "")) || 0;
  };

  const getUSDValue = (value: string, currency: "USD" | "COP") => {
    const num = parseNumber(value);
    if (currency === "COP" && effectiveTrm > 0) {
      return num / effectiveTrm;
    }
    return num;
  };

  const flightsCostUSD = getUSDValue(flightsCost, inputCurrencyFlights);
  const assistanceCostUSD = getUSDValue(assistanceCost, inputCurrencyAssistance);
  const flightsAndExtrasValue = flightsCostUSD + assistanceCostUSD;
  
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
  
  const getGranTourUpgradeCost = () => {
    if (!hasGranTourEuropa || !granTourUpgrade) return 0;
    const upgrade = granTourUpgrades.find(u => u.code === granTourUpgrade);
    return upgrade ? Number(upgrade.price) : 0;
  };
  
  const turkeyUpgradeCost = getTurkeyUpgradeCost();
  const italiaUpgradeCost = getItaliaUpgradeCost();
  const granTourUpgradeCost = getGranTourUpgradeCost();
  const grandTotal = landPortionTotal + flightsAndExtrasValue + turkeyUpgradeCost + italiaUpgradeCost + granTourUpgradeCost;
  
  const grandTotalCOP = effectiveTrm > 0 ? grandTotal * effectiveTrm : 0;

  const finalPriceValue = getUSDValue(finalPrice, inputCurrencyFinal);
  const profit = finalPriceValue - grandTotal;
  const finalPriceCOP = effectiveTrm > 0 ? finalPriceValue * effectiveTrm : 0;

  // Calculate default minimum payment
  // Formula: (Flights + Assistance) + (30% of (Land Portion + Upgrade)) + 200 USD
  const calculateDefaultMinPayment = () => {
    const landPortionWithUpgrade = landPortionTotal + turkeyUpgradeCost;
    const thirtyPercentLand = landPortionWithUpgrade * 0.30;
    const baseMinPaymentUSD = flightsAndExtrasValue + thirtyPercentLand + 200;
    
    return baseMinPaymentUSD;
  };

  const defaultMinPaymentUSD = calculateDefaultMinPayment();
  const defaultMinPaymentCOP = effectiveTrm > 0 ? defaultMinPaymentUSD * effectiveTrm : 0;

  const handlePercentageClick = (percentage: number) => {
    if (!finalPrice) return;
    
    const rawFinalPrice = parseNumber(finalPrice);
    const calculatedValue = rawFinalPrice * (percentage / 100);
    
    // Format the value back to string with commas
    const formattedValue = calculatedValue.toLocaleString('en-US', { 
      minimumFractionDigits: inputCurrencyFinal === "USD" ? 2 : 0, 
      maximumFractionDigits: inputCurrencyFinal === "USD" ? 2 : 0 
    });
    
    setMinPayment(formattedValue);
  };

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

  const handleDomesticFlightUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingDomesticFlight(true);
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
      
      setDomesticFlightImages([...domesticFlightImages, ...uploadedUrls]);
      
      toast({
        title: "Imágenes subidas",
        description: `${files.length} imagen(es) del vuelo interno guardadas`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron subir algunas imágenes.",
        variant: "destructive",
      });
    } finally {
      setUploadingDomesticFlight(false);
      e.target.value = "";
    }
  };

  const handleConnectionFlightUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingConnectionFlight(true);
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
      
      setConnectionFlightImages([...connectionFlightImages, ...uploadedUrls]);
      
      toast({
        title: "Imágenes subidas",
        description: `${files.length} imagen(es) del vuelo de conexión guardadas`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron subir algunas imágenes.",
        variant: "destructive",
      });
    } finally {
      setUploadingConnectionFlight(false);
      e.target.value = "";
    }
  };

  const handleSendWhatsApp = () => {
    const whatsappNumber = "573146576500";
    const destinationsText = selectedDests
      .map((d) => `${d.name} (${d.duration}D/${d.nights}N)`)
      .join(", ");
    
    const startDateFormatted = startDate ? formatDate(startDate) : "Por definir";
    const endDateFormatted = endDate ? formatDate(new Date(endDate + "T00:00:00")) : "Por definir";
    
    const message = `Hola! Quiero cotizar los siguientes destinos: ${destinationsText}. Fechas: ${startDateFormatted} al ${endDateFormatted}. Total: US$ ${formatUSD(grandTotal)}`;
    
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank");
  };
  
  const handleSaveQuote = async () => {
    let clientIdToUse = selectedClientId;

    if (activeTab === "new") {
      if (!newClientName || !newClientEmail) {
        toast({
          title: "Datos incompletos",
          description: "Por favor completa el nombre y correo del cliente",
          variant: "destructive",
        });
        return;
      }

      try {
        const newClient = await createClientMutation.mutateAsync({
          name: newClientName,
          email: newClientEmail,
          phone: newClientPhone || null,
        });
        clientIdToUse = newClient.id;
      } catch (error) {
        return; // Error handled in mutation
      }
    } else {
      if (!clientIdToUse) {
        toast({
          title: "Cliente requerido",
          description: "Por favor, selecciona un cliente",
          variant: "destructive",
        });
        return;
      }
    }

    if (!startDate) {
      toast({
        title: "Fecha requerida",
        description: "Por favor, selecciona una fecha de inicio",
        variant: "destructive",
      });
      return;
    }

    const hasFlightData = outboundImages.length > 0 || returnImages.length > 0 || 
                          domesticFlightImages.length > 0 || connectionFlightImages.length > 0 ||
                          outboundCabinBaggage || outboundHoldBaggage || 
                          returnCabinBaggage || returnHoldBaggage ||
                          domesticCabinBaggage || domesticHoldBaggage ||
                          connectionCabinBaggage || connectionHoldBaggage;

    // Calculate Min Payment Payload
    let payloadMinPayment = null;
    let payloadMinPaymentCOP = null;
    
    if (minPayment && minPayment.trim() !== "") {
      const rawMinPayment = parseNumber(minPayment);
      if (inputCurrencyFinal === "USD") {
        payloadMinPayment = rawMinPayment;
        payloadMinPaymentCOP = effectiveTrm > 0 ? rawMinPayment * effectiveTrm : null;
      } else {
        payloadMinPayment = effectiveTrm > 0 ? rawMinPayment / effectiveTrm : null;
        payloadMinPaymentCOP = rawMinPayment;
      }
    } else {
      payloadMinPayment = defaultMinPaymentUSD;
      payloadMinPaymentCOP = effectiveTrm > 0 ? defaultMinPaymentCOP : null;
    }

    // Calculate Final Price Payload
    const rawFinalPrice = parseNumber(finalPrice);
    let payloadFinalPrice = null;
    let payloadFinalPriceCOP = null;

    if (finalPrice && finalPrice.trim() !== "") {
      if (inputCurrencyFinal === "USD") {
        payloadFinalPrice = rawFinalPrice;
        payloadFinalPriceCOP = effectiveTrm > 0 ? rawFinalPrice * effectiveTrm : null;
      } else {
        payloadFinalPrice = effectiveTrm > 0 ? rawFinalPrice / effectiveTrm : null;
        payloadFinalPriceCOP = rawFinalPrice;
      }
    }

    const quoteData = {
      clientId: clientIdToUse,
      totalPrice: grandTotal,
      originCity: originCity || "",
      flightsAndExtras: flightsAndExtrasValue,
      outboundFlightImages: outboundImages,
      returnFlightImages: returnImages,
      domesticFlightImages: domesticFlightImages,
      connectionFlightImages: connectionFlightImages,
      includeFlights: hasFlightData,
      outboundCabinBaggage,
      outboundHoldBaggage,
      returnCabinBaggage,
      returnHoldBaggage,
      domesticCabinBaggage,
      domesticHoldBaggage,
      connectionCabinBaggage,
      connectionHoldBaggage,
      turkeyUpgrade: turkeyUpgrade || null,
      italiaUpgrade: italiaUpgrade || null,
      granTourUpgrade: granTourUpgrade || null,
      trm: effectiveTrm > 0 ? effectiveTrm : null,
      customFilename: customFilename.trim() || null,
      minPayment: payloadMinPayment,
      minPaymentCOP: payloadMinPaymentCOP,
      finalPrice: payloadFinalPrice,
      finalPriceCOP: payloadFinalPriceCOP,
      finalPriceCurrency: inputCurrencyFinal,
      destinations: selectedDests.map((dest) => ({
        destinationId: dest.id,
        startDate: startDate?.toISOString().split("T")[0] || "",
        passengers: passengers,
        price: dest.basePrice ? parseFloat(dest.basePrice) : 0,
      })),
    };

    await saveQuoteMutation.mutateAsync(quoteData);
  };

  const handleExportPDF = async () => {
    // Prevent concurrent PDF generation
    if (isGeneratingPDF) return;

    // Clear any existing completion timeout
    if (pdfCompletionTimeoutRef.current) {
      clearTimeout(pdfCompletionTimeoutRef.current);
      pdfCompletionTimeoutRef.current = null;
    }

    setIsGeneratingPDF(true);
    setIsPDFComplete(false);
    
    try {
      const hasFlightData = outboundImages.length > 0 || returnImages.length > 0 || 
                            domesticFlightImages.length > 0 || connectionFlightImages.length > 0 ||
                            outboundCabinBaggage || outboundHoldBaggage || 
                            returnCabinBaggage || returnHoldBaggage ||
                            domesticCabinBaggage || domesticHoldBaggage ||
                            connectionCabinBaggage || connectionHoldBaggage;

      console.log("Starting PDF generation request...");

      // Calculate final prices explicitly for the payload to ensure accuracy
      const rawFinalPrice = parseNumber(finalPrice);
      let payloadFinalPrice = null;
      let payloadFinalPriceCOP = null;

      // Check if user has entered a value (string is not empty)
      if (finalPrice && finalPrice.trim() !== "") {
        if (inputCurrencyFinal === "USD") {
          payloadFinalPrice = rawFinalPrice;
          // Calculate COP equivalent if TRM is available
          payloadFinalPriceCOP = effectiveTrm > 0 ? rawFinalPrice * effectiveTrm : null;
        } else {
          // COP
          // Calculate USD equivalent if TRM is available
          payloadFinalPrice = effectiveTrm > 0 ? rawFinalPrice / effectiveTrm : null;
          // The COP value is exactly what the user typed
          payloadFinalPriceCOP = rawFinalPrice;
        }
      }

      // Calculate Min Payment Payload
      let payloadMinPayment = null;
      let payloadMinPaymentCOP = null;
      
      if (minPayment && minPayment.trim() !== "") {
        // User entered a manual value
        const rawMinPayment = parseNumber(minPayment);
        
        // Assume the currency matches the Final Price currency input
        if (inputCurrencyFinal === "USD") {
          payloadMinPayment = rawMinPayment;
          payloadMinPaymentCOP = effectiveTrm > 0 ? rawMinPayment * effectiveTrm : null;
        } else {
          payloadMinPayment = effectiveTrm > 0 ? rawMinPayment / effectiveTrm : null;
          payloadMinPaymentCOP = rawMinPayment;
        }
      } else {
        // Use default calculation
        payloadMinPayment = defaultMinPaymentUSD;
        payloadMinPaymentCOP = effectiveTrm > 0 ? defaultMinPaymentCOP : null;
      }

      console.log("PDF Payload Prices:", {
        rawFinalPrice,
        inputCurrencyFinal,
        payloadFinalPrice,
        payloadFinalPriceCOP,
        effectiveTrm,
        payloadMinPayment,
        payloadMinPaymentCOP
      });

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
          startDate: startDate?.toISOString().split("T")[0] || "",
          endDate,
          flightsAndExtras: flightsAndExtrasValue,
          landPortionTotal,
          grandTotal,
          originCity: originCity || "",
          outboundFlightImages: outboundImages,
          returnFlightImages: returnImages,
          domesticFlightImages: domesticFlightImages,
          connectionFlightImages: connectionFlightImages,
          includeFlights: hasFlightData,
          outboundCabinBaggage,
          outboundHoldBaggage,
          returnCabinBaggage,
          returnHoldBaggage,
          domesticCabinBaggage,
          domesticHoldBaggage,
          connectionCabinBaggage,
          connectionHoldBaggage,
          passengers,
          turkeyUpgrade: turkeyUpgrade || null,
          italiaUpgrade: italiaUpgrade || null,
          granTourUpgrade: granTourUpgrade || null,
          trm: effectiveTrm > 0 ? effectiveTrm : null,
          grandTotalCOP: effectiveTrm > 0 ? grandTotalCOP : null,
          finalPrice: payloadFinalPrice,
          finalPriceCOP: payloadFinalPriceCOP,
          finalPriceCurrency: inputCurrencyFinal,
          customFilename: customFilename.trim() || null,
          minPayment: payloadMinPayment,
          minPaymentCOP: payloadMinPaymentCOP,
        }),
      });
      
      console.log("PDF response received:", response.status, response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("PDF generation failed:", errorText);
        throw new Error(`Failed to generate PDF: ${response.status} - ${errorText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      // Use custom filename if provided, otherwise default
      let downloadFilename = `cotizacion-${new Date().toISOString().split('T')[0]}.pdf`;
      if (customFilename.trim()) {
        downloadFilename = customFilename.trim();
        if (!downloadFilename.toLowerCase().endsWith('.pdf')) {
          downloadFilename += '.pdf';
        }
      }
      
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Mark PDF as complete and show completion state
      setIsPDFComplete(true);
      
      // Clear any existing timeout (defensive - should already be cleared)
      if (pdfCompletionTimeoutRef.current) {
        clearTimeout(pdfCompletionTimeoutRef.current);
      }
      
      // Keep modal open for 1.5s to show completion state, then close
      pdfCompletionTimeoutRef.current = setTimeout(() => {
        setIsGeneratingPDF(false);
        setIsPDFComplete(false);
        pdfCompletionTimeoutRef.current = null;
      }, 1500);
      
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
      setIsGeneratingPDF(false);
      setIsPDFComplete(false);
    }
  };

  if (selectedDests.length === 0) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="bg-white shadow-md border-b">
            <div className="container mx-auto px-4 py-4 flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-2xl md:text-3xl font-extrabold text-blue-600 tracking-tight">
                Cosmos <span className="text-blue-400 font-light">Mayorista</span>
              </h1>
              <Button
                variant="ghost"
                onClick={() => setLocation("/")}
                data-testid="button-back"
                className="ml-auto"
              >
                ← Volver
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-gradient-to-b from-blue-50 to-white">
            <div className="container mx-auto px-4 py-12 max-w-4xl">
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
                        {effectiveTrm > 0 && (
                          <div className="text-sm font-bold text-green-600">
                            $ {(basePrice * effectiveTrm).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP
                          </div>
                        )}
                        <div className="text-xs text-gray-500">Porción terrestre</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <div className="border-t border-blue-200 pt-3 mt-3">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span className="text-gray-700">Subtotal Porciones Terrestres:</span>
                  <div className="text-right">
                    <span className="text-blue-600 block">
                      US$ {landPortionTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {effectiveTrm > 0 && (
                      <span className="text-green-600 text-sm block">
                        $ {(landPortionTotal * effectiveTrm).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP
                      </span>
                    )}
                  </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  Fecha de Inicio
                  {hasTurkeyEsencial && <Badge variant="secondary">Martes o Miércoles</Badge>}
                  {hasGranTourEuropa && <Badge variant="secondary" className="bg-purple-100 text-purple-800">Domingo o Lunes</Badge>}
                  {hasTurkeyDestinations && !hasTurkeyEsencial && <Badge variant="secondary">Solo Martes</Badge>}
                  {hasAllowedDaysRestriction && allowedDaysDestination && (
                    <Badge variant="secondary">
                      {formatAllowedDays(allowedDaysDestination.allowedDays || [])}
                    </Badge>
                  )}
                </label>
                <DatePicker
                  date={startDate}
                  onDateChange={setStartDate}
                  placeholder={
                    hasAllowedDaysRestriction && allowedDaysDestination
                      ? formatAllowedDays(allowedDaysDestination.allowedDays || [])
                      : hasTurkeyEsencial
                      ? "Selecciona martes o miércoles"
                      : hasGranTourEuropa
                      ? "Selecciona domingo o lunes"
                      : hasTurkeyDestinations
                      ? "Selecciona un martes"
                      : "Selecciona una fecha"
                  }
                  disabled={disableDates}
                  priceTiers={
                    selectedDestinations.length > 0 
                      ? selectedDests.flatMap(dest => 
                          (dest.priceTiers || []).map(tier => ({
                            ...tier,
                            destinationName: dest.name
                          }))
                        )
                      : undefined
                  }
                />
                {selectedDestinations.length > 0 && selectedDests.some(d => d.priceTiers && d.priceTiers.length > 0) && (
                  <div className="mt-2 p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-emerald-800 space-y-1">
                        <p className="font-semibold">Información del Calendario:</p>
                        <ul className="list-disc list-inside space-y-0.5 ml-1">
                          <li>Las fechas con <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[0.65rem] font-medium">precio</span> están disponibles</li>
                          {hasTurkeyEsencial && (
                            <li>
                              <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[0.6rem] font-medium">🛫 COL</span> = Vuelo desde Colombia (lunes, 11 días total)
                            </li>
                          )}
                          {hasTurkeyEsencial && (
                            <li>
                              Martes = Llegada directa desde otro país (10 días)
                            </li>
                          )}
                          {selectedDestinations.length > 1 && (
                            <li>El número <span className="bg-blue-600 text-white w-4 h-4 rounded-full inline-flex items-center justify-center text-[0.5rem] font-bold">2+</span> indica múltiples destinos en esa fecha</li>
                          )}
                          <li>Pasa el mouse sobre una fecha para ver detalles de precio por destino</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Fecha de Finalización (Calculada)</p>
                <p className="font-semibold text-lg" data-testid="text-end-date-summary">
                  {endDate ? formatDate(new Date(endDate + "T00:00:00")) : "Por definir"}
                </p>
                {endDate && (
                  <p className="text-xs text-gray-500 mt-1">
                    Duración total: {displayDuration} días de viaje
                    {hasTurkeyDestinations && <span className="text-orange-600"> (incluye día de vuelo a Turquía)</span>}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {hasTurkeyEsencial && (
          <Card className="mb-6 border-orange-200">
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
                    Mejora seleccionada: +US$ {formatUSD(turkeyUpgradeCost)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {hasItaliaTuristica && italiaUpgrades.length > 0 && (
          <Card className="mb-6 border-blue-200">
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
                    Mejora seleccionada: +US$ {formatUSD(italiaUpgradeCost)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {hasGranTourEuropa && granTourUpgrades.length > 0 && (
          <Card className="mb-6 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-600">
                <Star className="w-5 h-5" />
                Mejora tu Plan Gran Tour de Europa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Selecciona una opción para mejorar tu experiencia en Europa:
              </p>
              <div className="space-y-3">
                {granTourUpgrades.map((upgrade) => (
                  <div key={upgrade.code} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover-elevate">
                    <Checkbox
                      id={`grantour-upgrade-${upgrade.code}`}
                      checked={granTourUpgrade === upgrade.code}
                      onCheckedChange={(checked) => setGranTourUpgrade(checked ? upgrade.code : "")}
                    />
                    <div className="flex-1">
                      <label htmlFor={`grantour-upgrade-${upgrade.code}`} className="font-semibold cursor-pointer">
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
              {granTourUpgrade && (
                <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm font-semibold text-purple-700">
                    Mejora seleccionada: +US$ {formatUSD(granTourUpgradeCost)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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

            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-semibold text-gray-700 mb-3">Equipajes Incluidos:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="outbound-cabin"
                    checked={outboundCabinBaggage}
                    onCheckedChange={(checked) => setOutboundCabinBaggage(checked as boolean)}
                    data-testid="checkbox-outbound-cabin"
                  />
                  <Label htmlFor="outbound-cabin" className="cursor-pointer">
                    Equipaje de cabina 10kg
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="outbound-hold"
                    checked={outboundHoldBaggage}
                    onCheckedChange={(checked) => setOutboundHoldBaggage(checked as boolean)}
                    data-testid="checkbox-outbound-hold"
                  />
                  <Label htmlFor="outbound-hold" className="cursor-pointer">
                    Equipaje de bodega 23kg
                  </Label>
                </div>
                <p className="text-xs text-gray-500 mt-2">* Personal 8kg siempre está incluido</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Domestic Flight Card - Only for "Lo Mejor de Cusco + Lima" */}
        {selectedDestinations.includes('df3a7358-b65f-4849-a16d-bcf0f29cecc8') && (
          <Card className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="w-5 h-5" />
                Vuelo Interno
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Sube las imágenes del vuelo interno (máximo 10 imágenes)
              </p>

              {domesticFlightImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                  {domesticFlightImages.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Vuelo interno ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <button
                        onClick={() => setDomesticFlightImages(domesticFlightImages.filter((_, i) => i !== index))}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  id="domestic-flight-images"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleDomesticFlightUpload}
                  data-testid="input-domestic-images"
                />
                <label htmlFor="domestic-flight-images">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={uploadingDomesticFlight}
                    asChild
                  >
                    <span>
                      {uploadingDomesticFlight ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Subir Imágenes de Vuelo Interno
                        </>
                      )}
                    </span>
                  </Button>
                </label>
              </div>

              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-semibold text-gray-700 mb-3">Equipajes Incluidos:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="domestic-cabin"
                      checked={domesticCabinBaggage}
                      onCheckedChange={(checked) => setDomesticCabinBaggage(checked as boolean)}
                      data-testid="checkbox-domestic-cabin"
                    />
                    <Label htmlFor="domestic-cabin" className="cursor-pointer">
                      Equipaje de cabina 10kg
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="domestic-hold"
                      checked={domesticHoldBaggage}
                      onCheckedChange={(checked) => setDomesticHoldBaggage(checked as boolean)}
                      data-testid="checkbox-domestic-hold"
                    />
                    <Label htmlFor="domestic-hold" className="cursor-pointer">
                      Equipaje de bodega 23kg
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">* Personal 8kg siempre está incluido</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Connection Flight Card - For Turkey + Dubai/Emirates combinations */}
        {showConnectionFlight && (
          <Card className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="w-5 h-5" />
                Vuelo de Conexión entre Destinos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Sube las imágenes del vuelo de conexión entre destinos (máximo 10 imágenes)
              </p>

              {connectionFlightImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                  {connectionFlightImages.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Vuelo conexión ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <button
                        onClick={() => setConnectionFlightImages(connectionFlightImages.filter((_, i) => i !== index))}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  id="connection-flight-images"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleConnectionFlightUpload}
                  data-testid="input-connection-images"
                />
                <label htmlFor="connection-flight-images">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={uploadingConnectionFlight}
                    asChild
                  >
                    <span>
                      {uploadingConnectionFlight ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Subir Imágenes de Vuelo de Conexión
                        </>
                      )}
                    </span>
                  </Button>
                </label>
              </div>

              <div className="mt-4 pt-4 border-t border-orange-200">
                <p className="text-sm font-semibold text-gray-700 mb-3">Equipajes Incluidos:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="connection-cabin"
                      checked={connectionCabinBaggage}
                      onCheckedChange={(checked) => setConnectionCabinBaggage(checked as boolean)}
                      data-testid="checkbox-connection-cabin"
                    />
                    <Label htmlFor="connection-cabin" className="cursor-pointer">
                      Equipaje de cabina 10kg
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="connection-hold"
                      checked={connectionHoldBaggage}
                      onCheckedChange={(checked) => setConnectionHoldBaggage(checked as boolean)}
                      data-testid="checkbox-connection-hold"
                    />
                    <Label htmlFor="connection-hold" className="cursor-pointer">
                      Equipaje de bodega 23kg
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">* Personal 8kg siempre está incluido</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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

            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-semibold text-gray-700 mb-3">Equipajes Incluidos:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="return-cabin"
                    checked={returnCabinBaggage}
                    onCheckedChange={(checked) => setReturnCabinBaggage(checked as boolean)}
                    data-testid="checkbox-return-cabin"
                  />
                  <Label htmlFor="return-cabin" className="cursor-pointer">
                    Equipaje de cabina 10kg
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="return-hold"
                    checked={returnHoldBaggage}
                    onCheckedChange={(checked) => setReturnHoldBaggage(checked as boolean)}
                    data-testid="checkbox-return-hold"
                  />
                  <Label htmlFor="return-hold" className="cursor-pointer">
                    Equipaje de bodega 23kg
                  </Label>
                </div>
                <p className="text-xs text-gray-500 mt-2">* Personal 8kg siempre está incluido</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              TRM - Tasa Representativa del Mercado + 30 COP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Ingresa la TRM para convertir el total de USD a COP (Pesos Colombianos) el sistema sumara 30 COP automaticamente.
            </p>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-semibold text-gray-700">$</span>
              <Input
                type="text"
                placeholder="0.00"
                value={formatNumber(trm)}
                onChange={(e) => setTrm(e.target.value.replace(/,/g, ""))}
                className="text-lg font-semibold"
                data-testid="input-trm"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Vuelos y Asistencia
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Ingresa los valores. El sistema calculará el total.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Vuelos</Label>
                <div className="flex items-center gap-2 mt-1">
                  {trmValue > 0 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="px-2 h-10 font-bold text-lg text-gray-700 hover:bg-gray-100">
                          {inputCurrencyFlights === "USD" ? "US$" : "COP$"}
                          <ChevronDown className="w-4 h-4 ml-1 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setInputCurrencyFlights("USD")}>US$ - Dólares</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setInputCurrencyFlights("COP")}>COP$ - Pesos</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className="text-lg font-semibold text-gray-700 px-2">US$</span>
                  )}
                  <Input
                    type="text"
                    placeholder="0.00"
                    value={formatNumber(flightsCost)}
                    onChange={(e) => setFlightsCost(e.target.value.replace(/,/g, ""))}
                    className="text-lg font-semibold"
                  />
                </div>
                {effectiveTrm > 0 && (
                  <div className="mt-1 text-xs text-gray-500">
                    {inputCurrencyFlights === "USD" 
                      ? `$ ${(getUSDValue(flightsCost, "USD") * effectiveTrm).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP`
                      : `US$ ${getUSDValue(flightsCost, "COP").toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    }
                  </div>
                )}
              </div>
              <div>
                <Label>Asistencia</Label>
                <div className="flex items-center gap-2 mt-1">
                  {trmValue > 0 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="px-2 h-10 font-bold text-lg text-gray-700 hover:bg-gray-100">
                          {inputCurrencyAssistance === "USD" ? "US$" : "COP$"}
                          <ChevronDown className="w-4 h-4 ml-1 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setInputCurrencyAssistance("USD")}>US$ - Dólares</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setInputCurrencyAssistance("COP")}>COP$ - Pesos</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className="text-lg font-semibold text-gray-700 px-2">US$</span>
                  )}
                  <Input
                    type="text"
                    placeholder="0.00"
                    value={formatNumber(assistanceCost)}
                    onChange={(e) => setAssistanceCost(e.target.value.replace(/,/g, ""))}
                    className="text-lg font-semibold"
                  />
                </div>
                {effectiveTrm > 0 && (
                  <div className="mt-1 text-xs text-gray-500">
                    {inputCurrencyAssistance === "USD" 
                      ? `$ ${(getUSDValue(assistanceCost, "USD") * effectiveTrm).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP`
                      : `US$ ${getUSDValue(assistanceCost, "COP").toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    }
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-orange-200 flex justify-between items-center">
               <span className="font-semibold text-gray-700">Total Vuelos y Asistencia:</span>
               <div className="text-right">
                 <span className="text-xl font-bold text-orange-700 block">US$ {formatUSD(flightsAndExtrasValue)}</span>
                 {effectiveTrm > 0 && (
                   <span className="text-sm font-semibold text-orange-600 block">
                     $ {(flightsAndExtrasValue * effectiveTrm).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP
                   </span>
                 )}
               </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm opacity-90 mb-1">Subtotal o costo Neto</div>
                {effectiveTrm > 0 ? (
                  <>
                    <div className="text-4xl font-extrabold text-green-100">
                      $ {grandTotalCOP.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP
                    </div>
                    <div className="text-xl font-bold opacity-75 mt-1">
                      US$ {formatUSD(grandTotal)}
                    </div>
                  </>
                ) : (
                  <div className="text-4xl font-extrabold">
                    US$ {formatUSD(grandTotal)}
                  </div>
                )}
              </div>
              <div className="text-right text-sm opacity-90">
                <div>Porciones Terrestres: US$ {formatUSD(landPortionTotal)}</div>
                {turkeyUpgradeCost > 0 && (
                  <div>Mejora Turquía: US$ {formatUSD(turkeyUpgradeCost)}</div>
                )}
                <div>Vuelos y Asistencia: US$ {formatUSD(flightsAndExtrasValue)}</div>
                {effectiveTrm > 0 && (
                  <div className="text-xs mt-1 opacity-75">
                    (TRM: $ {effectiveTrm.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Precio Final de Venta PVP
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Ingresa el precio final que verá el cliente en el PDF.
            </p>
            <div className="flex items-center gap-2 mb-4">
              {trmValue > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="px-2 h-10 font-bold text-lg text-gray-700 hover:bg-gray-100">
                      {inputCurrencyFinal === "USD" ? "US$" : "COP$"}
                      <ChevronDown className="w-4 h-4 ml-1 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setInputCurrencyFinal("USD")}>US$ - Dólares</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setInputCurrencyFinal("COP")}>COP$ - Pesos</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="text-lg font-semibold text-gray-700 px-2">US$</span>
              )}
              <Input
                type="text"
                placeholder="0.00"
                value={formatNumber(finalPrice)}
                onChange={(e) => setFinalPrice(e.target.value.replace(/,/g, ""))}
                className="text-lg font-semibold"
                data-testid="input-final-price"
              />
            </div>
            {effectiveTrm > 0 && (
              <div className="mb-4 text-lg font-bold text-purple-700">
                {inputCurrencyFinal === "USD"
                  ? `$ ${finalPriceCOP.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP`
                  : `US$ ${finalPriceValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                }
              </div>
            )}
            
            {finalPriceValue > 0 && (
                <div className="p-4 bg-white rounded-lg border border-purple-200 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Costo Total (Neto):</span>
                        <div className="text-right">
                            <span className="font-semibold block">US$ {formatUSD(grandTotal)}</span>
                            {effectiveTrm > 0 && (
                                <span className="text-xs text-gray-500 block">
                                    $ {grandTotalCOP.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                        <span className="text-purple-700 font-bold">Cargo por Servicio:</span>
                        <div className="text-right">
                            <span className={`font-bold text-xl block ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                US$ {formatUSD(profit)}
                            </span>
                            {effectiveTrm > 0 && (
                                <span className={`text-sm font-semibold block ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    $ {(profit * effectiveTrm).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP
                                </span>
                            )}
                        </div>
                    </div>
                </div>
             )}
          </CardContent>
        </Card>

        <Card className="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pago Mínimo para Separar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Ingresa el valor mínimo para separar. Si se deja vacío, el sistema calculará automáticamente:
              <br/>
              <span className="text-xs italic">(Vuelos + Asistencia + 30% Porción Terrestre + 200 USD)</span>
            </p>
            
            <div className="flex flex-wrap gap-2 mb-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handlePercentageClick(60)}
                className="bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-200"
              >
                60% del PVP
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handlePercentageClick(70)}
                className="bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-200"
              >
                70% del PVP
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handlePercentageClick(100)}
                className="bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-200"
              >
                100% del PVP
              </Button>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-semibold text-gray-700 px-2">
                {inputCurrencyFinal === "USD" ? "US$" : "COP$"}
              </span>
              <Input
                type="text"
                placeholder={inputCurrencyFinal === "USD" 
                  ? formatNumber(defaultMinPaymentUSD.toFixed(2)) 
                  : formatNumber(defaultMinPaymentCOP.toFixed(0))
                }
                value={formatNumber(minPayment)}
                onChange={(e) => setMinPayment(e.target.value.replace(/,/g, ""))}
                className="text-lg font-semibold"
                data-testid="input-min-payment"
              />
            </div>
            
            {effectiveTrm > 0 && (
              <div className="text-sm text-indigo-700 font-medium">
                {minPayment ? (
                  // Show conversion of manual input
                  inputCurrencyFinal === "USD"
                    ? `$ ${(parseNumber(minPayment) * effectiveTrm).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP`
                    : `US$ ${(parseNumber(minPayment) / effectiveTrm).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                ) : (
                  // Show conversion of default calculation
                  inputCurrencyFinal === "USD"
                    ? `$ ${defaultMinPaymentCOP.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP (Calculado)`
                    : `US$ ${defaultMinPaymentUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Calculado)`
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6 bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Nombre del Archivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Ingresa un nombre personalizado para el archivo PDF. Si se deja vacío, se usará el nombre por defecto.
            </p>
            <Input
              type="text"
              placeholder="Ej: Cotización Familia Perez - Turquía"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              className="text-lg"
              data-testid="input-custom-filename"
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleExportPDF}
            disabled={isGeneratingPDF}
            data-testid="button-export-pdf"
          >
            <FileText className="w-5 h-5 mr-2" />
            {isGeneratingPDF ? "Generando..." : "Exportar PDF"}
          </Button>
          
          <Button
            size="lg"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={handleSendWhatsApp}
            data-testid="button-send-whatsapp"
          >
            <WhatsAppIcon className="w-5 h-5 mr-2" />
            Validar Disponibilidad
          </Button>

          <Button
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setShowSaveDialog(true)}
            data-testid="button-save-quote"
          >
            <Save className="w-5 h-5 mr-2" />
            Guardar Cotización
          </Button>
        </div>

        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Guardar Cotización</DialogTitle>
              <DialogDescription>
                Selecciona un cliente existente o crea uno nuevo
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">Cliente Existente</TabsTrigger>
                <TabsTrigger value="new">Nuevo Cliente</TabsTrigger>
              </TabsList>
              
              <TabsContent value="existing" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger data-testid="select-client">
                      <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    <SelectContent className="z-[100]" position="popper" sideOffset={5}>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} - {client.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
              
              <TabsContent value="new" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="new-name">Nombre Completo</Label>
                  <Input 
                    id="new-name" 
                    placeholder="Ej: Juan Pérez" 
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-email">Correo Electrónico</Label>
                  <Input 
                    id="new-email" 
                    type="email" 
                    placeholder="juan@ejemplo.com" 
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-phone">Teléfono (Opcional)</Label>
                  <Input 
                    id="new-phone" 
                    placeholder="+57 300 123 4567" 
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Resumen</Label>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p>Destinos: {selectedDests.map(d => d.name).join(", ")}</p>
                  <p>Fecha inicio: {startDate ? formatDate(startDate) : "Por definir"}</p>
                  <p>Total: US$ {formatUSD(grandTotal)}</p>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleSaveQuote}
                disabled={saveQuoteMutation.isPending || createClientMutation.isPending}
                data-testid="button-confirm-save"
              >
                {saveQuoteMutation.isPending || createClientMutation.isPending ? "Procesando..." : "Confirmar y Guardar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* PDF Loading Modal */}
        <PDFLoadingModal isOpen={isGeneratingPDF} isComplete={isPDFComplete} />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
