import PDFDocument from "pdfkit";

interface PublicQuoteData {
  destinations: Array<{
    id: string;
    name: string;
    country: string;
    duration: number;
    nights: number;
    basePrice: string;
  }>;
  startDate: string;
  endDate: string;
  flightsAndExtras: number;
  landPortionTotal: number;
  grandTotal: number;
}

export function generatePublicQuotePDF(data: PublicQuoteData): PDFDocument {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
  });

  const primaryColor = "#2563eb";
  const textColor = "#1f2937";
  const lightGray = "#6b7280";
  const orangeColor = "#f97316";
  
  doc.font("Helvetica-Bold").fontSize(28).fillColor(primaryColor);
  doc.text("Cosmos", { continued: true, align: "center" });
  doc.font("Helvetica").fillColor("#60a5fa");
  doc.text(" Industria de Viajes", { align: "center" });
  
  doc.moveDown(0.5);
  doc.fontSize(14).fillColor(lightGray).text("COTIZACIÓN DE VIAJE", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor(lightGray);
  doc.text(`Generado el ${new Date().toLocaleDateString("es-ES", { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: "center" });
  doc.moveDown(2);

  if (data.startDate && data.endDate) {
    doc.font("Helvetica-Bold").fontSize(12).fillColor(textColor).text("FECHAS DEL VIAJE");
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(11);
    doc.fillColor(textColor).text(`Fecha de Inicio: ${data.startDate || "Por definir"}`);
    doc.text(`Fecha de Finalización: ${data.endDate || "Por definir"}`);
    doc.moveDown(1.5);
  }

  doc.font("Helvetica-Bold").fontSize(14).fillColor(primaryColor).text("DESTINOS SELECCIONADOS");
  doc.moveDown(0.8);

  data.destinations.forEach((dest, index) => {
    if (doc.y > 650) {
      doc.addPage();
    }

    const basePrice = parseFloat(dest.basePrice);
    
    doc.roundedRect(50, doc.y, 495, 80, 5)
       .fillAndStroke("#f0f9ff", "#bfdbfe");
    
    const boxY = doc.y + 15;
    doc.font("Helvetica-Bold").fontSize(13).fillColor(textColor);
    doc.text(`${index + 1}. ${dest.name}`, 60, boxY);
    
    doc.font("Helvetica").fontSize(10).fillColor(lightGray);
    doc.text(dest.country, 60, boxY + 18);
    
    doc.font("Helvetica").fontSize(9).fillColor(textColor);
    doc.text(`${dest.duration} Días / ${dest.nights} Noches`, 60, boxY + 33);
    
    doc.font("Helvetica-Bold").fontSize(16).fillColor(orangeColor);
    doc.text(`US$ ${basePrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 400, boxY + 20, { width: 135, align: "right" });
    doc.font("Helvetica").fontSize(8).fillColor(lightGray);
    doc.text("Porción terrestre", 400, boxY + 38, { width: 135, align: "right" });
    
    doc.moveDown(6);
  });

  doc.moveDown(1);
  
  if (doc.y > 600) {
    doc.addPage();
  }
  
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#cbd5e1");
  doc.moveDown(1);

  doc.font("Helvetica-Bold").fontSize(12).fillColor(textColor);
  doc.text("Subtotal Porciones Terrestres:", 50);
  doc.text(`US$ ${data.landPortionTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 350, doc.y - 12, { width: 195, align: "right" });
  doc.moveDown(0.8);

  doc.text("Vuelos + Asistencia + Comisión:", 50);
  doc.text(`US$ ${data.flightsAndExtras.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 350, doc.y - 12, { width: 195, align: "right" });
  doc.moveDown(1);

  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#cbd5e1");
  doc.moveDown(1);

  doc.roundedRect(50, doc.y, 495, 50, 5)
     .fillAndStroke("#1e40af", "#1e40af");
  
  const totalBoxY = doc.y + 12;
  doc.font("Helvetica-Bold").fontSize(14).fillColor("white");
  doc.text("PRECIO TOTAL:", 60, totalBoxY);
  doc.fontSize(22);
  doc.text(`US$ ${data.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 300, totalBoxY - 3, { width: 235, align: "right" });
  
  doc.moveDown(4);

  doc.font("Helvetica-Bold").fontSize(11).fillColor(textColor).text("NOTA IMPORTANTE:");
  doc.font("Helvetica").fontSize(9).fillColor(textColor);
  doc.text("Las porciones terrestres están garantizadas desde 2 pasajeros en cualquiera de nuestros programas, sean nacionales o internacionales.");
  doc.moveDown(0.5);
  doc.text("Incluyen: Guía de habla hispana garantizada desde 2 pax, asistencia al viajero, hoteles, transporte, actividades, impuestos y complementos de programas.");
  doc.moveDown(0.5);
  doc.fillColor(primaryColor).text("Solo montamos vuelos - esta cotización es únicamente terrestre.");
  doc.moveDown(1.5);

  doc.fontSize(8).fillColor(lightGray);
  doc.text("Esta cotización es válida por 7 días. Los precios están sujetos a disponibilidad.", { align: "center" });
  doc.moveDown(0.3);
  doc.text("Para más información, contáctanos por WhatsApp: +57 314 657 6500", { align: "center" });

  return doc;
}
