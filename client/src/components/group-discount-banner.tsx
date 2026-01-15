import { useState, useEffect } from "react";
import { X, Users, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function GroupDiscountBanner() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Verificar si el usuario cerró el banner anteriormente
    const bannerClosed = localStorage.getItem("groupDiscountBannerClosed");
    if (bannerClosed === "true") {
      setIsVisible(false);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem("groupDiscountBannerClosed", "true");
  };

  const handleWhatsAppClick = () => {
    const phoneNumber = "573146576500"; // +57 3146576500
    const message = "Hola, tengo un grupo de personas para un viaje internacional y me gustaría conocer los descuentos disponibles. ¿Pueden ayudarme?";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Desktop Banner - Visible solo en pantallas grandes */}
      <div className="hidden md:block sticky top-0 z-40 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 shadow-sm animate-in slide-in-from-top duration-500">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Users className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-900">
                  ¿Viajas en grupo? ¡Tenemos descuentos especiales!
                </p>
                <p className="text-xs text-green-700">
                  Consulta con nuestro equipo por beneficios exclusivos para grupos
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={handleWhatsAppClick}
                className="bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all"
                size="sm"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Consultar por WhatsApp
              </Button>
              
              <Button
                onClick={handleClose}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-green-700 hover:text-green-900 hover:bg-green-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Compact Banner - Visible solo en pantallas pequeñas */}
      <div className="md:hidden sticky top-0 z-40 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 shadow-sm animate-in slide-in-from-top duration-500">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="p-1.5 bg-green-100 rounded-full flex-shrink-0">
                <Users className="w-4 h-4 text-green-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-green-900 leading-tight">
                  ¿Viajas en grupo?
                </p>
                <p className="text-[10px] text-green-700 leading-tight truncate">
                  Descuentos especiales disponibles
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                onClick={handleWhatsAppClick}
                className="bg-green-600 hover:bg-green-700 text-white shadow-md h-8 px-3"
                size="sm"
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                <span className="text-xs">WhatsApp</span>
              </Button>
              
              <Button
                onClick={handleClose}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-green-700 hover:text-green-900 hover:bg-green-100 flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Floating Button - Respaldo visual adicional */}
      <div className="md:hidden fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom duration-500">
        <Button
          onClick={handleWhatsAppClick}
          className="bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all rounded-full w-14 h-14 p-0 relative"
          size="icon"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500 items-center justify-center">
              <Users className="w-3 h-3 text-white" />
            </span>
          </span>
        </Button>
      </div>
    </>
  );
}
