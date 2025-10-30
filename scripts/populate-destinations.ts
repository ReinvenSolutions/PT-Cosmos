import mammoth from "mammoth";
import fs from "fs/promises";
import path from "path";
import * as pdfParseModule from "pdf-parse";
import { db } from "../server/db";
import { destinations, itineraryDays, hotels, inclusions, exclusions } from "../shared/schema";
import { eq } from "drizzle-orm";

const pdfParse = (pdfParseModule as any).default || pdfParseModule;

interface ItineraryDay {
  dayNumber: number;
  title: string;
  description: string;
}

interface Hotel {
  name: string;
  location: string;
  category?: string;
}

async function readDocx(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function readPdf(filePath: string): Promise<string> {
  throw new Error("PDF parsing is currently unavailable due to library compatibility issues. Please convert PDF files to DOCX format for processing.");
}

async function clearDestinationData(destinationId: string) {
  await db.delete(itineraryDays).where(eq(itineraryDays.destinationId, destinationId));
  await db.delete(hotels).where(eq(hotels.destinationId, destinationId));
  await db.delete(inclusions).where(eq(inclusions.destinationId, destinationId));
  await db.delete(exclusions).where(eq(exclusions.destinationId, destinationId));
}

function extractItinerary(text: string): ItineraryDay[] {
  const days: ItineraryDay[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  const dayPattern = /^D[ií]a\s+(\d+)[:\-\s]+(.*?)$/i;
  
  let currentDay: ItineraryDay | null = null;
  let currentDescription: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(dayPattern);
    
    if (match) {
      if (currentDay && currentDescription.length > 0) {
        currentDay.description = currentDescription.join(' ').trim();
        days.push(currentDay);
        currentDescription = [];
      }
      
      const dayNumber = parseInt(match[1]);
      let title = match[2].trim();
      
      title = title.replace(/\(.*?\)$/g, '').trim();
      
      currentDay = {
        dayNumber,
        title: title || `Día ${dayNumber}`,
        description: ''
      };
    } else if (currentDay) {
      if (line.match(/^(SERVICIO|INCLUYE|NO INCLUYE|CATEGORIA|HOTEL|Notas|Términos)/i)) {
        break;
      }
      
      if (line.length > 10 && !line.match(/^(ITINERARIO|CIRCUITO)/i)) {
        currentDescription.push(line);
      }
    }
  }
  
  if (currentDay && currentDescription.length > 0) {
    currentDay.description = currentDescription.join(' ').trim();
    days.push(currentDay);
  }
  
  return days;
}

function extractHotels(text: string): Hotel[] {
  const hotels: Hotel[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  let inHotelSection = false;
  let currentCity = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.match(/CATEGORIA.*HOTEL|HOTELES.*PREVISTO|ALOJAMIENTO/i)) {
      inHotelSection = true;
      continue;
    }
    
    if (inHotelSection && line.match(/^(SERVICIO|INCLUYE|NO INCLUYE|Notas|Términos)/i)) {
      break;
    }
    
    if (inHotelSection) {
      if (line.match(/^(Estambul|Capadocia|Dubai|Abu Dhabi|El Cairo|Luxor|Aswan|Cusco|Lima|Paracas|Bangkok|Phuket|Chiang Mai|Atenas|Santorini|Mykonos|Hanoi|Ho Chi Minh|Da Nang|Siem Reap)/i)) {
        currentCity = line;
      } else if (line.length > 10 && currentCity && !line.match(/CIUDAD|similar/i)) {
        const hotelNames = line.split(/\s*-\s*|\s*,\s*/);
        hotelNames.forEach(name => {
          name = name.trim();
          if (name && name.length > 3 && !name.match(/^\d/)) {
            const categoryMatch = name.match(/(\d)\s*\*/);
            hotels.push({
              name: name,
              location: currentCity,
              category: categoryMatch ? `${categoryMatch[1]} estrellas` : undefined
            });
          }
        });
      }
    }
  }
  
  return hotels;
}

