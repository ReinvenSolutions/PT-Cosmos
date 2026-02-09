import { forwardRef } from "react";
import { Star, PhoneCall, AtSign } from "lucide-react";

interface QuoteTemplateProps {
  mainTitle: string;
  description: string;
  hotelStars: number;
  includes: string[];
  plan: "solo" | "empaquetado";
  numberOfPeople: number;
  price: string;
  disclaimer: string;
  mainImage: string | null;
  logoUrl: string;
  phone: string;
  email: string;
}

export const QuoteTemplate = forwardRef<HTMLDivElement, QuoteTemplateProps>(
  (
    {
      mainTitle,
      description,
      hotelStars,
      includes,
      plan,
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
    // Formatear el precio para mostrar
    const formatPriceDisplay = (priceValue: string): string => {
      if (!priceValue) return "$ 0";

      // Si ya tiene símbolo de peso o moneda, devolverlo tal cual
      if (priceValue.includes("$") || priceValue.includes("COP") || priceValue.includes("USD") || priceValue.includes("US")) {
        return priceValue;
      }

      // Si es solo el número formateado, agregar símbolo de peso y COP
      return `$ ${priceValue} COP`;
    };
    return (
      <div
        ref={ref}
        className="w-[800px] max-w-[800px] bg-white shadow-2xl overflow-hidden"
        style={{ fontFamily: "system-ui, -apple-system, sans-serif", width: "800px", maxWidth: "800px" }}
      >
        {/* Header - Solo se muestra si hay logo */}
        {logoUrl && (
          <>
            <div className="bg-[#004e7c] px-8 py-6 flex items-center justify-start">
              <img
                src={logoUrl}
                alt="Logo"
                className="h-16 w-auto object-contain"
                style={{ maxWidth: '100%' }}
              />
            </div>
            {/* Separador gris claro */}
            <div className="h-2 bg-[#f5f5f5]"></div>
          </>
        )}

        {/* Imagen Principal */}
        <div className="h-[400px] w-full bg-gray-200 relative overflow-hidden">
          {mainImage ? (
            <img
              src={mainImage}
              alt={mainTitle}
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
          {/* Título Principal */}
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {mainTitle || "Título Principal"}
          </h2>

          {/* Descripción */}
          <p className="text-lg text-gray-600 mb-5">
            {description || "Descripción"}
          </p>

          {/* Divisor */}
          <hr className="border-gray-300 mb-6" />

          {/* Sección de Precios */}
          <div className="flex items-start justify-between gap-4 mb-6">
            {/* Izquierda: Badges e información */}
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              {/* Badge Hotel, Estrellas e Incluye */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Badge Hotel y Estrellas - Solo si Hotel está incluido */}
                {includes.includes("Hotel") && (
                  <>
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
                  </>
                )}
                {/* Etiquetas de Incluye - Filtrar Hotel ya que se muestra como badge especial */}
                {includes.length > 0 && (
                  <div className="flex items-center gap-2 ml-2">
                    {includes.filter(item => item !== "Hotel").map((item, index) => (
                      <span
                        key={index}
                        className="bg-green-500 text-white px-2 py-1 rounded-md text-xs font-semibold"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Plan */}
              <p className="text-base text-gray-800 leading-relaxed">
                <span className="font-bold">Tipo de plan:</span> <span className="font-normal">{plan === "solo" ? "Solo" : "Empaquetado"}</span>
              </p>

              {/* Personas */}
              <p className="text-sm text-gray-700 leading-relaxed">
                <span className="font-semibold">Cantidad de personas:</span> {numberOfPeople || 2}{" "}
                {numberOfPeople === 1 ? "persona" : "personas"}
              </p>
            </div>

            {/* Derecha: Precio */}
            <div className="text-right flex-shrink-0" style={{ minWidth: "200px", maxWidth: "280px" }}>
              <p className="text-sm text-gray-500 mb-1">desde</p>
              <p className="text-3xl font-bold text-gray-900 mb-1 leading-tight break-words">
                {formatPriceDisplay(price)}
              </p>
              <p className="text-xs text-gray-500">precio por persona</p>
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
