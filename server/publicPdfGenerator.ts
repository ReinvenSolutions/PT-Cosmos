import PDFDocument from "pdfkit";
import { Destination, ItineraryDay, Hotel, Inclusion, Exclusion, formatUSD, formatDate } from "@shared/schema";
import { getDestinationImages, getDestinationImageSet } from "./destination-images";
import { getImagePathForPDF } from "./upload";
import fs from "fs";
import path from "path";

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
        const logoX = leftMargin;
        const logoY = pageHeight - 70;
        
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

  // Add Special Offer banner on first page only (top-right corner) - smaller size
  const specialOfferPath = path.join(process.cwd(), "server", "assets", "special-offer-banner.png");
  
  if (fs.existsSync(specialOfferPath)) {
    try {
      // Smaller banner, better positioned in top-right corner
      const bannerWidth = 140;
      const bannerX = pageWidth - bannerWidth - 5;
      const bannerY = 5;
      
      doc.image(specialOfferPath, bannerX, bannerY, { width: bannerWidth });
      console.log("[PDF Generator] Special offer banner added successfully");
    } catch (error) {
      console.error("[PDF Generator] Error loading special offer banner:", error);
    }
  }

  doc.font("Helvetica-Bold").fontSize(11).fillColor(textColor);
  doc.text("S U   V I A J E   A :", leftMargin, 70);

  // Add plane logo on first page after "SU VIAJE A:" text - better aligned vertically
  if (fs.existsSync(planeLogoPath)) {
    try {
      const firstPageLogoWidth = 60;
      const textWidth = doc.widthOfString("S U   V I A J E   A :");
      const firstPageLogoX = leftMargin + textWidth + 15;
      const firstPageLogoY = 65; // Moved up to align better with text
      
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
  
  // Add RNT and creation date above the main image
  const currentDate = formatDate(new Date());
  doc.font("Helvetica").fontSize(9).fillColor("#1f2937");
  doc.text("RNT No.240799", leftMargin, mainImageY - 15);
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
  
  // For Turkey destinations, use hotels data with specific stop numbers
  const isTurkey = data.destinations.some(d => 
    d.country?.toLowerCase().includes('turqu') || 
    d.country?.toLowerCase().includes('turkey')
  );
  
  if (isTurkey && data.destinations[0]?.hotels && data.destinations[0].hotels.length > 0) {
    // Define specific order for Turkey with custom stop numbers
    const turkeyStopNumbers: { [key: string]: number } = {
      'Estambul': 1,
      'Capadocia': 3,
      'Pamukkale': 4,
      'Kusadasi/Esmirna': 5
    };
    
    let estambulNightsAdded = false;
    
    data.destinations[0].hotels.forEach(hotel => {
      const location = hotel.location || "";
      const nights = hotel.nights || 0;
      
      // For Estambul, combine the two entries into one if first time
      if (location === 'Estambul') {
        if (!estambulNightsAdded) {
          cityStops.push({
            number: 1,
            name: 'Estambul',
            country: data.destinations[0].country || 'Turquía',
            nights: 3
          });
          estambulNightsAdded = true;
        } else {
          // Second Estambul entry with 1 night
          cityStops.push({
            number: 7,
            name: 'Estambul',
            country: data.destinations[0].country || 'Turquía',
            nights: 1
          });
        }
      } else {
        const stopNumber = turkeyStopNumbers[location] || 2;
        cityStops.push({
          number: stopNumber,
          name: location,
          country: data.destinations[0].country || 'Turquía',
          nights: nights
        });
      }
    });
    
    // Sort by stop number
    cityStops.sort((a, b) => a.number - b.number);
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
  
  cityStops.forEach((stop) => {
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
    
    currentY += numberBoxSize + 20;
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
    const turkeyMapPath = path.join(process.cwd(), 'server', 'assets', 'turkey-route-map.png');
    const attachedMapPath = path.join(process.cwd(), 'attached_assets', 'Screenshot 2025-11-19 at 12.05.39 PM_1763572049850.png');
    
    // Try attached_assets first, then server/assets
    const mapPath = fs.existsSync(attachedMapPath) ? attachedMapPath : turkeyMapPath;
    
    if (fs.existsSync(mapPath)) {
      try {
        const mapY = doc.y + 40;
        const mapWidth = contentWidth;
        const mapHeight = 280;
        
        doc.image(mapPath, leftMargin, mapY, {
          width: mapWidth,
          height: mapHeight,
          align: "center",
          valign: "center"
        });
        
        doc.y = mapY + mapHeight + 20;
      } catch (error) {
        console.error("[PDF Generator] Error loading Turkey route map:", error);
      }
    }
  }

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
              const imageHeight = 200;
              if (flightImageY + imageHeight > 750) {
                doc.addPage();
                addPageBackground();
                addPlaneLogoBottom();
                flightImageY = 80;
              }
              
              doc.image(fullPath, leftMargin, flightImageY, {
                fit: [contentWidth, imageHeight],
                align: "center"
              });
              
              console.log(`[PDF Generator] Successfully added outbound image ${index}`);
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

    doc.font("Helvetica-Bold").fontSize(11).fillColor(primaryColor);
    doc.text("Alojamientos Previstos", leftMargin, doc.y);
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
      const hotelNames = hotels.map(h => `${h.name}${h.category ? ` ${h.category}` : ""}`).join(", ");
      doc.text(`${location}: ${hotelNames}`, leftMargin, doc.y, { width: contentWidth });
      doc.moveDown(0.3);
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

  doc.fontSize(7).fillColor(textColor);
  doc.text(
    "Esta cotización es válida por 7 días. Los precios están sujetos a disponibilidad.",
    leftMargin,
    doc.y,
    { width: contentWidth, align: "center" }
  );
  doc.moveDown(0.3);
  doc.text(
    "Para más información, contáctanos por WhatsApp: +57 314 657 6500",
    leftMargin,
    doc.y,
    { width: contentWidth, align: "center" }
  );

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
              const imageHeight = 200;
              if (flightImageY + imageHeight > 750) {
                doc.addPage();
                addPageBackground();
                addPlaneLogoBottom();
                flightImageY = 80;
              }
              
              doc.image(fullPath, leftMargin, flightImageY, {
                fit: [contentWidth, imageHeight],
                align: "center"
              });
              
              console.log(`[PDF Generator] Successfully added return image ${index}`);
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

  // Detectar específicamente si incluye "Turquía Esencial"
  const hasTurkeyEsencial = data.destinations.some((dest) => {
    const name = normalizeText(dest.name || "");
    return name.includes("turquia esencial") || name.includes("turkey esencial");
  });

  // PÁGINA DE ASISTENCIA MÉDICA - Siempre incluida al final
  doc.addPage();
  addPageBackground();
  addPlaneLogoBottom();
  
  const topMargin = 80;
  const bottomMargin = 50;
  const availableHeight = pageHeight - topMargin - bottomMargin;
  
  doc.font("Helvetica-Bold").fontSize(18).fillColor(textColor);
  doc.text("ASISTENCIA MEDICA PARA TU VIAJE", leftMargin, topMargin, { align: "center", width: contentWidth });
  
  doc.moveDown(2);
  
  // Agregar imagen de asistencia médica
  const medicalAssistanceImagePath = path.join(process.cwd(), "server", "assets", "medical-assistance.png");
  
  // Calcular altura de imagen de asistencia médica basado en si hay actividades opcionales
  const medicalImageHeight = hasTurkeyDestinations ? 240 : 400;
  
  if (fs.existsSync(medicalAssistanceImagePath)) {
    try {
      const stats = fs.statSync(medicalAssistanceImagePath);
      if (stats.size > 0) {
        const imageY = doc.y;
        
        doc.image(medicalAssistanceImagePath, leftMargin, imageY, {
          fit: [contentWidth, medicalImageHeight],
          align: "center"
        });
        
        doc.y = imageY + medicalImageHeight + 20;
        
        console.log('[PDF Generator] Medical assistance page added successfully');
      } else {
        console.warn('[PDF Generator] Medical assistance image file is empty');
      }
    } catch (error) {
      console.error('[PDF Generator] Error loading medical assistance image:', error);
    }
  } else {
    console.warn(`[PDF Generator] Medical assistance image not found at ${medicalAssistanceImagePath}`);
  }

  if (hasTurkeyDestinations) {
    // Crear nueva página para tours opcionales
    doc.addPage();
    addPageBackground();
    addPlaneLogoBottom();
    doc.y = topMargin;

    // Título principal
    doc.font("Helvetica-Bold").fontSize(16).fillColor("#ffffff");
    const titleBg = "#1e3a8a"; // Azul oscuro
    doc.rect(leftMargin, doc.y, contentWidth, 30).fill(titleBg);
    doc.fillColor("#ffffff").text("TOUR OPCIONALES", leftMargin, doc.y + 8, { align: "center", width: contentWidth });
    doc.moveDown(2.5);

    // Configuración de tabla
    const tableHeaderBg = "#1e40af"; // Azul primary
    const tableRowBg = "#e0e7ff"; // Azul muy claro
    const tableTextColor = "#1f2937";
    const priceColWidth = 100;
    const nameColWidth = contentWidth - priceColWidth;
    
    // Helper para agregar fila de tabla
    const addTableRow = (name: string, price: string, isHeader = false) => {
      if (doc.y > 700) {
        doc.addPage();
        addPageBackground();
        addPlaneLogoBottom();
        doc.y = topMargin;
      }
      
      const rowHeight = isHeader ? 20 : 16;
      const currentY = doc.y;
      
      if (isHeader) {
        doc.rect(leftMargin, currentY, contentWidth, rowHeight).fill(tableHeaderBg);
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
      } else {
        doc.rect(leftMargin, currentY, contentWidth, rowHeight).fill(tableRowBg);
        doc.fillColor(tableTextColor).font("Helvetica").fontSize(8);
      }
      
      // Nombre del tour
      doc.text(name, leftMargin + 5, currentY + (isHeader ? 6 : 4), { 
        width: nameColWidth - 10,
        continued: false
      });
      
      // Precio
      doc.text(price, leftMargin + nameColWidth, currentY + (isHeader ? 6 : 4), { 
        width: priceColWidth - 5,
        align: "right",
        continued: false
      });
      
      // Borde de celdas
      doc.rect(leftMargin, currentY, nameColWidth, rowHeight).stroke("#3b82f6");
      doc.rect(leftMargin + nameColWidth, currentY, priceColWidth, rowHeight).stroke("#3b82f6");
      
      doc.y = currentY + rowHeight;
    };

    // Tours individuales
    const tours = [
      { name: "Paseo en Globo (de 15/Mar 2026 a 31/Oct 2026)", price: "415 USD" },
      { name: "Paseo en Globo (de 01/Nov 2026 a 14/Mar 2027)", price: "384 USD" },
      { name: "Paseo Bósforo con almuerzo", price: "154 USD" },
      { name: "Paseo Clasico con almuerzo", price: "224 USD" },
      { name: "Noche Turca en Capadócia (solo show)", price: "116 USD" },
      { name: "Noche Turca en Capadócia cena show", price: "139 USD" },
      { name: "Noche Turca en İstambul (en barco con cena show)", price: "154 USD" },
      { name: "Erciyes Ski", price: "200 USD" },
      { name: "Cappa Park", price: "200 USD" },
      { name: "SkyDinner", price: "324 USD" },
      { name: "Jeep Safari", price: "108 USD" },
      { name: "6 almuerzos (en las ciudades del itinerario, menos en Estambul)", price: "185 USD" },
      { name: "E-SIM (3GB)", price: "31 USD" },
      { name: "Entrada al Palacio de Topkapi", price: "110 USD" }
    ];

    tours.forEach(tour => {
      addTableRow(tour.name, tour.price, false);
    });

    doc.moveDown(1.5);

    // Nota sobre fee bancario
    doc.fillColor("#dc2626").font("Helvetica-Bold").fontSize(10);
    doc.text("Fee bancario no incluido, 2.5% sobre el total", leftMargin, doc.y, { 
      align: "center", 
      width: contentWidth 
    });

    doc.moveDown(2);

    // COMBOS
    if (doc.y > 600) {
      doc.addPage();
      addPageBackground();
      addPlaneLogoBottom();
      doc.y = topMargin + 20;
    }

    // Combo 1
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#ffffff");
    doc.rect(leftMargin, doc.y, contentWidth, 25).fill("#1e3a8a");
    doc.text("COMBO 1", leftMargin, doc.y + 7, { align: "center", width: contentWidth });
    doc.moveDown(2);

    const combo1Items = [
      "PASEO EN GLOBO",
      "BÓSFORO con almuerzo",
      "CLASICO con almuerzo",
      "NOCHE TURCA Capadocia sin cena",
      "JEEP SAFARI - Sujeto al clima"
    ];

    doc.fillColor(tableTextColor).font("Helvetica").fontSize(9);
    combo1Items.forEach(item => {
      if (doc.y > 720) {
        doc.addPage();
        addPageBackground();
        addPlaneLogoBottom();
        doc.y = topMargin;
      }
      const itemY = doc.y;
      doc.rect(leftMargin, itemY, contentWidth - 100, 14).fill(tableRowBg).stroke("#3b82f6");
      doc.fillColor(tableTextColor).text(item, leftMargin + 5, itemY + 3, { width: contentWidth - 110 });
      doc.y = itemY + 14;
    });

    // Precio del combo 1
    const combo1PriceY = doc.y - (14 * combo1Items.length);
    doc.rect(leftMargin + contentWidth - 100, combo1PriceY, 100, 14 * combo1Items.length).fill("#1e40af");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(14);
    doc.text("969 USD", leftMargin + contentWidth - 95, combo1PriceY + (14 * combo1Items.length / 2) - 7, { 
      width: 90,
      align: "center"
    });
    doc.rect(leftMargin + contentWidth - 100, combo1PriceY, 100, 14 * combo1Items.length).stroke("#3b82f6");

    doc.moveDown(2);

    // Combo 2
    if (doc.y > 650) {
      doc.addPage();
      addPageBackground();
      addPlaneLogoBottom();
      doc.y = topMargin + 20;
    }

    doc.font("Helvetica-Bold").fontSize(12).fillColor("#ffffff");
    doc.rect(leftMargin, doc.y, contentWidth, 25).fill("#1e3a8a");
    doc.text("COMBO 2", leftMargin, doc.y + 7, { align: "center", width: contentWidth });
    doc.moveDown(2);

    const combo2Items = [
      "PASEO EN GLOBO",
      "NOCHE TURCA Capadocia sin cena",
      "JEEP SAFARI - Sujeto al clima"
    ];

    doc.fillColor(tableTextColor).font("Helvetica").fontSize(9);
    combo2Items.forEach(item => {
      if (doc.y > 720) {
        doc.addPage();
        addPageBackground();
        addPlaneLogoBottom();
        doc.y = topMargin;
      }
      const itemY = doc.y;
      doc.rect(leftMargin, itemY, contentWidth - 100, 14).fill(tableRowBg).stroke("#3b82f6");
      doc.fillColor(tableTextColor).text(item, leftMargin + 5, itemY + 3, { width: contentWidth - 110 });
      doc.y = itemY + 14;
    });

    // Precio del combo 2
    const combo2PriceY = doc.y - (14 * combo2Items.length);
    doc.rect(leftMargin + contentWidth - 100, combo2PriceY, 100, 14 * combo2Items.length).fill("#1e40af");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(14);
    doc.text("606 USD", leftMargin + contentWidth - 95, combo2PriceY + (14 * combo2Items.length / 2) - 7, { 
      width: 90,
      align: "center"
    });
    doc.rect(leftMargin + contentWidth - 100, combo2PriceY, 100, 14 * combo2Items.length).stroke("#3b82f6");

    console.log('[PDF Generator] Turkey optional tours table added successfully');
  }

  // PÁGINAS DE POLÍTICAS Y DÍAS FESTIVOS - Solo para Turquía Esencial
  if (hasTurkeyEsencial) {
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

    // PÁGINA DE DÍAS FESTIVOS 2026
    doc.addPage();
    addPageBackground();
    addPlaneLogoBottom();
    doc.y = topMargin;

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