function extractInclusions(text: string): string[] {
  const items: string[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  let inSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.match(/SERVICIO.*INCLUIDO|INCLUYE|EL PRECIO INCLUYE/i) && !line.match(/NO INCLUIDO|NO INCLUYE/i)) {
      inSection = true;
      continue;
    }
    
    if (inSection && line.match(/SERVICIO.*NO INCLUIDO|NO INCLUYE|EL PRECIO NO INCLUYE|Notas|Términos/i)) {
      break;
    }
    
    if (inSection && line.length > 5) {
      let cleanLine = line.replace(/^[•\-\*]\s*/, '').trim();
      if (cleanLine && !cleanLine.match(/^(SERVICIO|CIUDAD|HOTEL)/i)) {
        items.push(cleanLine);
      }
    }
  }
  
  return items.filter(item => item.length > 0);
}

function extractExclusions(text: string): string[] {
  const items: string[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  let inSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.match(/SERVICIO.*NO INCLUIDO|NO INCLUYE|EL PRECIO NO INCLUYE/i)) {
      inSection = true;
      continue;
    }
    
    if (inSection && line.match(/Notas|Términos|CONDICIONES|POLITICA/i)) {
      break;
    }
    
    if (inSection && line.length > 5) {
      let cleanLine = line.replace(/^[•\-\*]\s*/, '').trim();
      if (cleanLine && !cleanLine.match(/^(SERVICIO|NO INCLUIDO)/i)) {
        items.push(cleanLine);
      }
    }
  }
  
  return items.filter(item => item.length > 0);
}

const FILE_TO_DESTINATION_MAP: Record<string, string> = {
  "LEYENDAS DE TURQUIA_1759587583702.docx": "Leyendas de Turquía",
  "TURQUIA EXTRA REGULARES CON ALMUERZOS_1759587583705.docx": "Turquía Extra Regulares con Almuerzos",
  "TURQUIA EXTRA REGULARES SIN ALMUERZOS_1759587583709.docx": "Turquía Extra Regulares sin Almuerzos",
  "DUBAI 3D-2N_1759587489610.docx": "Dubái Esencial",
  "DUBAI 4D-3N_1759587489614.docx": "Dubái Clásico",
  "DUBAI 5D-4N_1759587489615.docx": "Dubái Completo",
  "DUBAI 6D-5N_1759587489616.docx": "Dubái Extended",
  "DUBAI 8D-7N_1759587489618.docx": "Dubái Premium",
  "EGIPTO 7D-6N_1759587498484.docx": "Egipto Clásico",
  "EGIPTO 8D-7N_1759587498485.docx": "Egipto Extendido",
  "EGIPTO 10D-9N_1759587498486.docx": "Egipto Completo",
  "TOUR DE PEREGRINACION  4  DIAS_1759587498486.docx": "Tour de Peregrinación 4 Días",
  "TOUR DE PEREGRINACION  5 DIAS ok_1759587498487.docx": "Tour de Peregrinación 5 Días",
  "CUSCO- 3 DIAS - 2 NOCHES_1759587574124.pdf": "Cusco Express",
  "CUSCO - 4 DIAS - 3 NOCHES_1759587574116.pdf": "Cusco Clásico",
  "CUSCO - 5 DIAS - 4 NOCHES_1759587574117.pdf": "Cusco Completo",
  "CUSCO - 6 DIAS - 5 NOCHES_1759587574118.pdf": "Cusco Extended",
  "CUSCO + HUACACHINA - 5 DIAS - 4 NOCHES_1759587574122.pdf": "Cusco + Huacachina",
  "CUSCO + VINI - 4 DIAS - 3 NOCHES_1759587574123.pdf": "Cusco + Viñac",
  "CUSCO - VINI - 5 DIAS - 4 NOCHES_1759587574121.pdf": "Cusco - Viñac",
  "CUSCO - HUACACHINA - 6 DIAS - 5 NOCHES_1759587574119.pdf": "Cusco - Huacachina",
  "CUSCO - HUACACHINA - LIMA - 7 DIAS - 6 NOCHES_1759587574120.pdf": "Cusco - Huacachina - Lima",
  "CUSCO - PARACAS - LIMA - 9 DIAS - 8 NOCHES_1759587574120.pdf": "Cusco - Paracas - Lima",
  "TAILANDIA 6D-5N_1759587590768.docx": "Tailandia Esencial",
  "TAILANDIA 7D-6N_1759587590769.docx": "Tailandia Completa",
  "TAILANDIA 8D-7N_1759587590769.docx": "Tailandia Extended",
  "GRECIA 5D-4N_1759587508665.docx": "Grecia Clásica",
  "VIETNAM 4D -3N_1759587598463.docx": "Vietnam Express",
  "VIETNAM 5D -4N_1759587598465.docx": "Vietnam Clásico",
  "VIETNAM 6D -5N_1759587598466.docx": "Vietnam Completo",
};

