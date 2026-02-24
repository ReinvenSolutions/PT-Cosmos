import mammoth from "mammoth";
import fs from "fs/promises";
import path from "path";
import { db } from "../server/db";
import { destinations, itineraryDays, hotels, inclusions, exclusions } from "../shared/schema";
import { eq } from "drizzle-orm";

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

async function clearDestinationData(destinationId: string) {
  await db.delete(itineraryDays).where(eq(itineraryDays.destinationId, destinationId));
  await db.delete(hotels).where(eq(hotels.destinationId, destinationId));
  await db.delete(inclusions).where(eq(inclusions.destinationId, destinationId));
  await db.delete(exclusions).where(eq(exclusions.destinationId, destinationId));
}

function extractItinerary(text: string): ItineraryDay[] {
  const days: ItineraryDay[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  // More flexible pattern to match: "Día 1 –", "Dia 2-", "DÍA 3:", etc.
  const dayPattern = /^D[ií]a\s+(\d+)\s*[:\-–]\s*(.+)$/i;
  
  let currentDay: ItineraryDay | null = null;
  let currentDescription: string[] = [];
  let inDetailedSection = false;
  let inHotelSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect hotel section (stop adding to description but don't break the loop)
    if (line.match(/^(Ciudad|Turista\s*\d+|Superior\s*\d+|Deluxe\s*\d+|Gold\s+Deluxe)/i)) {
      inHotelSection = true;
    }
    
    // Stop when we reach the inclusions/exclusions sections
    if (line.match(/^(SERVICIO.*INCLUIDO|SERVICIO.*NO INCLUIDO|INCLUYE|NO INCLUYE)/i)) {
      break;
    }
    
    const match = line.match(dayPattern);
    
    if (match) {
      const dayNumber = parseInt(match[1]);
      let title = match[2].trim();
      
      // Remove meal info in parentheses from title
      title = title.replace(/\s*\([^)]*\)\s*\.?\s*$/g, '').trim();
      // Remove trailing period
      title = title.replace(/\.\s*$/g, '').trim();
      
      // Check if we're in the detailed section by seeing if:
      // 1. The day number is 1 (detailed sections start from day 1)
      // 2. AND the next line is NOT another day header (detailed sections have content between days)
      if (!inDetailedSection && dayNumber === 1 && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const nextIsDay = dayPattern.test(nextLine);
        if (!nextIsDay && nextLine.length > 10) {
          // Next line is substantial content, not a day header - we're in detailed section
          inDetailedSection = true;
        }
      }
      
      // Only process days in the detailed section
      if (inDetailedSection) {
        // Save the previous day if it exists
        if (currentDay) {
          if (currentDescription.length > 0) {
            currentDay.description = currentDescription.join(' ').trim();
          } else {
            currentDay.description = currentDay.title;
          }
          days.push(currentDay);
          currentDescription = [];
        }
        
        currentDay = {
          dayNumber,
          title: title || `Día ${dayNumber}`,
          description: ''
        };
        
        // Reset hotel section flag for new day
        inHotelSection = false;
      }
    } else if (currentDay && inDetailedSection && !inHotelSection) {
      // Add to description if it's not a header or empty line and not in hotel section
      if (line.length > 10 && !line.match(/^(ITINERARIO|CIRCUITO|OPCIONAL|Régimen|Recomendaciones)/i)) {
        currentDescription.push(line);
      }
    }
  }
  
  // Don't forget the last day
  if (currentDay) {
    if (currentDescription.length > 0) {
      currentDay.description = currentDescription.join(' ').trim();
    } else {
      currentDay.description = currentDay.title;
    }
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
      if (line.match(/^(Bangkok|Phuket|Chiang Mai|Chiang Rai|Hanoi|Hanói|Ho Chi Minh|Da Nang|Hue|Siem Reap)/i)) {
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

const DESTINATIONS_TO_FIX: Record<string, { name: string; expectedDays: number }> = {
  "TAILANDIA 6D-5N_1759587590768.docx": { name: "Tailandia Esencial", expectedDays: 6 },
  "TAILANDIA 7D-6N_1759587590769.docx": { name: "Tailandia Completa", expectedDays: 7 },
  "TAILANDIA 8D-7N_1759587590769.docx": { name: "Tailandia Extended", expectedDays: 8 },
  "VIETNAM 4D -3N_1759587598463.docx": { name: "Vietnam Express", expectedDays: 4 },
  "VIETNAM 5D -4N_1759587598465.docx": { name: "Vietnam Clásico", expectedDays: 5 },
  "VIETNAM 6D -5N_1759587598466.docx": { name: "Vietnam Completo", expectedDays: 6 },
};

async function processDestination(fileName: string, destinationInfo: { name: string; expectedDays: number }) {
  const assetsDir = path.join(process.cwd(), "attached_assets");
  const filePath = path.join(assetsDir, fileName);
  
  try {
    const text = await readDocx(filePath);
    
    const [destination] = await db.select().from(destinations)
      .where(eq(destinations.name, destinationInfo.name));
    
    if (!destination) {
      console.log(`⚠ Destino no encontrado en BD: ${destinationInfo.name}`);
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
    
    const status = itinerary.length === destinationInfo.expectedDays ? '✓' : '⚠';
    console.log(`${status} ${destinationInfo.name}`);
    console.log(`   Esperado: ${destinationInfo.expectedDays} días | Extraído: ${itinerary.length} días`);
    console.log(`   Hoteles: ${hotelsList.length} | Inclusiones: ${inclusionsList.length} | Exclusiones: ${exclusionsList.length}`);
    if (itinerary.length !== destinationInfo.expectedDays) {
      console.log(`   ⚠ ADVERTENCIA: No coincide el número de días esperado`);
    }
  } catch (error: any) {
    console.error(`✗ Error procesando ${destinationInfo.name}:`, error.message);
  }
}

async function main() {
  console.log("Corrigiendo datos de Tailandia y Vietnam...\n");
  
  for (const [fileName, destinationInfo] of Object.entries(DESTINATIONS_TO_FIX)) {
    await processDestination(fileName, destinationInfo);
    console.log();
  }
  
  console.log("\n✓ Proceso completado!");
  console.log("\nVerificando en base de datos...\n");
  
  // Verify the data in the database
  for (const destinationInfo of Object.values(DESTINATIONS_TO_FIX)) {
    const [destination] = await db.select().from(destinations)
      .where(eq(destinations.name, destinationInfo.name));
    
    if (destination) {
      const days = await db.select().from(itineraryDays)
        .where(eq(itineraryDays.destinationId, destination.id));
      
      const status = days.length === destinationInfo.expectedDays ? '✓' : '⚠';
      console.log(`${status} ${destinationInfo.name}: ${days.length}/${destinationInfo.expectedDays} días en BD`);
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
