import PDFDocument from "pdfkit";
import { Destination, ItineraryDay, Hotel, Inclusion, Exclusion, formatUSD, formatDate } from "@shared/schema";
import { getDestinationImages, getDestinationImageSet } from "./destination-images";
import { getImagePathForPDF } from "./upload";
import fs from "fs";
import path from "path";
import sizeOf from "image-size";

interface PublicQuoteData {
  destinations: Array<{
    id: string;
    name: string;
    country: string;
    duration: number;
    nights: number;
    basePrice: string;
    destination?: Destination;
    itinerary?: ItineraryDay[];
    hotels?: Hotel[];
    inclusions?: Inclusion[];
    exclusions?: Exclusion[];
  }>;
  startDate: string;
  endDate: string;
  flightsAndExtras: number;
  landPortionTotal: number;
  grandTotal: number;
  originCity: string;
  outboundFlightImages?: string[];
  returnFlightImages?: string[];
  includeFlights?: boolean;
  outboundCabinBaggage?: boolean;
  outboundHoldBaggage?: boolean;
  returnCabinBaggage?: boolean;
  returnHoldBaggage?: boolean;
  passengers?: number;
  turkeyUpgrade?: string | null;
}

function getPassengerText(passengers: number): string {
  if (passengers === 1) {
    return "por Persona";
  } else if (passengers === 2) {
    return "por Pareja";
  } else {
    return `por Grupo de ${passengers}`;
  }
}

