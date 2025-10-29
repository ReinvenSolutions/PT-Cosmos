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
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
  });

  const primaryColor = "#1e40af";
  const accentColor = "#f97316";
  const textColor = "#1f2937";
  const lightGray = "#6b7280";
  const veryLightGray = "#9ca3af";
  
  const pageWidth = 595;
  const leftMargin = 60;
  const rightMargin = 60;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  doc.font("Helvetica").fontSize(9).fillColor(veryLightGray);
  doc.text("RNT No.240799", leftMargin, 40, { align: "right" });
  doc.moveDown(1);

  doc.font("Helvetica-Bold").fontSize(11).fillColor(lightGray);
  doc.text("S U   V I A J E   A :", leftMargin, doc.y, { align: "left" });
  doc.moveDown(2);

  const destinationNames = data.destinations.map(d => d.name).join(" + ");
  const totalDuration = data.destinations.reduce((sum, d) => sum + d.duration, 0);
  const totalNights = data.destinations.reduce((sum, d) => sum + d.nights, 0);

  doc.font("Helvetica-Bold").fontSize(20).fillColor(primaryColor);
  const titleText = destinationNames.length > 50 
    ? destinationNames.substring(0, 50) + "..." 
    : destinationNames;
  doc.text(titleText.toUpperCase(), leftMargin, doc.y, { align: "left" });
  doc.moveDown(0.5);
  
  doc.font("Helvetica").fontSize(12).fillColor(textColor);
  doc.text(`PLAN ${totalDuration} DÍAS - ${totalNights} NOCHES`, leftMargin, doc.y, { align: "left" });
  doc.moveDown(3);

  const currentDate = new Date().toLocaleDateString("es-ES", { day: '2-digit', month: '2-digit', year: 'numeric' });
  doc.font("Helvetica").fontSize(8).fillColor(veryLightGray);
  doc.text(`creado ${currentDate}`, pageWidth - rightMargin - 80, doc.y - 60, { align: "right" });

  doc.moveTo(leftMargin, doc.y).lineTo(pageWidth - rightMargin, doc.y).stroke("#e5e7eb");
  doc.moveDown(1.5);

  const budgetSectionY = doc.y;
  
  doc.font("Helvetica-Bold").fontSize(11).fillColor(textColor);
  doc.text("P R E S U P U E S T O    P A R A    S U    V I A J E", leftMargin, budgetSectionY);
  
  doc.font("Helvetica").fontSize(10).fillColor(textColor);
  const startDateFormatted = data.startDate || "Por definir";
  const endDateFormatted = data.endDate || "Por definir";
  doc.text(`Salida: ${startDateFormatted}`, leftMargin, budgetSectionY + 25);
  doc.text(`Regreso: ${endDateFormatted}`, leftMargin, budgetSectionY + 40);
  
  const minPayment = Math.round(data.grandTotal * 0.6);
  doc.font("Helvetica").fontSize(9).fillColor(lightGray);
  doc.text(`Pago mínimo para separar: US$ ${minPayment.toLocaleString('en-US')}`, leftMargin, budgetSectionY + 60);

  doc.font("Helvetica-Bold").fontSize(11).fillColor(lightGray);
  doc.text("D E S D E :", pageWidth - rightMargin - 140, budgetSectionY, { align: "left" });
  
  doc.roundedRect(pageWidth - rightMargin - 140, budgetSectionY + 20, 140, 55, 3)
     .fillAndStroke("#fef3c7", "#fbbf24");
  
  doc.font("Helvetica-Bold").fontSize(22).fillColor(accentColor);
  doc.text(
    `$ ${data.grandTotal.toLocaleString('en-US')}`, 
    pageWidth - rightMargin - 135, 
    budgetSectionY + 28,
    { width: 130, align: "center" }
  );
  
  doc.font("Helvetica").fontSize(8).fillColor(lightGray);
  doc.text(
    data.destinations.length === 1 ? "por persona" : "por pareja",
    pageWidth - rightMargin - 135,
    budgetSectionY + 58,
    { width: 130, align: "center" }
  );

  doc.moveDown(7);

  doc.font("Helvetica-Bold").fontSize(11).fillColor(textColor);
  doc.text("C O M E N T A R I O S", leftMargin, doc.y);
  doc.moveDown(0.5);
  
  doc.font("Helvetica").fontSize(8.5).fillColor(textColor);
  const comments = `Tarifa sujeta a cambios sin previo aviso y disponibilidad. Para el destino, cuenta con acompañamiento de guía de habla hispana. Las porciones terrestres están garantizadas desde 2 pasajeros en cualquiera de nuestros programas, sean nacionales o internacionales. Incluyen: Guía de habla hispana garantizada desde 2 pax, asistencia al viajero, hoteles, transporte, actividades, impuestos y complementos de programas. Solo montamos vuelos.`;
  doc.text(comments, leftMargin, doc.y, { width: contentWidth, align: "justify" });
  doc.moveDown(2);

  doc.font("Helvetica-Bold").fontSize(12).fillColor(primaryColor);
  doc.text("Itinerario", leftMargin, doc.y);
  doc.moveDown(1);

  data.destinations.forEach((dest, index) => {
    if (doc.y > 680) {
      doc.addPage();
    }

    doc.roundedRect(leftMargin, doc.y, contentWidth, 50, 3)
       .fillAndStroke("#eff6ff", "#bfdbfe");
    
    const itemY = doc.y;
    
    doc.font("Helvetica-Bold").fontSize(13).fillColor(primaryColor);
    doc.text(`${index + 1}`, leftMargin + 15, itemY + 15, { width: 20 });
    
    doc.font("Helvetica-Bold").fontSize(11).fillColor(textColor);
    doc.text(dest.name, leftMargin + 45, itemY + 12);
    
    doc.font("Helvetica").fontSize(9).fillColor(lightGray);
    doc.text(dest.country, leftMargin + 45, itemY + 27);
    
    doc.font("Helvetica-Bold").fontSize(10).fillColor(textColor);
    doc.text(
      `${dest.duration}`,
      pageWidth - rightMargin - 80,
      itemY + 15,
      { width: 30, align: "center" }
    );
    doc.font("Helvetica").fontSize(8).fillColor(lightGray);
    doc.text("Noches", pageWidth - rightMargin - 80, itemY + 30, { width: 30, align: "center" });
    
    doc.moveDown(4);
  });

  doc.moveDown(1);

  if (doc.y > 600) {
    doc.addPage();
  }

  doc.font("Helvetica-Bold").fontSize(10).fillColor(textColor);
  doc.text("I N C L U I D O", leftMargin, doc.y);
  doc.moveDown(0.5);
  
  doc.font("Helvetica").fontSize(8).fillColor(textColor);
  const included = [
    `${totalNights} noches de alojamiento en hoteles previstos o categoría similar`,
    `${totalNights} desayunos`,
    "Guía autorizado que habla español",
    "Traslados con asistente autorizado que habla español (IN - OUT)",
    "Impuesto IVA",
    "Todas las entradas del itinerario según programa",
    "Asistencia médica",
    "Vuelos internacionales - maleta personal + cabina"
  ];
  
  included.forEach(item => {
    doc.text(`• ${item}`, leftMargin + 10, doc.y);
    doc.moveDown(0.3);
  });
  
  doc.moveDown(1);

  doc.font("Helvetica-Bold").fontSize(10).fillColor(textColor);
  doc.text("E X C L U I D O", leftMargin, doc.y);
  doc.moveDown(0.5);
  
  doc.font("Helvetica").fontSize(8).fillColor(textColor);
  const excluded = [
    "Excursiones opcionales",
    "Bebidas en las comidas",
    "Gastos personales",
    "Equipaje extra",
    "Propinas del guía y chofer US$ 50 por persona **Obligatorias**"
  ];
  
  excluded.forEach(item => {
    doc.text(`• ${item}`, leftMargin + 10, doc.y);
    doc.moveDown(0.3);
  });

  doc.moveDown(2);

  if (doc.y > 650) {
    doc.addPage();
  }

  doc.font("Helvetica-Bold").fontSize(9).fillColor(textColor);
  doc.text("Términos Generales y Condiciones", leftMargin, doc.y);
  doc.moveDown(0.5);
  
  doc.font("Helvetica").fontSize(7.5).fillColor(lightGray);
  const terms = `Servicios: Cambios en el itinerario posibles según condiciones y disponibilidad del guía. Hotelería: Alojamiento en hoteles de primera entre 4 y 5 estrellas similares a los planificados. Excursiones: No reembolsos por inasistencias. Traslados: Recogida y salida sin acceso al aeropuerto. Espera máxima de 2 horas tras aterrizaje. Documentación: Colombianos exentos de visado. Pasaporte con mínimo 6 meses de validez. Consultar requerimientos para otras nacionalidades.`;
  doc.text(terms, leftMargin, doc.y, { width: contentWidth, align: "justify" });
  
  doc.moveDown(2);

  doc.fontSize(7).fillColor(veryLightGray);
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

  return doc;
}
