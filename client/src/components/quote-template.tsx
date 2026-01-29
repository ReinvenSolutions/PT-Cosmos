import { forwardRef } from "react";
import { Star, PhoneCall, AtSign } from "lucide-react";

interface QuoteTemplateProps {
  hotelName: string;
  duration: string;
  hotelStars: number;
  roomType: string;
  mealPlan: string;
  numberOfPeople: number;
  price: string;
  disclaimer: string;
  mainImage: string | null;
  logoUrl: string;
  phone: string;
  email: string;
}

const DEFAULT_LOGO_PATH = "/images/logo/cosmos-mayorista-logo.png";

export const QuoteTemplate = forwardRef<HTMLDivElement, QuoteTemplateProps>(
  (
    {
      hotelName,
      duration,
      hotelStars,
      roomType,
      mealPlan,
      numberOfPeople,
      price,
      disclaimer,
      mainImage,
      logoUrl,
      phone,
      email,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className="w-[800px] bg-white shadow-2xl overflow-hidden"
        style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
      >
        {/* Header */}
        <div className="bg-[#004e7c] px-8 py-6 flex items-center justify-start">
          <img
            src={logoUrl}
            alt="Logo COSMOS MAYORISTA"
            className="h-16 w-auto object-contain"
            style={{ maxWidth: '100%' }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              // Si es un error y aún no es la ruta del fallback, intentar con el fallback
              if (target.src.indexOf(DEFAULT_LOGO_PATH) === -1) {
                target.src = DEFAULT_LOGO_PATH;
              }
            }}
          />
        </div>

        {/* Separador gris claro */}
        <div className="h-2 bg-[#f5f5f5]"></div>

        {/* Imagen Principal */}
        <div className="h-[400px] w-full bg-gray-200 relative overflow-hidden">
          {mainImage ? (
            <img
              src={mainImage}
              alt={hotelName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
              <div className="text-center text-gray-400">
                <svg
                  className="w-24 h-24 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-lg font-medium">Imagen del destino</p>
              </div>
            </div>
          )}
        </div>

        {/* Cuerpo */}
        <div className="px-8 py-6">
          {/* Título del Hotel */}
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {hotelName || "Nombre del Hotel"}
          </h2>

          {/* Duración */}
          <p className="text-lg text-gray-600 mb-5">
            {duration.includes("Hospédate") ? duration : `Hospédate por ${duration || "4 días y 3 noches"}`}
          </p>

          {/* Divisor */}
          <hr className="border-gray-300 mb-6" />

          {/* Sección de Precios */}
          <div className="flex items-start justify-between mb-6">
            {/* Izquierda: Badges e información */}
            <div className="flex flex-col gap-3 flex-1">
              {/* Badge Hotel y Estrellas */}
              <div className="flex items-center gap-3">
                <span className="bg-blue-400 text-white px-3 py-1.5 rounded-md text-sm font-semibold">
                  Hotel
                </span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: hotelStars }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
              </div>
              
              {/* Nombre del Hotel */}
              <p className="text-base font-normal text-gray-800 leading-relaxed">
                {hotelName || "Nombre del Hotel"}
              </p>

              {/* Tipo de Habitación y Régimen */}
              <p className="text-sm text-gray-700 leading-relaxed">
                {roomType || "Habitación Estándar"}
                {mealPlan && ` - ${mealPlan}`}
              </p>

              {/* Duración y Personas */}
              <p className="text-sm text-gray-700 leading-relaxed">
                {duration.includes("Hospédate") 
                  ? duration.replace("Hospédate por ", "") 
                  : duration || "4 días y 3 noches"} para {numberOfPeople || 2}{" "}
                {numberOfPeople === 1 ? "adulto" : "adultos"}
              </p>
            </div>

            {/* Derecha: Precio */}
            <div className="text-right ml-6 flex-shrink-0">
              <p className="text-sm text-gray-500 mb-1">desde</p>
              <p className="text-4xl font-bold text-gray-900 mb-1 leading-tight">
                {price || "$ 0"}
              </p>
              <p className="text-xs text-gray-500">precio total</p>
            </div>
          </div>

          {/* Disclaimer */}
          {disclaimer && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 leading-relaxed">{disclaimer}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#f5f5f5] px-8 py-5">
          <p className="text-sm font-medium text-gray-800 mb-4">
            Para mayor información contáctanos:
          </p>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                <PhoneCall className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-medium text-gray-800">
                {phone || "Teléfono"}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                <AtSign className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-medium text-gray-800">
                {email || "Email"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

QuoteTemplate.displayName = "QuoteTemplate";