function formatDateWithMonthName(date: Date): string {
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export async function generatePublicQuotePDF(data: PublicQuoteData): Promise<InstanceType<typeof PDFDocument>> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 60, right: 60 },
  });

  const backgroundColor = "#88bbcd";
  const primaryColor = "#1e40af";
  const accentColor = "#f97316";
  const priceBoxBackground = "#1e3a5f";
  const priceBoxBorder = "#2c5282";
  const priceTextColor = "#ffffff";
  const textColor = "#1f2937";
  const lightGray = "#6b7280";
  const veryLightGray = "#9ca3af";
  const borderColor = "#3b82f6";
  
  const pageWidth = 595;
  const pageHeight = 842;
  const leftMargin = 60;
  const rightMargin = 60;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  const addPageBackground = () => {
    doc.save();
    doc.rect(0, 0, pageWidth, pageHeight).fill(backgroundColor);
    doc.restore();
  };

  // Helper function to add plane logo in bottom-left corner (for all pages except first)
  const planeLogoPath = path.join(process.cwd(), "server", "assets", "plane-logo.png");
  const addPlaneLogoBottom = () => {
    if (fs.existsSync(planeLogoPath)) {
      try {
        const logoWidth = 80;
        const logoX = 20; // Closer to left edge
        const logoY = pageHeight - 50; // Closer to bottom edge
        
        doc.image(planeLogoPath, logoX, logoY, { width: logoWidth });
        console.log("[PDF Generator] Plane logo added to bottom-left corner");
      } catch (error) {
        console.error("[PDF Generator] Error loading plane logo:", error);
      }
    }
  };

  addPageBackground();

  const destinationNames = data.destinations.map(d => d.name).join(" + ");
  const totalDuration = data.destinations.reduce((sum, d) => sum + d.duration, 0);
  const totalNights = data.destinations.reduce((sum, d) => sum + d.nights, 0);

  const imagePaths = getDestinationImages(data.destinations);

  // Add Special Offer banner on first page only (top-right corner) - 100% in corner
  const specialOfferPath = path.join(process.cwd(), "server", "assets", "special-offer-banner.png");
  
  if (fs.existsSync(specialOfferPath)) {
    try {
      // Banner positioned exactly at corner with no margins
      const bannerWidth = 140;
      const bannerX = pageWidth - bannerWidth;
      const bannerY = 0;
      
      doc.image(specialOfferPath, bannerX, bannerY, { width: bannerWidth });
      console.log("[PDF Generator] Special offer banner added successfully");
    } catch (error) {
      console.error("[PDF Generator] Error loading special offer banner:", error);
    }
  }

  doc.font("Helvetica-Bold").fontSize(11).fillColor(textColor);
  doc.text("S U   V I A J E   A :", leftMargin, 70);

  // Add plane logo on first page after "SU VIAJE A:" text - aligned with text
  if (fs.existsSync(planeLogoPath)) {
    try {
      const firstPageLogoWidth = 60;
      const textWidth = doc.widthOfString("S U   V I A J E   A :");
      const firstPageLogoX = leftMargin + textWidth + 15;
      const firstPageLogoY = 57; // Raised higher to align better with text
      
      doc.image(planeLogoPath, firstPageLogoX, firstPageLogoY, { width: firstPageLogoWidth });
      console.log("[PDF Generator] Plane logo added to first page after title");
    } catch (error) {
      console.error("[PDF Generator] Error loading plane logo on first page:", error);
    }
  }

  const titleY = 95;
  const passengers = data.passengers || 2;
  const titleSuffix = passengers === 2 ? " 2X1" : "";
  const titleText = destinationNames.toUpperCase() + titleSuffix;
  
  let titleFontSize = 24;
  if (titleText.length > 50) {
    titleFontSize = 16;
  } else if (titleText.length > 35) {
    titleFontSize = 18;
  } else if (titleText.length > 25) {
    titleFontSize = 20;
  }
  
  doc.font("Helvetica-Bold").fontSize(titleFontSize).fillColor(primaryColor);
  doc.text(titleText, leftMargin, titleY, { width: contentWidth - 100, lineGap: 2 });
  
  const titleHeight = doc.heightOfString(titleText, { width: contentWidth - 100 });
  const durationY = titleY + titleHeight + 8;
  
  doc.font("Helvetica-Bold").fontSize(11).fillColor(textColor);
  doc.text(`PLAN ${totalDuration} DÍAS - ${totalNights} NOCHES`, leftMargin, durationY);

  const mainImageY = 165;
  const mainImageHeight = 250;
  
  // Add creation date above the main image
  const currentDate = formatDate(new Date());
  doc.font("Helvetica").fontSize(9).fillColor("#1f2937");
  doc.text(`creado ${currentDate}`, 0, mainImageY - 15, { width: pageWidth - rightMargin, align: "right" });
  
  if (imagePaths.length > 0 && fs.existsSync(imagePaths[0])) {
    try {
      doc.image(imagePaths[0], leftMargin, mainImageY, {
        width: contentWidth,
        height: mainImageHeight,
        align: "center",
        valign: "center"
      });
      
      doc.rect(leftMargin, mainImageY, contentWidth, mainImageHeight)
         .stroke(borderColor);
    } catch (error) {
      console.error("Error loading main image:", error);
    }
  }

  const budgetY = mainImageY + mainImageHeight + 15;
  
  doc.font("Helvetica-Bold").fontSize(10).fillColor(textColor);
  doc.text("P R E S U P U E S T O    P A R A    S U    V I A J E", leftMargin, budgetY);
  
  // Format dates without slashes
  const startDateFormatted = data.startDate 
    ? (() => {
        const d = new Date(data.startDate);
        const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      })()
    : "Por definir";
  const endDateFormatted = data.endDate 
    ? (() => {
        const d = new Date(data.endDate);
        const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      })()
    : "Por definir";
  
  const minPayment = Math.round(data.grandTotal * 0.6);
  
  // Salida with larger font and bold date
  doc.font("Helvetica").fontSize(11).fillColor(textColor);
  doc.text("Salida: ", leftMargin, budgetY + 20, { continued: true });
  doc.font("Helvetica-Bold").fontSize(12);
  doc.text(startDateFormatted);
  
  // Regreso with larger font and bold date
  doc.font("Helvetica").fontSize(11).fillColor(textColor);
  doc.text("Regreso: ", leftMargin, budgetY + 38, { continued: true });
  doc.font("Helvetica-Bold").fontSize(12);
  doc.text(endDateFormatted);
  
  // Pago mínimo with larger font and bold amount
  doc.font("Helvetica").fontSize(11).fillColor(textColor);
  doc.text("Pago mínimo para separar: ", leftMargin, budgetY + 56, { continued: true });
  doc.font("Helvetica-Bold").fontSize(12);
  doc.text(`$${formatUSD(minPayment)}`);

  const priceBoxX = pageWidth - rightMargin - 150;
  const priceBoxY = budgetY;
  const priceBoxWidth = 150;
  const priceBoxHeight = 70;
  
  doc.font("Helvetica-Bold").fontSize(10).fillColor(textColor);
  doc.text("D E S D E :", priceBoxX, priceBoxY);
  
  doc.roundedRect(priceBoxX, priceBoxY + 18, priceBoxWidth, priceBoxHeight - 18, 5)
     .fillAndStroke(priceBoxBackground, priceBoxBorder);
  
  doc.font("Helvetica-Bold").fontSize(26).fillColor(priceTextColor);
  doc.text(
    `$ ${formatUSD(data.grandTotal)}`,
    priceBoxX + 5,
    priceBoxY + 30,
    { width: priceBoxWidth - 10, align: "center" }
  );
  
  doc.font("Helvetica").fontSize(9).fillColor("#ffffff");
  doc.text(
    getPassengerText(passengers),
    priceBoxX + 5,
    priceBoxY + 60,
    { width: priceBoxWidth - 10, align: "center" }
  );

  const smallImagesY = budgetY + 85;
  const smallImageWidth = (contentWidth - 20) / 2;
  const smallImageHeight = 150;
  
  if (imagePaths.length > 1 && fs.existsSync(imagePaths[1])) {
    try {
      doc.image(imagePaths[1], leftMargin, smallImagesY, {
        width: smallImageWidth,
        height: smallImageHeight,
        align: "center",
        valign: "center"
      });
      
      doc.rect(leftMargin, smallImagesY, smallImageWidth, smallImageHeight)
         .stroke(borderColor);
    } catch (error) {
      console.error("Error loading second image:", error);
    }
  }
  
  if (imagePaths.length > 2 && fs.existsSync(imagePaths[2])) {
    try {
      doc.image(imagePaths[2], leftMargin + smallImageWidth + 20, smallImagesY, {
        width: smallImageWidth,
        height: smallImageHeight,
        align: "center",
        valign: "center"
      });
      
      doc.rect(leftMargin + smallImageWidth + 20, smallImagesY, smallImageWidth, smallImageHeight)
         .stroke(borderColor);
    } catch (error) {
      console.error("Error loading third image:", error);
    }
  }

  // Move comments section further down and center the title
  const commentsY = smallImagesY + smallImageHeight + 35;
  
  doc.font("Helvetica-Bold").fontSize(10).fillColor(textColor);
  doc.text("C O M E N T A R I O S", 0, commentsY, { width: pageWidth, align: "center" });
  
  // Comments with mixed formatting (normal and bold)
  const commentsStartY = commentsY + 15;
  doc.font("Helvetica").fontSize(7.5).fillColor(textColor);
  
  doc.text(
    "Tarifa sujeta a cambios sin previo aviso y disponibilidad. Para el destino, cuenta con acompañamiento de guía de habla hispana. Recuerda consultar los servicios no incluidos. ",
    leftMargin, 
    commentsStartY, 
    { width: contentWidth, align: "justify", lineGap: 2, continued: true }
  );
  
  doc.font("Helvetica-Bold");
  doc.text(
    "Globo Turquia +415usd por persona / 6 almuerzos +200usd por persona / Tarifa aérea NO reembolsable, permite cambio con penalidades + diferencia de tarifa.",
    { width: contentWidth, align: "justify", lineGap: 2, continued: true }
  );
  
  doc.font("Helvetica");
  doc.text(
    " NOCHE ADICIONAL DE HOTEL CON DESAYUNO EN ESTAMBUL + 250USD EN HOTELES DE LA MISMA CATEGORIA.",
    { width: contentWidth, align: "justify", lineGap: 2 }
  );

  doc.addPage();
  addPageBackground();
  addPlaneLogoBottom();

  doc.font("Helvetica-Bold").fontSize(18).fillColor(textColor);
  doc.text("Itinerario", leftMargin, 60);
  
  doc.moveTo(leftMargin, 90)
     .lineTo(leftMargin + 100, 90)
     .lineWidth(3)
     .stroke(primaryColor);
  
  doc.moveDown(3);
  
  const itineraryStartY = 120;
  const originCityText = data.originCity || "Origen";
  
  doc.font("Helvetica-Bold").fontSize(11).fillColor(textColor);
  doc.text(originCityText, leftMargin, itineraryStartY);
  doc.font("Helvetica").fontSize(9).fillColor(lightGray);
  doc.text("Inicio del viaje", pageWidth - rightMargin - 120, itineraryStartY, { 
    width: 120, 
    align: "right" 
  });
  
  doc.moveDown(2);
  
  interface CityStop {
    number: number;
    name: string;
    country: string;
    nights: number;
  }
  
  const cityStops: CityStop[] = [];
  
  // Check if this is specifically the "Turquía Esencial" plan
  const isTurkeyEsencial = data.destinations.some(d => 
    d.name?.toLowerCase().includes('turquía esencial') || 
    d.name?.toLowerCase().includes('turquia esencial')
  );
  
  // For general Turkey check (for map and other features)
  const isTurkey = data.destinations.some(d => 
    d.country?.toLowerCase().includes('turqu') || 
    d.country?.toLowerCase().includes('turkey')
  );
  
  if (isTurkeyEsencial) {
    // Use exact hardcoded itinerary for Turkey Esencial only
    cityStops.push(
      { number: 1, name: 'Estambul', country: 'Turquía', nights: 3 },
      { number: 3, name: 'Capadocia', country: 'Turquía', nights: 3 },
      { number: 4, name: 'Pamukkale', country: 'Turquía', nights: 1 },
      { number: 5, name: 'Esmirna', country: 'Turquía', nights: 1 },
      { number: 7, name: 'Estambul', country: 'Turquía', nights: 1 }
    );
  } else {
    // Original logic for non-Turkey destinations
    let stopNumber = 1;
    
    data.destinations.forEach(dest => {
      if (dest.itinerary && dest.itinerary.length > 0) {
        const locationGroups: { [key: string]: number } = {};
        
        dest.itinerary.forEach((day, index) => {
          const titleParts = day.title.split(' - ');
          const lastLocation = titleParts[titleParts.length - 1].trim();
          
          if (index < dest.itinerary!.length - 1) {
            if (!locationGroups[lastLocation]) {
              locationGroups[lastLocation] = 0;
            }
            locationGroups[lastLocation]++;
          }
        });
        
        Object.entries(locationGroups).forEach(([location, nightCount]) => {
          cityStops.push({
            number: stopNumber++,
            name: location,
            country: dest.country || "",
            nights: nightCount
          });
        });
      }
    });
  }
  
  let currentY = doc.y;
  
  // Draw top separator line before first stop
  doc.moveTo(leftMargin, currentY)
     .lineTo(pageWidth - rightMargin, currentY)
     .lineWidth(0.5)
     .stroke("#cccccc");
  
  currentY += 15;
  
  cityStops.forEach((stop, index) => {
    if (currentY > 650) {
      doc.addPage();
      addPageBackground();
      addPlaneLogoBottom();
      currentY = 60;
    }
    
    const numberBoxSize = 40;
    doc.roundedRect(leftMargin, currentY, numberBoxSize, numberBoxSize, 3)
       .fillAndStroke(primaryColor, primaryColor);
    
    doc.font("Helvetica-Bold").fontSize(16).fillColor("white");
    doc.text(
      stop.number.toString(), 
      leftMargin, 
      currentY + 12, 
      { width: numberBoxSize, align: "center" }
    );
    
    doc.font("Helvetica-Bold").fontSize(11).fillColor(textColor);
    doc.text(stop.name, leftMargin + numberBoxSize + 15, currentY + 5);
    
    doc.font("Helvetica").fontSize(9).fillColor(lightGray);
    doc.text(stop.country, leftMargin + numberBoxSize + 15, currentY + 22);
    
    const nightsText = stop.nights === 1 ? "Noche" : "Noches";
    doc.font("Helvetica-Bold").fontSize(14).fillColor(textColor);
    doc.text(stop.nights.toString(), pageWidth - rightMargin - 60, currentY + 5, { 
      width: 30, 
      align: "right" 
    });
    
    doc.font("Helvetica").fontSize(9).fillColor(lightGray);
    doc.text(nightsText, pageWidth - rightMargin - 60, currentY + 24, { 
      width: 60, 
      align: "right" 
    });
    
    currentY += numberBoxSize + 15;
    
    // Draw separator line after each stop
    doc.moveTo(leftMargin, currentY)
       .lineTo(pageWidth - rightMargin, currentY)
       .lineWidth(0.5)
       .stroke("#cccccc");
    
    currentY += 15;
  });
  
  doc.y = currentY + 20;
  
  doc.font("Helvetica-Bold").fontSize(11).fillColor(textColor);
  doc.text(originCityText, leftMargin, doc.y);
  doc.font("Helvetica").fontSize(9).fillColor(lightGray);
  doc.text("El final del viaje", pageWidth - rightMargin - 120, doc.y, { 
    width: 120, 
    align: "right" 
  });

  // Add Turkey route map for Turkey destinations
  if (isTurkey) {
    console.log('[PDF Generator] Adding Turkey route map to itinerary page...');
    
    // Use the new turkey map image
    const turkeyMapPath = path.join(process.cwd(), 'attached_assets', 'mapa itinerario turquia_1763577662908.png');
    
    console.log(`[PDF Generator] Looking for Turkey map at: ${turkeyMapPath}`);
    
    if (fs.existsSync(turkeyMapPath)) {
      try {
        const mapY = doc.y + 20;
        const maxMapWidth = contentWidth;
        const maxMapHeight = 240;
        
        console.log(`[PDF Generator] Adding map image at Y=${mapY}, maxWidth=${maxMapWidth}`);
        
        // Use fit to maintain aspect ratio without stretching
        doc.image(turkeyMapPath, leftMargin, mapY, {
          fit: [maxMapWidth, maxMapHeight],
          align: "center"
        });
        
        // Update Y position after image (estimate based on max height)
        doc.y = mapY + maxMapHeight + 20;
        console.log("[PDF Generator] ✓ Turkey route map added successfully");
      } catch (error) {
        console.error("[PDF Generator] ✗ Error loading Turkey route map:", error);
      }
    } else {
      console.warn(`[PDF Generator] ✗ Turkey route map not found at: ${turkeyMapPath}`);
    }
  }

  // Helper function to calculate flight terms height more accurately
  const calculateFlightTermsHeight = (): number => {
    // Calculate actual height by measuring all text elements
    let totalHeight = 0;
    
    // Title "Términos y condiciones" - 11pt bold + 0.5 line spacing
    totalHeight += doc.heightOfString("Términos y condiciones", { 
      width: contentWidth,
      lineGap: 6
    });
    totalHeight += 10; // moveDown(0.5) spacing
    
    // Terms text - 9pt
    const termsText = [
      "Los boletos de avión no son reembolsables.",
      "",
      "Una vez emitido el boleto no puede ser asignado a una persona o aerolínea diferente.",
      "",
      "Los cambios en los boletos pueden ocasionar cargos extra, están sujetos a disponibilidad, clase tarifaria y políticas de cada aerolínea al momento de solicitar el cambio.",
      "",
      "Para vuelos nacionales presentarse 2 horas antes de la salida del vuelo. Para vuelos internacionales presentarse 3 horas antes de la salida del vuelo."
    ];
    
    termsText.forEach(line => {
      if (line === "") {
        totalHeight += 4; // moveDown(0.3)
      } else {
        totalHeight += doc.heightOfString(line, { 
          width: contentWidth,
          lineGap: 3
        });
        totalHeight += 4; // moveDown(0.3)
      }
    });
    
    totalHeight += 4; // moveDown(0.3) before "Tarifa Light"
    
    // "Tarifa Light:" title
    totalHeight += doc.heightOfString("Tarifa Light:", { width: contentWidth });
    totalHeight += 4; // moveDown(0.3)
    
    // Tarifa items
    const tarifaItems = [
      "Equipaje documentado : Desde $90 USD",
      "Reembolso : No incluido antes de la partida / No incluido después de la partida",
      "Equipaje de mano : 1 Pieza incluida (8 kg/115 cm lineales)",
      "Cambios : Desde $210 USD antes de la partida, aplica términos y condiciones, validar con la aerolínea / Desde $210 USD después de la partida, aplica términos y condiciones, validar con la aerolínea",
      "Artículo Personal : 1 pieza incluida"
    ];
    
    tarifaItems.forEach(item => {
      totalHeight += doc.heightOfString(item, { 
        width: contentWidth,
        lineGap: 3
      });
      totalHeight += 4; // moveDown(0.3)
    });
    
    // Add some buffer for safety
    return Math.ceil(totalHeight) + 20;
  };

  // VUELOS DE IDA - Hoja 3 (después del itinerario resumido, antes del itinerario detallado)
  if (data.includeFlights && data.outboundFlightImages && data.outboundFlightImages.length > 0) {
    console.log('[PDF Generator] Outbound flight images:', data.outboundFlightImages);
    doc.addPage();
    addPageBackground();
    addPlaneLogoBottom();
    
    doc.font("Helvetica-Bold").fontSize(18).fillColor(textColor).text("VUELO IDA", leftMargin, 80, { align: "center", width: contentWidth });
    
    // Generar texto de equipajes dinámicamente
    const baggageItems = ["PERSONAL 8KG"];
    if (data.outboundCabinBaggage) {
      baggageItems.push("CABINA 10KG");
    }
    if (data.outboundHoldBaggage) {
      baggageItems.push("BODEGA 23KG");
    }
    const baggageText = baggageItems.join(" + ");
    
    doc.font("Helvetica-Bold").fontSize(12).fillColor(textColor).text(baggageText, leftMargin, 110, { align: "center", width: contentWidth });
    
    const termsHeight = calculateFlightTermsHeight();
    let flightImageY = 150;
    
    for (let index = 0; index < data.outboundFlightImages.length; index++) {
      const imageUrl = data.outboundFlightImages[index];
      console.log(`[PDF Generator] Processing outbound image ${index}:`, imageUrl);
      // Extract filename from URL (format: /api/images/filename.ext)
      const filename = imageUrl.split('/').pop();
      if (filename) {
        try {
          const fullPath = await getImagePathForPDF(filename);
          console.log(`[PDF Generator] Full path for image ${index}:`, fullPath);
          console.log(`[PDF Generator] File exists:`, fs.existsSync(fullPath));
          
          if (fs.existsSync(fullPath)) {
            try {
              // Get actual image dimensions by reading file buffer
              const imageBuffer = fs.readFileSync(fullPath);
              const dimensions = sizeOf(imageBuffer);
              const imageWidth = contentWidth;
              let imageHeight = dimensions.height && dimensions.width 
                ? (dimensions.height / dimensions.width) * imageWidth 
                : contentWidth * 0.6; // Fallback estimate
              
              // Check if image + terms fit on current page (reserve space for terms on last image)
              const isLastImage = index === data.outboundFlightImages.length - 1;
              const spaceNeeded = isLastImage ? imageHeight + termsHeight + 40 : imageHeight + 20;
              
              if (flightImageY + spaceNeeded > 750) {
                doc.addPage();
                addPageBackground();
                addPlaneLogoBottom();
                flightImageY = 80;
                
                // After moving to new page, check if image + terms still fit
                // If not, scale down the image to fit
                if (isLastImage && flightImageY + imageHeight + termsHeight + 40 > 750) {
                  const maxImageHeight = 750 - flightImageY - termsHeight - 40;
                  imageHeight = maxImageHeight;
                  console.log(`[PDF Generator] Scaled down outbound image ${index} to ${Math.round(imageHeight)}px to fit with terms`);
                }
              }
              
              // Insert image (scaled if necessary)
              doc.image(fullPath, leftMargin, flightImageY, {
                width: contentWidth,
                height: imageHeight,
                fit: [contentWidth, imageHeight]
              });
              
              console.log(`[PDF Generator] Successfully added outbound image ${index} (${Math.round(imageHeight)}px)`);
              flightImageY += imageHeight + 20;
            } catch (error) {
              console.error(`[PDF Generator] Error loading outbound flight image ${index}:`, error);
            }
          } else {
            console.error(`[PDF Generator] Image file not found at ${fullPath}`);
          }
        } catch (error) {
          console.error(`[PDF Generator] Error getting image path for ${filename}:`, error);
        }
      }
    }
    
    // Add flight terms and conditions after images (always on same page as last image)
    if (flightImageY > 80) {
      flightImageY += 20; // Add some spacing
      
      doc.font("Helvetica-Bold").fontSize(11).fillColor(textColor);
      doc.text("Términos y condiciones", leftMargin, flightImageY, { width: contentWidth });
      doc.moveDown(0.5);
      
      doc.font("Helvetica").fontSize(9).fillColor(textColor);
      
      const termsText = [
        "Los boletos de avión no son reembolsables.",
        "",
        "Una vez emitido el boleto no puede ser asignado a una persona o aerolínea diferente.",
        "",
        "Los cambios en los boletos pueden ocasionar cargos extra, están sujetos a disponibilidad, clase tarifaria y políticas de cada aerolínea al momento de solicitar el cambio.",
        "",
        "Para vuelos nacionales presentarse 2 horas antes de la salida del vuelo. Para vuelos internacionales presentarse 3 horas antes de la salida del vuelo."
      ];
      
      termsText.forEach(line => {
        if (line === "") {
          doc.moveDown(0.3);
        } else {
          doc.text(line, { width: contentWidth, align: "left" });
          doc.moveDown(0.3);
        }
      });
      
      doc.moveDown(0.3);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(textColor);
      doc.text("Tarifa Light:", { width: contentWidth });
      doc.moveDown(0.3);
      
      doc.font("Helvetica").fontSize(9).fillColor(textColor);
      const tarifaItems = [
        "Equipaje documentado : Desde $90 USD",
        "Reembolso : No incluido antes de la partida / No incluido después de la partida",
        "Equipaje de mano : 1 Pieza incluida (8 kg/115 cm lineales)",
        "Cambios : Desde $210 USD antes de la partida, aplica términos y condiciones, validar con la aerolínea / Desde $210 USD después de la partida, aplica términos y condiciones, validar con la aerolínea",
        "Artículo Personal : 1 pieza incluida"
      ];
      
      tarifaItems.forEach(item => {
        doc.text(item, { width: contentWidth, align: "left" });
        doc.moveDown(0.3);
      });
    }
  }

  doc.addPage();
  addPageBackground();
  addPlaneLogoBottom();

  doc.font("Helvetica-Bold").fontSize(14).fillColor(primaryColor);
  doc.text("Itinerario Detallado", leftMargin, 60);
  doc.moveDown(1.5);

  data.destinations.forEach((dest, destIndex) => {
    if (!dest.itinerary || dest.itinerary.length === 0) return;

    if (doc.y > 700) {
      doc.addPage();
      addPageBackground();
      addPlaneLogoBottom();
    }

    doc.font("Helvetica-Bold").fontSize(12).fillColor(primaryColor);
    const countryText = dest.country ? dest.country.toUpperCase() : "";
    doc.text(`${dest.name?.toUpperCase() || "DESTINO"} - ${countryText}`, leftMargin, doc.y);
    doc.moveDown(0.5);

    const destImages = getDestinationImageSet({ name: dest.name || "", country: dest.country || "" });
    if (destImages.length > 0) {
      const imageWidth = (contentWidth - 20) / 3;
      const imageHeight = 100;
      const currentY = doc.y;

      // For itinerary page, use images 4-6 (indices 3-5) if available, otherwise use first 3
      const imagesToShow = destImages.length >= 6 
        ? destImages.slice(3, 6)  // Use last 3 images (banderas, éfeso interior, éfeso arco)
        : destImages.slice(0, 3);  // Fallback to first 3 for other countries
      
      imagesToShow.forEach((imagePath, index) => {
        if (fs.existsSync(imagePath)) {
          try {
            const xPos = leftMargin + (index * (imageWidth + 10));
            doc.image(imagePath, xPos, currentY, {
              width: imageWidth,
              height: imageHeight,
              align: "center",
              valign: "center"
            });
            
            doc.rect(xPos, currentY, imageWidth, imageHeight).stroke(borderColor);
          } catch (error) {
            console.error(`Error loading destination image ${index + 1}:`, error);
          }
        }
      });

      doc.y = currentY + imageHeight + 15;
    }

    dest.itinerary.forEach((day) => {
      if (doc.y > 720) {
        doc.addPage();
        addPageBackground();
        addPlaneLogoBottom();
      }

      doc.font("Helvetica-Bold").fontSize(9).fillColor(textColor);
      doc.text(`Día ${day.dayNumber} | ${day.title}`, leftMargin, doc.y);
      doc.moveDown(0.3);
      
      doc.font("Helvetica").fontSize(8).fillColor(textColor);
      doc.text(day.description, leftMargin, doc.y, { width: contentWidth, align: "justify" });
      doc.moveDown(0.8);
    });

    doc.moveDown(0.5);
  });

  // For Turkey Esencial, show upgrade options or selected upgrade in blue box
  // Place after itinerary, before hotels section
  if (isTurkeyEsencial) {
    doc.moveDown(1);
    
    // Check if we need space for the upgrade section
    if (doc.y > 620) {
      doc.addPage();
      addPageBackground();
      addPlaneLogoBottom();
      doc.y = 80;
    }
    
    const boxY = doc.y;
    const boxPadding = 15;
    const boxColor = "#88bbcd"; // Light blue background
    const boxTextColor = "#1f2937"; // Dark text
    
    if (!data.turkeyUpgrade) {
      // No upgrade selected - show available upgrade options
      const boxHeight = 140; // Estimated height for the upgrade options
      
      // Draw blue background box
      doc.rect(leftMargin, boxY, contentWidth, boxHeight)
         .fillAndStroke(boxColor, "#5a9fb8");
      
      // Title
      doc.font("Helvetica-Bold").fontSize(12).fillColor(boxTextColor);
      doc.text(
        "MEJORA TU PLAN, GASTA MENOS EN DESTINO (VALOR POR PERSONA):",
        leftMargin + boxPadding,
        boxY + boxPadding,
        { width: contentWidth - (boxPadding * 2) }
      );
      
      let optionY = boxY + boxPadding + 25;
      doc.font("Helvetica").fontSize(9).fillColor(boxTextColor);
      
      // Option 1
      doc.font("Helvetica-Bold").fontSize(10).text(
        "+ 500 USD:",
        leftMargin + boxPadding,
        optionY,
        { continued: true }
      );
      doc.font("Helvetica").fontSize(9).text(
        " 8 almuerzos + 2 actividades Estambul",
        { width: contentWidth - (boxPadding * 2) }
      );
      optionY += 25;
      
      // Option 2
      doc.font("Helvetica-Bold").fontSize(10).text(
        "+ 770 USD:",
        leftMargin + boxPadding,
        optionY,
        { continued: true }
      );
      doc.font("Helvetica").fontSize(9).text(
        " Hotel céntrico Estambul + 8 almuerzos + 2 actividades Estambul",
        { width: contentWidth - (boxPadding * 2) }
      );
      optionY += 25;
      
      // Option 3
      doc.font("Helvetica-Bold").fontSize(10).text(
        "+1,100 USD:",
        leftMargin + boxPadding,
        optionY,
        { continued: true }
      );
      doc.font("Helvetica").fontSize(9).text(
        " Hotel céntrico Estambul + Hotel cueva Capadocia + 8 almuerzos + 2 actividades Estambul",
        { width: contentWidth - (boxPadding * 2) }
      );
      
      doc.y = boxY + boxHeight + 10;
    } else {
      // Upgrade selected - show which upgrade was included
      const upgradeOptions: { [key: string]: { description: string; price: string } } = {
        "option1": {
          description: "8 almuerzos + 2 actividades Estambul",
          price: "500 USD"
        },
        "option2": {
          description: "Hotel céntrico Estambul + 8 almuerzos + 2 actividades Estambul",
          price: "770 USD"
        },
        "option3": {
          description: "Hotel céntrico Estambul + Hotel cueva Capadocia + 8 almuerzos + 2 actividades Estambul",
          price: "1,100 USD"
        }
      };
      
      const selectedUpgrade = data.turkeyUpgrade ? upgradeOptions[data.turkeyUpgrade] : undefined;
      
      if (selectedUpgrade) {
        const boxHeight = 80;
        
        // Draw blue background box
        doc.rect(leftMargin, boxY, contentWidth, boxHeight)
           .fillAndStroke(boxColor, "#5a9fb8");
        
        // Title
        doc.font("Helvetica-Bold").fontSize(12).fillColor(boxTextColor);
        doc.text(
          "MEJORA INCLUIDA EN ESTA COTIZACIÓN:",
          leftMargin + boxPadding,
          boxY + boxPadding,
          { width: contentWidth - (boxPadding * 2) }
        );
        
        doc.moveDown(0.5);
        
        // Description
        doc.font("Helvetica").fontSize(10).fillColor(boxTextColor);
        doc.text(
          `• ${selectedUpgrade.description}`,
          leftMargin + boxPadding,
          doc.y,
          { width: contentWidth - (boxPadding * 2) }
        );
        
        doc.moveDown(0.5);
        
        // Price
        doc.font("Helvetica-Bold").fontSize(10).fillColor(boxTextColor);
        doc.text(
          `Valor adicional: ${selectedUpgrade.price} por persona`,
          leftMargin + boxPadding,
          doc.y,
          { width: contentWidth - (boxPadding * 2) }
        );
        
        doc.y = boxY + boxHeight + 10;
      }
    }
    
    doc.moveDown(1);
  }

  const allHotels: Hotel[] = [];
  data.destinations.forEach(dest => {
    if (dest.hotels && dest.hotels.length > 0) {
      allHotels.push(...dest.hotels);
    }
  });

  if (allHotels.length > 0) {
    if (doc.y > 680) {
      doc.addPage();
      addPageBackground();
      addPlaneLogoBottom();
    }

    doc.font("Helvetica-Bold").fontSize(11).fillColor(textColor);
    doc.text("HOTELES PREVISTOS O SIMILARES", leftMargin, doc.y);
    doc.moveDown(0.5);

    doc.font("Helvetica").fontSize(8).fillColor(textColor);
    const hotelGroups: { [key: string]: Hotel[] } = {};
    allHotels.forEach(hotel => {
      const location = hotel.location || "General";
      if (!hotelGroups[location]) {
        hotelGroups[location] = [];
      }
      hotelGroups[location].push(hotel);
    });

    Object.entries(hotelGroups).forEach(([location, hotels]) => {
      // Sort hotels by category (5* first, then 4*, etc.) and then alphabetically
      const sortedHotels = hotels.sort((a, b) => {
        const categoryA = a.category || '';
        const categoryB = b.category || '';
        
        // Extract star rating (5*, 4*, etc.)
        const starsA = parseInt(categoryA.match(/\d+/)?.[0] || '0');
        const starsB = parseInt(categoryB.match(/\d+/)?.[0] || '0');
        
        // Sort by stars descending (5* before 4*)
        if (starsB !== starsA) {
          return starsB - starsA;
        }
        
        // If same stars, sort alphabetically by name
        return (a.name || '').localeCompare(b.name || '');
      });
      
      // Build hotel names string and replace Turkish İ with regular I for PDF compatibility
      const hotelNames = sortedHotels
        .map(h => `${h.name}${h.category ? ` ${h.category}` : ""}`)
        .join(" - ")
        .replace(/İ/g, 'I'); // Replace Turkish İ with regular I
      
      doc.font("Helvetica-Bold").fontSize(8).fillColor(primaryColor);
      doc.text(`${location.toUpperCase()}:`, leftMargin, doc.y, { continued: true });
      
      doc.font("Helvetica").fontSize(8).fillColor(textColor);
      doc.text(` ${hotelNames}`, { width: contentWidth });
      
      // Add Le Bleu upgrade note for Kusadasi/Esmirna location
      if (location === 'Kusadasi/Esmirna') {
        doc.font("Helvetica-Oblique").fontSize(8).fillColor(textColor);
        doc.text(" (Posible mejora en el Hotel Le Bleu sujeta a disponibilidad)", { width: contentWidth });
      }
      
      doc.moveDown(0.5);
    });

    doc.moveDown(1);
  }

  if (doc.y > 600) {
    doc.addPage();
    addPageBackground();
    addPlaneLogoBottom();
  }

  const allInclusions: Inclusion[] = [];
  const allExclusions: Exclusion[] = [];
  data.destinations.forEach(dest => {
    if (dest.inclusions && dest.inclusions.length > 0) {
      allInclusions.push(...dest.inclusions);
    }
    if (dest.exclusions && dest.exclusions.length > 0) {
      allExclusions.push(...dest.exclusions);
    }
  });

  const uniqueInclusions = Array.from(new Set(allInclusions.map(i => i.item)));
  const uniqueExclusions = Array.from(new Set(allExclusions.map(e => e.item)));

  doc.font("Helvetica-Bold").fontSize(11).fillColor(primaryColor);
  doc.text("I N C L U I D O", leftMargin, doc.y);
  doc.moveDown(0.5);
  
  doc.font("Helvetica").fontSize(8).fillColor(textColor);
  
  if (uniqueInclusions.length > 0) {
    uniqueInclusions.forEach(item => {
      if (doc.y > 750) {
        doc.addPage();
        addPageBackground();
        addPlaneLogoBottom();
      }
      doc.text(`• ${item}`, leftMargin + 10, doc.y);
      doc.moveDown(0.3);
    });
  } else {
    const defaultIncluded = [
      `${totalNights} noches de alojamiento en hoteles previstos o categoría similar`,
      `${totalNights} desayunos`,
      "Guía autorizado que habla español",
      "Traslados con asistente autorizado que habla español (IN - OUT)",
      "Impuesto IVA",
      "Todas las entradas del itinerario según programa",
      "Asistencia médica",
      "Vuelos internacionales - maleta personal + cabina"
    ];
    defaultIncluded.forEach(item => {
      doc.text(`• ${item}`, leftMargin + 10, doc.y);
      doc.moveDown(0.3);
    });
  }
  
  doc.moveDown(1);

  doc.font("Helvetica-Bold").fontSize(11).fillColor(primaryColor);
  doc.text("E X C L U I D O", leftMargin, doc.y);
  doc.moveDown(0.5);
  
  doc.font("Helvetica").fontSize(8).fillColor(textColor);
  
  if (uniqueExclusions.length > 0) {
    uniqueExclusions.forEach(item => {
      if (doc.y > 750) {
        doc.addPage();
        addPageBackground();
        addPlaneLogoBottom();
      }
      doc.text(`• ${item}`, leftMargin + 10, doc.y);
      doc.moveDown(0.3);
    });
  } else {
    const defaultExcluded = [
      "Excursiones opcionales",
      "Bebidas en las comidas",
      "Gastos personales",
      "Equipaje extra",
      "Propinas del guía y chofer US$ 50 por persona **Obligatorias**"
    ];
    defaultExcluded.forEach(item => {
      doc.text(`• ${item}`, leftMargin + 10, doc.y);
      doc.moveDown(0.3);
    });
  }

  doc.moveDown(2);

  if (doc.y > 680) {
    doc.addPage();
    addPageBackground();
    addPlaneLogoBottom();
  }

  doc.font("Helvetica-Bold").fontSize(10).fillColor(textColor);
  doc.text("Términos Generales y Condiciones", leftMargin, doc.y);
  doc.moveDown(0.5);
  
  doc.font("Helvetica").fontSize(7.5).fillColor(textColor);
  const terms = `Servicios: Cambios en el itinerario posibles según condiciones y disponibilidad del guía. Hotelería: Alojamiento en hoteles de primera entre 4 y 5 estrellas similares a los planificados. Excursiones: No reembolsos por inasistencias. Traslados: Recogida y salida sin acceso al aeropuerto. Espera máxima de 2 horas tras aterrizaje. Documentación: Colombianos exentos de visado. Pasaporte con mínimo 6 meses de validez. Consultar requerimientos para otras nacionalidades.`;
  doc.text(terms, leftMargin, doc.y, { width: contentWidth, align: "justify" });
  
  doc.moveDown(2);

  // VUELOS DE REGRESO - última página del PDF
  if (data.includeFlights && data.returnFlightImages && data.returnFlightImages.length > 0) {
    console.log('[PDF Generator] Return flight images:', data.returnFlightImages);
    doc.addPage();
    addPageBackground();
    addPlaneLogoBottom();
    
    doc.font("Helvetica-Bold").fontSize(18).fillColor(textColor).text("VUELO REGRESO", leftMargin, 80, { align: "center", width: contentWidth });
    
    // Generar texto de equipajes dinámicamente
    const baggageItems = ["PERSONAL 8KG"];
    if (data.returnCabinBaggage) {
      baggageItems.push("CABINA 10KG");
    }
    if (data.returnHoldBaggage) {
      baggageItems.push("BODEGA 23KG");
    }
    const baggageText = baggageItems.join(" + ");
    
    doc.font("Helvetica-Bold").fontSize(12).fillColor(textColor).text(baggageText, leftMargin, 110, { align: "center", width: contentWidth });
    
    const termsHeight = calculateFlightTermsHeight();
    let flightImageY = 150;
    
    for (let index = 0; index < data.returnFlightImages.length; index++) {
      const imageUrl = data.returnFlightImages[index];
      console.log(`[PDF Generator] Processing return image ${index}:`, imageUrl);
      // Extract filename from URL (format: /api/images/filename.ext)
      const filename = imageUrl.split('/').pop();
      if (filename) {
        try {
          const fullPath = await getImagePathForPDF(filename);
          console.log(`[PDF Generator] Full path for image ${index}:`, fullPath);
          console.log(`[PDF Generator] File exists:`, fs.existsSync(fullPath));
          
          if (fs.existsSync(fullPath)) {
            try {
              // Get actual image dimensions by reading file buffer
              const imageBuffer = fs.readFileSync(fullPath);
              const dimensions = sizeOf(imageBuffer);
              const imageWidth = contentWidth;
              let imageHeight = dimensions.height && dimensions.width 
                ? (dimensions.height / dimensions.width) * imageWidth 
                : contentWidth * 0.6; // Fallback estimate
              
              // Check if image + terms fit on current page (reserve space for terms on last image)
              const isLastImage = index === data.returnFlightImages.length - 1;
              const spaceNeeded = isLastImage ? imageHeight + termsHeight + 40 : imageHeight + 20;
              
              if (flightImageY + spaceNeeded > 750) {
                doc.addPage();
                addPageBackground();
                addPlaneLogoBottom();
                flightImageY = 80;
                
                // After moving to new page, check if image + terms still fit
                // If not, scale down the image to fit
                if (isLastImage && flightImageY + imageHeight + termsHeight + 40 > 750) {
                  const maxImageHeight = 750 - flightImageY - termsHeight - 40;
                  imageHeight = maxImageHeight;
                  console.log(`[PDF Generator] Scaled down return image ${index} to ${Math.round(imageHeight)}px to fit with terms`);
                }
              }
              
              // Insert image (scaled if necessary)
              doc.image(fullPath, leftMargin, flightImageY, {
                width: contentWidth,
                height: imageHeight,
                fit: [contentWidth, imageHeight]
              });
              
              console.log(`[PDF Generator] Successfully added return image ${index} (${Math.round(imageHeight)}px)`);
              flightImageY += imageHeight + 20;
            } catch (error) {
              console.error(`[PDF Generator] Error loading return flight image ${index}:`, error);
            }
          } else {
            console.error(`[PDF Generator] Image file not found at ${fullPath}`);
          }
        } catch (error) {
          console.error(`[PDF Generator] Error getting image path for ${filename}:`, error);
        }
      }
    }
    
    // Add flight terms and conditions after images (always on same page as last image)
    if (flightImageY > 80) {
      flightImageY += 20; // Add some spacing
      
      doc.font("Helvetica-Bold").fontSize(11).fillColor(textColor);
      doc.text("Términos y condiciones", leftMargin, flightImageY, { width: contentWidth });
      doc.moveDown(0.5);
      
      doc.font("Helvetica").fontSize(9).fillColor(textColor);
      
      const termsText = [
        "Los boletos de avión no son reembolsables.",
        "",
        "Una vez emitido el boleto no puede ser asignado a una persona o aerolínea diferente.",
        "",
        "Los cambios en los boletos pueden ocasionar cargos extra, están sujetos a disponibilidad, clase tarifaria y políticas de cada aerolínea al momento de solicitar el cambio.",
        "",
        "Para vuelos nacionales presentarse 2 horas antes de la salida del vuelo. Para vuelos internacionales presentarse 3 horas antes de la salida del vuelo."
      ];
      
      termsText.forEach(line => {
        if (line === "") {
          doc.moveDown(0.3);
        } else {
          doc.text(line, { width: contentWidth, align: "left" });
          doc.moveDown(0.3);
        }
      });
      
      doc.moveDown(0.3);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(textColor);
      doc.text("Tarifa Light:", { width: contentWidth });
      doc.moveDown(0.3);
      
      doc.font("Helvetica").fontSize(9).fillColor(textColor);
      const tarifaItems = [
        "Equipaje documentado : Desde $90 USD",
        "Reembolso : No incluido antes de la partida / No incluido después de la partida",
        "Equipaje de mano : 1 Pieza incluida (8 kg/115 cm lineales)",
        "Cambios : Desde $210 USD antes de la partida, aplica términos y condiciones, validar con la aerolínea / Desde $210 USD después de la partida, aplica términos y condiciones, validar con la aerolínea",
        "Artículo Personal : 1 pieza incluida"
      ];
      
      tarifaItems.forEach(item => {
        doc.text(item, { width: contentWidth, align: "left" });
        doc.moveDown(0.3);
      });
    }
  }

  // Helper function to normalize text for Turkey detection
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // Remove accents
  };

  // ACTIVIDADES OPCIONALES - Detectar si incluye Turquía
  const hasTurkeyDestinations = data.destinations.some((dest) => {
    const country = normalizeText(dest.country || "");
    const name = normalizeText(dest.name || "");
    return country.includes("turqu") || country.includes("turkey") || 
           name.includes("turqu") || name.includes("turkey");
  });


  // PÁGINA DE ASISTENCIA MÉDICA Y TOURS OPCIONALES
  doc.addPage();
  addPageBackground();
  addPlaneLogoBottom();
  
  const topMargin = 80;
  const bottomMargin = 50;
  const availableHeight = pageHeight - topMargin - bottomMargin;
  
  doc.font("Helvetica-Bold").fontSize(18).fillColor(textColor);
  doc.text("ASISTENCIA MEDICA PARA TU VIAJE", leftMargin, topMargin, { align: "center", width: contentWidth });
  
  doc.moveDown(2);

  // Primero: Agregar imagen de asistencia médica
  const medicalAssistanceImagePath = path.join(process.cwd(), "server", "assets", "medical-assistance.png");
  const medicalImageHeight = hasTurkeyDestinations ? 180 : 400;
  
  if (fs.existsSync(medicalAssistanceImagePath)) {
    try {
      const stats = fs.statSync(medicalAssistanceImagePath);
      if (stats.size > 0) {
        const imageY = topMargin + 60;
        
        doc.image(medicalAssistanceImagePath, leftMargin, imageY, {
          fit: [contentWidth, medicalImageHeight],
          align: "center"
        });
        
        doc.y = imageY + medicalImageHeight + 30;
        
        console.log('[PDF Generator] Medical assistance image added successfully');
      } else {
        console.warn('[PDF Generator] Medical assistance image file is empty');
      }
    } catch (error) {
      console.error('[PDF Generator] Error loading medical assistance image:', error);
    }
  } else {
    console.warn(`[PDF Generator] Medical assistance image not found at ${medicalAssistanceImagePath}`);
  }

  // Segundo: Agregar tabla de tours opcionales (solo para Turkey)
  if (hasTurkeyDestinations) {

    // Header azul "TOUR OPCIONALES"
    const headerHeight = 30;
    const headerY = doc.y;
    doc.rect(leftMargin, headerY, contentWidth, headerHeight).fill("#1e40af");
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#ffffff");
    doc.text("TOUR OPCIONALES", leftMargin, headerY + 10, { align: "center", width: contentWidth });
    doc.y = headerY + headerHeight + 5;

    // Configuración de tabla compacta
    const tableRowBg = "#e0e7ff";
    const tableTextColor = "#1f2937";
    const priceColWidth = 90;
    const nameColWidth = contentWidth - priceColWidth;
    
    // Helper para agregar fila de tabla compacta
    const addTableRow = (name: string, price: string) => {
      const rowHeight = 11;
      const currentY = doc.y;
      
      doc.rect(leftMargin, currentY, contentWidth, rowHeight).fill(tableRowBg);
      
      // Nombre del tour en Helvetica normal
      doc.fillColor(tableTextColor).font("Helvetica").fontSize(7);
      doc.text(name, leftMargin + 3, currentY + 2.5, { 
        width: nameColWidth - 6,
        continued: false
      });
      
      // Precio en negrita
      doc.font("Helvetica-Bold").fontSize(8);
      doc.text(price, leftMargin + nameColWidth, currentY + 2.5, { 
        width: priceColWidth - 3,
        align: "right",
        continued: false
      });
      
      doc.rect(leftMargin, currentY, nameColWidth, rowHeight).stroke("#3b82f6");
      doc.rect(leftMargin + nameColWidth, currentY, priceColWidth, rowHeight).stroke("#3b82f6");
      
      doc.y = currentY + rowHeight;
    };

    // Solo tours individuales (sin combos)
    const tours = [
      { name: "Paseo en Globo (de 15/Mar 2026 a 31/Oct 2026)", price: "415 USD" },
      { name: "Paseo en Globo (de 01/Nov 2026 a 14/Mar 2027)", price: "384 USD" },
      { name: "Paseo Bósforo con almuerzo", price: "154 USD" },
      { name: "Paseo Clasico con almuerzo", price: "224 USD" },
      { name: "Noche Turca en Capadócia (solo show)", price: "116 USD" },
      { name: "Noche Turca en Capadócia cena show", price: "139 USD" },
      { name: "Noche Turca en   7F Ö ui (en barco con cena show)", price: "154 USD" },
      { name: "Erciyes Ski", price: "200 USD" },
      { name: "Cappa Park", price: "200 USD" },
      { name: "SkyDinner", price: "324 USD" },
      { name: "Jeep Safari", price: "108 USD" },
      { name: "6 almuerzos (en las ciudades del itinerario, menos en Estambul)", price: "185 USD" },
      { name: "E-SIM (3GB)", price: "31 USD" },
      { name: "Entrada al Palacio de Topkapi", price: "110 USD" }
    ];

    tours.forEach(tour => {
      addTableRow(tour.name, tour.price);
    });

    doc.moveDown(0.3);

    // Nota sobre fee bancario compacta
    doc.fillColor("#dc2626").font("Helvetica-Bold").fontSize(9);
    doc.text("Fee bancario no incluido, 2.5% sobre el total", leftMargin, doc.y, { 
      align: "center", 
      width: contentWidth 
    });

    doc.moveDown(1);

    // COMBO 1 - Sección separada con header azul
    const combo1HeaderY = doc.y;
    // Dibujar header azul
    doc.rect(leftMargin, combo1HeaderY, contentWidth, 20)
       .fillAndStroke("#1e40af", "#1e40af");
    // Agregar título "Combo 1" en el header
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10);
    doc.text("Combo 1", leftMargin, combo1HeaderY + 6, { width: contentWidth, align: "center" });
    
    doc.y = combo1HeaderY + 20;

    // Ítems del Combo 1 con cuadrículas individuales
    const combo1Items = [
      "PASEO EN GLOBO",
      "BÓSFORO con almuerzo",
      "CLASICO con almuerzo",
      "NOCHE TURCA Capadocia sin cena",
      "JEEP SAFARI - Sujeto al clima"
    ];
    
    const rowHeight = 12;
    const priceBoxWidth = 100;
    const itemsWidth = contentWidth - priceBoxWidth - 5;
    
    const combo1GridStartY = doc.y;
    let currentY = combo1GridStartY;
    
    // Dibujar cada ítem en su propia celda
    combo1Items.forEach((item, index) => {
      doc.rect(leftMargin, currentY, itemsWidth, rowHeight)
         .fillAndStroke(tableRowBg, "#3b82f6");
      
      doc.fillColor(tableTextColor).font("Helvetica").fontSize(7);
      doc.text(item, leftMargin + 3, currentY + 3, { width: itemsWidth - 6, continued: false });
      
      currentY += rowHeight;
    });
    
    // Precio del Combo 1 en la esquina derecha (abarca todas las filas)
    const combo1TotalHeight = rowHeight * combo1Items.length;
    const combo1PriceX = leftMargin + itemsWidth + 5;
    
    doc.rect(combo1PriceX, combo1GridStartY, priceBoxWidth, combo1TotalHeight)
       .fillAndStroke("#1e40af", "#1e40af");
    
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(18);
    const priceTextY = combo1GridStartY + (combo1TotalHeight / 2) - 9;
    doc.text("1,020 USD", combo1PriceX, priceTextY, { width: priceBoxWidth, align: "center" });
    
    doc.y = currentY + 5;

    // COMBO 2 - Sección separada con header azul
    const combo2HeaderY = doc.y;
    // Dibujar header azul
    doc.rect(leftMargin, combo2HeaderY, contentWidth, 20)
       .fillAndStroke("#1e40af", "#1e40af");
    // Agregar título "Combo 2" en el header
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10);
    doc.text("Combo 2", leftMargin, combo2HeaderY + 6, { width: contentWidth, align: "center" });
    
    doc.y = combo2HeaderY + 20;

    // Ítems del Combo 2 con cuadrículas individuales
    const combo2Items = [
      "PASEO EN GLOBO",
      "NOCHE TURCA Capadocia sin cena",
      "JEEP SAFARI - Sujeto al clima"
    ];
    
    const combo2GridStartY = doc.y;
    let currentY2 = combo2GridStartY;
    
    // Dibujar cada ítem en su propia celda
    combo2Items.forEach((item, index) => {
      doc.rect(leftMargin, currentY2, itemsWidth, rowHeight)
         .fillAndStroke(tableRowBg, "#3b82f6");
      
      doc.fillColor(tableTextColor).font("Helvetica").fontSize(7);
      doc.text(item, leftMargin + 3, currentY2 + 3, { width: itemsWidth - 6, continued: false });
      
      currentY2 += rowHeight;
    });
    
    // Precio del Combo 2 en la esquina derecha (abarca todas las filas)
    const combo2TotalHeight = rowHeight * combo2Items.length;
    const combo2PriceX = leftMargin + itemsWidth + 5;
    
    doc.rect(combo2PriceX, combo2GridStartY, priceBoxWidth, combo2TotalHeight)
       .fillAndStroke("#1e40af", "#1e40af");
    
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(18);
    const priceText2Y = combo2GridStartY + (combo2TotalHeight / 2) - 9;
    doc.text("660 USD", combo2PriceX, priceText2Y, { width: priceBoxWidth, align: "center" });
    
    doc.y = currentY2 + 10;

    console.log('[PDF Generator] Turkey optional tours table added successfully (compact version with combos)');
  }

  // PÁGINAS DE POLÍTICAS Y DÍAS FESTIVOS - Solo para Turquía Esencial
  if (isTurkeyEsencial) {
    // PÁGINA DE POLÍTICAS Y CONDICIONES
    doc.addPage();
    addPageBackground();
    addPlaneLogoBottom();
    doc.y = topMargin;

    // Función auxiliar para agregar secciones de políticas
    const addPolicySection = (title: string, content: string[]) => {
      // Verificar si hay espacio para el título y al menos 2 líneas de contenido
      if (doc.y > 680) {
        doc.addPage();
        addPageBackground();
        addPlaneLogoBottom();
        doc.y = topMargin;
      }

      doc.font("Helvetica-Bold").fontSize(9).fillColor(primaryColor);
      doc.text(title, leftMargin, doc.y);
      doc.moveDown(0.3);

      doc.font("Helvetica").fontSize(7).fillColor(textColor);
      content.forEach(line => {
        if (doc.y > 750) {
          doc.addPage();
          addPageBackground();
          addPlaneLogoBottom();
          doc.y = topMargin;
        }
        doc.text(line, leftMargin, doc.y, { width: contentWidth, align: "justify" });
        doc.moveDown(0.4);
      });
      doc.moveDown(0.5);
    };

    // Políticas de cancelación
    addPolicySection("CANCELACIONES DE SERVICIOS:", [
      "Para particulares (Excepto vuelos ya emitidos que se cobrarán 100%)",
      "• Hasta 30 días antes de la llegada, sin gastos de cancelación.",
      "• Entre 29-11 días se cobra 50%. (Excepto vuelos ya emitidos que se cobrarán 100%)",
      "• Entre 10 a 1 días antes de la llegada, se cobrará el 100% de gastos de cancelación.",
      "Todas las políticas de cancelación se confirmarán junto con la confirmación del viaje. Grupos consultar."
    ]);

    // Propinas
    addPolicySection("PROPINAS:", [
      "En los restaurantes las propinas y bebidas no están incluidas (se sugiere un 10% en la factura consultar ya que en algunos casos el restaurante puede ya tenerlo incluido). Al finalizar los tours o circuitos se suele dar una propina al guía y al conductor. Se sugiere 5 USD por día por persona, que para ellos es obligatorio."
    ]);

    // Servicios
    addPolicySection("SERVICIOS:", [
      "El orden del itinerario, puede sufrir modificaciones sin previo aviso, según la disponibilidad del guía y sucesos que surjan por fuerza mayor en destino, para mejorar el rendimiento del circuito, como así también el orden de las excursiones y visitas también pueden ser modificadas por casos ajenos al guía y a Dorak."
    ]);

    // Equipaje
    addPolicySection("EQUIPAJE:", [
      "En el tour se permite una maleta de 23 kg y un equipaje de mano de 8 kg + bolsos de viaje. No hay disponibilidad para más equipaje. Lo mismo para los billetes aéreos internos/nacionales, que son estándar con maleta de 15 kg más equipaje de mano. Para aumentar los kilogramos de la maleta facturable consultar presupuesto."
    ]);

    // Hotelería
    addPolicySection("HOTELERÍA:", [
      "Pueden ser similares a los previstos, no sólo los mencionados en este circuito. Las categorías de hoteles que recomendamos corresponden a la clasificación oficial del Ministerio de Turismo de Turquía. En la mayoría de los hoteles las habitaciones triples suelen ser habitaciones dobles con cama supletoria (sofá cama o roll away)."
    ]);

    // Ubicación de hoteles
    addPolicySection("UBICACIÓN DE HOTELES EN ESTAMBUL:", [
      "Al escoger los hoteles para la estancia del pasajero deben tener en cuenta la ubicación de estos. En Estambul, los hoteles situados en la parte antigua tienen la ventaja de encontrarse más cerca a los museos y monumentos, pero por la noche, en esta zona tiene menos diversidad en cuanto a restaurantes y vida nocturna. Si el pasajero decide alojarse en la parte nueva (centro) (donde también se encuentran la mayoría de los hoteles de 5*), encontrará una gran variedad de tiendas modernas, restaurantes, bares y discotecas."
    ]);

    // Comidas
    addPolicySection("COMIDAS EN LOS HOTELES:", [
      "La media pensión en los hoteles suele consistir en un desayuno buffet y una cena servida en el restaurante principal del hotel. La media pensión es estándar durante el periodo del tour en Anatolia. En Estambul es sólo con desayuno (a menos que se solicite pagando un suplemento)."
    ]);

    // Excursiones
    addPolicySection("EXCURSIONES O VISITAS:", [
      "En caso de retraso por parte de algún pasajero y no puede hacer o perdió la excursión, no se devuelve el dinero ni se compensa por otra excursión. Solicitamos respetar el horario indicado por el guía en cada excursión cuando den minutos libres en alguna visita, caso contrario que el pasajero no se presente, el guía deberá seguir con el recorrido del circuito, de esta manera el pasajero deberá volver por sus propios medios. Las excursiones al aire libre, siempre estarán sujetas al clima."
    ]);

    // WiFi
    addPolicySection("WIFI EN OMNIBUS:", [
      "El wifi provisto en el autobús durante todo el viaje está restringido por antenas de carretera e inconsistente debido a la cantidad de pasajeros que usan la misma red, por lo que es mejor usarlo solo para mensajes de WhatsApp o contenido que no requiera altos datos de red."
    ]);

    // Globo
    addPolicySection("GLOBO:", [
      "En Capadocia el globo está sujeto a cambios y disponibilidad y cada grupo tiene su reserva el primer día después de llegar a la ciudad. En caso de cancelación por condiciones climáticas, las reservas para los días siguientes estarán sujetas a disponibilidad. Si el vuelo en globo no tiene lugar en Capadocia, existe una segunda oportunidad en la ciudad de Pamukkale. Paseo en Globo, solo se devuelve el dinero si no se realiza por cuestiones climáticas tanto en Capadoccia como en Pamukkale. Si el pasajero tiene la posibilidad de realizar el paseo en globo en Pamukkale y el mismo no desea, no se devolverá el dinero."
    ]);

    // Excursiones (segunda parte)
    addPolicySection("EXCURSIONES:", [
      "Las opciones de excursiones ofrecidas por Dorak Latin son exclusivas para compras con Dorak, no estando permitida la compra de las mismas opciones con otros proveedores. Una vez reservado el programa el cliente acepta las condiciones indicadas."
    ]);

    // Traslados
    addPolicySection("TRASLADOS DE LLEGADA Y SALIDAS:", [
      "No se permite el ingreso de guías y transportistas al aeropuerto. Te estaremos esperando en la salida de la puerta 8 con el cartel de Dorak Latin. Desde el aterrizaje del vuelo tendrás que esperar 2 horas. Recuerde que este es un servicio regular. Le pedimos que se dirija a la salida lo antes posible. El transferista dará las primeras informaciones sobre (dinero, cambio, posibilidad de excursiones, etc) aclarando todas las dudas turísticas que uno podrá tener.",
      "Le solicitamos respetar el tiempo indicado por el guía en cada tour cuando permite tiempo libre en una visita, de lo contrario el pasajero no se presenta, el guía deberá continuar con la ruta del circuito, por lo que el pasajero deberá regresar por su cuenta. Le pedimos que guarde el número de teléfono de guardia antes de salir de su destino, en caso de que tenga algún inconveniente en el aeropuerto de Estambul y no pueda salir a tiempo.",
      "En caso de cambios en los horarios de los vuelos, es estrictamente necesario notificar el cambio al menos 48 horas antes de la realización del servicio de traslado.",
      "Dato de importancia - en el aeropuerto tienen una hora gratis de wifi, recomendamos no se conecten enseguida, sino esperar un poco más de una hora, para no quedarse sin conexión y puedan comunicarse con nuestro equipo, en caso de inconvenientes, como retraso de valija, detención en aduana, etc, solo emergencias.",
      "Para el traslado de salida, dejaremos el día anterior el horario de Pick up. También solicitamos puntualidad, para no retrasar la recolección de pasajeros y llegar a tiempo para el embarque, evitemos pérdidas de vuelos.",
      "Horarios del circuito, deben ser comunicado por el guía, en caso de no haber escuchado o que el guía no lo comentó, por favor consultarle antes de que el guía los deje en el hotel y se retire ese día, de esta manera evitaremos problemas en destino sobre los horarios de los servicios del día siguiente y evitamos la diferencia horaria entre países."
    ]);

    console.log('[PDF Generator] Turkey policies page added successfully');

    // DÍAS FESTIVOS 2026 - Continuar en la misma página
    doc.moveDown(2);

    // Título de días festivos
    doc.font("Helvetica-Bold").fontSize(14).fillColor(primaryColor);
    doc.text("DÍAS FESTIVOS 2026 - TURQUÍA", leftMargin, doc.y, { align: "center", width: contentWidth });
    doc.moveDown(2);

    // Lista de días festivos
    const holidays = [
      {
        date: "Enero",
        description: "Feriado de año nuevo. Los bazares están cerrados."
      },
      {
        date: "30 marzo",
        description: "1º día del feriado religioso, no se harán visitas (bazares y algunos museos cerrados)."
      },
      {
        date: "31 marzo - 01 abril",
        description: "Feriado religioso, se realizan visitas pero el gran bazar y bazar de las especias se encuentran cerrados."
      },
      {
        date: "23 de abril",
        description: "Feriado nacional, puede haber cambios en el orden de las visitas. Los bazares están cerrados."
      },
      {
        date: "01 de mayo",
        description: "Feriado nacional. Los bazares están cerrados."
      },
      {
        date: "06 de mayo",
        description: "Feriado nacional, solo puede haber cambios en el orden de las visitas. Los bazares están cerrados."
      },
      {
        date: "06 junio",
        description: "1º día del feriado religioso, no se harán visitas (bazares y algunos museos cerrados)."
      },
      {
        date: "15 julio",
        description: "Feriado nacional, puede haber cambios en el orden de las visitas. Los bazares están cerrados."
      },
      {
        date: "30 agosto",
        description: "Feriado nacional, solo puede haber cambios en el orden de las visitas. Los bazares están cerrados."
      }
    ];

    doc.font("Helvetica").fontSize(8).fillColor(textColor);
    
    holidays.forEach((holiday, index) => {
      if (doc.y > 720) {
        doc.addPage();
        addPageBackground();
        addPlaneLogoBottom();
        doc.y = topMargin;
      }

      const rowY = doc.y;
      const rowHeight = 25;

      // Fondo alternado para filas
      if (index % 2 === 0) {
        doc.rect(leftMargin, rowY, contentWidth, rowHeight).fill("#e0e7ff");
      }

      // Fecha en negrita
      doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(8);
      doc.text(holiday.date, leftMargin + 5, rowY + 5, { width: 120 });

      // Descripción
      doc.fillColor(textColor).font("Helvetica").fontSize(7);
      doc.text(holiday.description, leftMargin + 130, rowY + 5, { 
        width: contentWidth - 135,
        align: "left"
      });

      // Borde de la fila
      doc.rect(leftMargin, rowY, contentWidth, rowHeight).stroke("#3b82f6");

      doc.y = rowY + rowHeight;
    });

    console.log('[PDF Generator] Turkey holidays page added successfully');
  }

  return doc;
}
