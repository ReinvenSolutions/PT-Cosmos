import { useState, useEffect } from "react";
import { X, Users, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GroupDiscountBanner() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
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
    const phoneNumber = "573146576500";
    const message = "Hola, tengo un grupo de personas para un viaje internacional y me gustaría conocer los descuentos disponibles. ¿Pueden ayudarme?";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Desktop Banner */}
      <div
        className="group-discount-banner hidden md:block sticky top-0 z-40 overflow-hidden"
        role="banner"
      >
        <div className="banner-shine" aria-hidden />
        <div className="banner-pattern" aria-hidden />
        <div className="container mx-auto px-6 py-4 relative">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="banner-icon-wrap flex-shrink-0">
                <Users className="w-7 h-7 text-current" strokeWidth={2.25} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="banner-badge">Descuentos exclusivos</span>
                  <Sparkles className="w-4 h-4 text-amber-400/90 animate-pulse" />
                </div>
                <h2 className="text-lg font-bold tracking-tight banner-title">
                  ¿Viajas en grupo?
                </h2>
                <p className="text-sm banner-subtitle">
                  Consulta beneficios especiales con nuestro equipo
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <Button
                onClick={handleWhatsAppClick}
                className="banner-cta group/btn"
                size="lg"
              >
                <MessageCircle className="w-5 h-5 mr-2 group-hover/btn:scale-110 transition-transform" />
                Consultar por WhatsApp
              </Button>

              <button
                onClick={handleClose}
                className="banner-close"
                aria-label="Cerrar banner"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Banner */}
      <div
        className="group-discount-banner md:hidden sticky top-0 z-40 overflow-hidden"
        role="banner"
      >
        <div className="banner-shine" aria-hidden />
        <div className="banner-pattern" aria-hidden />
        <div className="px-4 py-3 relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="banner-icon-wrap flex-shrink-0 w-12 h-12">
                <Users className="w-6 h-6 text-current" strokeWidth={2.25} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="banner-badge text-[10px] px-2 py-0.5">Exclusivo</span>
                <h2 className="text-sm font-bold tracking-tight banner-title truncate">
                  ¿Viajas en grupo?
                </h2>
                <p className="text-xs banner-subtitle truncate">
                  Descuentos especiales disponibles
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                onClick={handleWhatsAppClick}
                className="banner-cta-mobile group/btn"
                size="sm"
              >
                <MessageCircle className="w-4 h-4 mr-1.5" />
                WhatsApp
              </Button>
              <button
                onClick={handleClose}
                className="banner-close h-9 w-9"
                aria-label="Cerrar banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
