import PDFDocument from "pdfkit";
import { Quote, Destination, ItineraryDay, Hotel, Inclusion, Exclusion } from "@shared/schema";

interface QuoteWithFullDetails extends Quote {
  destinations: Array<{
    destination: Destination;
    itinerary: ItineraryDay[];
    hotels: Hotel[];
    inclusions: Inclusion[];
    exclusions: Exclusion[];
  }>;
}

export function generateQuotePDF(quote: QuoteWithFullDetails): PDFDocument {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
  });

  const primaryColor = "#2563eb";
  const textColor = "#1f2937";
  const lightGray = "#6b7280";
  
  doc.font("Helvetica-Bold").fontSize(24).fillColor(primaryColor).text("COTIZACIÓN DE VIAJE", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor(lightGray).text(`Cotización #${quote.id.slice(0, 8).toUpperCase()}`, { align: "center" });
  doc.moveDown(2);

  doc.font("Helvetica-Bold").fontSize(14).fillColor(textColor).text("INFORMACIÓN DEL CLIENTE");
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(11);
  doc.fillColor(textColor).text(`Nombre: ${quote.clientName}`);
  if (quote.clientEmail) doc.text(`Email: ${quote.clientEmail}`);
  if (quote.clientPhone) doc.text(`Teléfono: ${quote.clientPhone}`);
  doc.text(`Adultos: ${quote.adults} | Niños: ${quote.children}`);
  
  if (quote.travelStartDate && quote.travelEndDate) {
    const startDate = new Date(quote.travelStartDate).toLocaleDateString("es-ES");
    const endDate = new Date(quote.travelEndDate).toLocaleDateString("es-ES");
    doc.text(`Fechas de viaje: ${startDate} - ${endDate}`);
  }
  doc.moveDown(1.5);

  quote.destinations.forEach((destData, index) => {
    const dest = destData.destination;
    
    if (doc.y > 650) {
      doc.addPage();
    }

    doc.font("Helvetica-Bold").fontSize(16).fillColor(primaryColor);
    doc.text(`${index + 1}. ${dest.name} - ${dest.country}`, { continued: false });
    doc.moveDown(0.3);
    
    doc.font("Helvetica").fontSize(10).fillColor(lightGray);
    doc.text(`${dest.duration} días / ${dest.nights} noches`);
    
    if (dest.description) {
      doc.moveDown(0.5);
      doc.fillColor(textColor).text(dest.description);
    }
    doc.moveDown(1);

    if (destData.hotels.length > 0) {
      doc.font("Helvetica-Bold").fontSize(12).fillColor(textColor).text("Hoteles:");
      doc.moveDown(0.3);
      destData.hotels.forEach((hotel) => {
        doc.font("Helvetica").fontSize(10);
        doc.fillColor(textColor).text(`• ${hotel.name}${hotel.category ? ` (${hotel.category})` : ""}`, {
          indent: 10,
        });
        if (hotel.location) {
          doc.fillColor(lightGray).text(`  ${hotel.location}`, { indent: 20 });
        }
      });
      doc.moveDown(1);
    }

    if (destData.itinerary.length > 0) {
      doc.font("Helvetica-Bold").fontSize(12).fillColor(textColor).text("Itinerario:");
      doc.moveDown(0.3);
      destData.itinerary.slice(0, 5).forEach((day) => {
        if (doc.y > 700) {
          doc.addPage();
        }
        doc.font("Helvetica-Bold").fontSize(10).fillColor(primaryColor);
        doc.text(`Día ${day.dayNumber}: ${day.title}`);
        doc.font("Helvetica").fontSize(9).fillColor(textColor);
        const shortDesc = day.description.length > 150 
          ? day.description.substring(0, 150) + "..." 
          : day.description;
        doc.text(shortDesc, { indent: 10 });
        doc.moveDown(0.5);
      });
      if (destData.itinerary.length > 5) {
        doc.font("Helvetica").fontSize(9).fillColor(lightGray);
        doc.text(`... y ${destData.itinerary.length - 5} días más`, { indent: 10 });
      }
      doc.moveDown(1);
    }

    if (destData.inclusions.length > 0) {
      doc.font("Helvetica-Bold").fontSize(11).fillColor(textColor).text("Incluye:");
      doc.moveDown(0.3);
      doc.font("Helvetica").fontSize(9);
      destData.inclusions.slice(0, 8).forEach((inc) => {
        doc.fillColor(textColor).text(`✓ ${inc.item}`, { indent: 10 });
      });
      if (destData.inclusions.length > 8) {
        doc.fillColor(lightGray).text(`... y ${destData.inclusions.length - 8} más`, { indent: 10 });
      }
      doc.moveDown(0.8);
    }

    if (destData.exclusions.length > 0) {
      doc.font("Helvetica-Bold").fontSize(11).fillColor(textColor).text("No Incluye:");
      doc.moveDown(0.3);
      doc.font("Helvetica").fontSize(9);
      destData.exclusions.slice(0, 6).forEach((exc) => {
        doc.fillColor(textColor).text(`✗ ${exc.item}`, { indent: 10 });
      });
      if (destData.exclusions.length > 6) {
        doc.fillColor(lightGray).text(`... y ${destData.exclusions.length - 6} más`, { indent: 10 });
      }
      doc.moveDown(0.8);
    }
    
    doc.moveDown(1.5);
  });

  if (doc.y > 600) {
    doc.addPage();
  }

  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#e5e7eb");
  doc.moveDown(1);

  doc.font("Helvetica-Bold").fontSize(18).fillColor(primaryColor);
  doc.text(`PRECIO TOTAL: ${quote.currency} ${Number(quote.totalPrice).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { align: "center" });
  doc.moveDown(1);

  if (quote.notes) {
    doc.font("Helvetica-Bold").fontSize(11).fillColor(textColor).text("Notas:");
    doc.font("Helvetica").fontSize(9).fillColor(lightGray).text(quote.notes);
    doc.moveDown(1);
  }

  doc.moveDown(1);
  doc.fontSize(8).fillColor(lightGray);
  doc.text("Esta cotización es válida por 7 días. Los precios están sujetos a disponibilidad.", { align: "center" });
  doc.text(`Generado el ${new Date().toLocaleDateString("es-ES")}`, { align: "center" });

  return doc;
}
