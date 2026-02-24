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
        className="bg-white overflow-hidden quote-template-card"
        style={{ fontFamily: "system-ui, -apple-system, sans-serif", width: "800px", maxWidth: "800px", margin: 0, padding: 0 }}
      >
        {/* Header - Solo se muestra si hay logo */}
        {logoUrl && (
          <>
            <div className="quote-template-logo-bar px-8 py-6 flex items-center justify-start">
              <img
                src={logoUrl}
                alt="Logo"
                className="h-16 w-auto object-contain"
                style={{ maxWidth: "100%" }}
              />
            </div>
            <div className="h-1.5 bg-neutral-100" />
          </>
        )}

        {/* Imagen Principal */}
        <div className="h-[400px] w-full bg-neutral-100 relative overflow-hidden">
          {mainImage ? (
            <img src={mainImage} alt={mainTitle} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200">
              <div className="text-center text-neutral-400">
                <svg
                  className="w-20 h-20 mx-auto mb-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
                <p className="text-sm font-medium text-neutral-500">Imagen del destino</p>
              </div>
            </div>
          )}
        </div>

        {/* Cuerpo */}
        <div className="px-8 py-6 w-full">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2 tracking-tight">
            {mainTitle || "Título Principal"}
          </h2>
          <p className="text-base text-neutral-600 mb-5 leading-relaxed">
            {description || "Descripción"}
          </p>

          <hr className="border-neutral-200 mb-6" />

          <div className="mb-6 w-full">
            <div className="flex items-center gap-2.5 flex-wrap mb-3">
              {includes.includes("Hotel") && (
                <>
                  <span
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: "hsl(197 53% 36%)" }}
                  >
                    Hotel
                  </span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: hotelStars }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                </>
              )}
              {includes.filter((item) => item !== "Hotel").map((item, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white"
                  style={{ background: "hsl(142 45% 45%)" }}
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="flex justify-end items-baseline">
              <div className="text-right">
                <p className="text-[11px] text-neutral-500 mb-0.5 uppercase tracking-wider">desde</p>
                <p
                  className="text-3xl font-bold whitespace-nowrap"
                  style={{ color: "hsl(44 54% 45%)" }}
                >
                  {formatPriceDisplay(price)}
                </p>
                <p className="text-[11px] text-neutral-500 mt-0.5">precio por persona</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mt-4 text-sm">
              <p className="text-neutral-700">
                <span className="font-semibold">Tipo de plan:</span> {plan === "solo" ? "Solo" : "Empaquetado"}
              </p>
              <p className="text-neutral-700">
                <span className="font-semibold">Cantidad de personas:</span> {numberOfPeople || 2}{" "}
                {numberOfPeople === 1 ? "persona" : "personas"}
              </p>
            </div>
          </div>

          {disclaimer && (
            <div className="mt-6 pt-4 border-t border-neutral-200">
              <p className="text-xs text-neutral-500 leading-relaxed">{disclaimer}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-neutral-50 w-full px-8 py-5 border-t border-neutral-200">
          <p className="text-xs font-semibold text-neutral-600 mb-3 uppercase tracking-wider">
            Para mayor información contáctanos
          </p>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white"
                style={{ background: "hsl(197 53% 36%)" }}
              >
                <PhoneCall className="w-4 h-4" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-medium text-neutral-800">{phone || "Teléfono"}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white"
                style={{ background: "hsl(197 53% 36%)" }}
              >
                <AtSign className="w-4 h-4" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-medium text-neutral-800">{email || "Email"}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

QuoteTemplate.displayName = "QuoteTemplate";