async function processDestination(fileName: string, destinationName: string) {
  const assetsDir = path.join(process.cwd(), "attached_assets");
  const filePath = path.join(assetsDir, fileName);
  
  try {
    let text: string;
    if (fileName.endsWith('.docx')) {
      text = await readDocx(filePath);
    } else if (fileName.endsWith('.pdf')) {
      text = await readPdf(filePath);
    } else {
      console.log(`⚠ Formato no soportado: ${fileName}`);
      return;
    }
    
    const [destination] = await db.select().from(destinations)
      .where(eq(destinations.name, destinationName));
    
    if (!destination) {
      console.log(`⚠ Destino no encontrado en BD: ${destinationName}`);
      return;
    }
    
    await clearDestinationData(destination.id);
    
    const itinerary = extractItinerary(text);
    if (itinerary.length > 0) {
      const itineraryData = itinerary.map(day => ({
        destinationId: destination.id,
        dayNumber: day.dayNumber,
        title: day.title,
        description: day.description
      }));
      await db.insert(itineraryDays).values(itineraryData);
    }
    
    const hotelsList = extractHotels(text);
    if (hotelsList.length > 0) {
      const hotelsData = hotelsList.map(hotel => ({
        destinationId: destination.id,
        name: hotel.name,
        location: hotel.location,
        category: hotel.category
      }));
      await db.insert(hotels).values(hotelsData);
    }
    
    const inclusionsList = extractInclusions(text);
    if (inclusionsList.length > 0) {
      const inclusionsData = inclusionsList.map((item, index) => ({
        destinationId: destination.id,
        item,
        displayOrder: index + 1
      }));
      await db.insert(inclusions).values(inclusionsData);
    }
    
    const exclusionsList = extractExclusions(text);
    if (exclusionsList.length > 0) {
      const exclusionsData = exclusionsList.map((item, index) => ({
        destinationId: destination.id,
        item,
        displayOrder: index + 1
      }));
      await db.insert(exclusions).values(exclusionsData);
    }
    
    console.log(`✓ ${destinationName} - Días: ${itinerary.length}, Hoteles: ${hotelsList.length}, Inclusiones: ${inclusionsList.length}, Exclusiones: ${exclusionsList.length}`);
  } catch (error: any) {
    if (fileName.endsWith('.pdf')) {
      console.log(`⚠ ${destinationName} - PDF parsing no disponible (convertir a DOCX)`);
    } else {
      console.error(`✗ Error procesando ${destinationName}:`, error.message);
    }
  }
}

async function main() {
  console.log("Poblando información de destinos desde documentos...\n");
  
  for (const [fileName, destinationName] of Object.entries(FILE_TO_DESTINATION_MAP)) {
    await processDestination(fileName, destinationName);
  }
  
  console.log("\n✓ Proceso completado!");
}

main().catch(console.error).finally(() => process.exit(0));
