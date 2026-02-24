import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { db } from "../server/db";
import { destinations, itineraryDays, hotels, inclusions, exclusions } from "../shared/schema";
import { eq } from "drizzle-orm";

const execPromise = promisify(exec);

async function clearDestinationData(destinationId: string) {
  await db.delete(itineraryDays).where(eq(itineraryDays.destinationId, destinationId));
  await db.delete(hotels).where(eq(hotels.destinationId, destinationId));
  await db.delete(inclusions).where(eq(inclusions.destinationId, destinationId));
  await db.delete(exclusions).where(eq(exclusions.destinationId, destinationId));
}

async function extractPdfText(filename: string): Promise<string> {
  const filePath = path.join(process.cwd(), "attached_assets", filename);
  const { stdout } = await execPromise(`pdftotext "${filePath}" -`);
  return stdout;
}

function extractItinerary(text: string): Array<{ dayNumber: number; title: string; description: string }> {
  const itinerary: Array<{ dayNumber: number; title: string; description: string }> = [];
  const lines = text.split('\n');
  
  let currentDay: { dayNumber: number; title: string; description: string } | null = null;
  let currentLines: string[] = [];
  let inItinerary = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.match(/ITINERARIO:/i)) {
      inItinerary = true;
      continue;
    }
    
    if (inItinerary && line.match(/INCLUYE:/i)) {
      if (currentDay && currentLines.length > 0) {
        currentDay.description = currentLines.join(' ').trim();
        itinerary.push(currentDay);
      }
      break;
    }
    
    const dayMatch = line.match(/^D[IÍ]A\s*(\d+)\s*[–\-]\s*\/?\s*(.*?)$/i);
    if (dayMatch && inItinerary) {
      if (currentDay && currentLines.length > 0) {
        currentDay.description = currentLines.join(' ').trim();
        itinerary.push(currentDay);
      }
      
      const dayNumber = parseInt(dayMatch[1]);
      const title = dayMatch[2].trim();
      currentDay = { dayNumber, title, description: '' };
      currentLines = [];
    } else if (currentDay && line.startsWith('•') && line.length > 5) {
      currentLines.push(line.substring(1).trim());
    }
  }
  
  if (currentDay && currentLines.length > 0) {
    currentDay.description = currentLines.join(' ').trim();
    itinerary.push(currentDay);
  }
  
  return itinerary;
}

function extractHotels(text: string): Array<{ name: string; location: string; category: string }> {
  const hotels: Array<{ name: string; location: string; category: string }> = [];
  const hotelPattern = /hospedaje.*?[–\-]\s*([^(]+?)(\([^)]+\))?$/gim;
  
  let match;
  while ((match = hotelPattern.exec(text)) !== null) {
    const name = match[1].trim();
    const category = match[2] ? match[2].replace(/[()]/g, '').trim() : '3 estrellas';
    
    if (name.match(/cusco/i)) {
      hotels.push({ name, location: 'Cusco', category });
    } else if (name.match(/lima/i)) {
      hotels.push({ name, location: 'Lima', category });
    } else if (name.match(/paracas|ica/i)) {
      hotels.push({ name, location: 'Paracas/Ica', category });
    }
  }
  
  return hotels;
}

function extractInclusions(text: string): string[] {
  const items: string[] = [];
  const lines = text.split('\n');
  
  let inSection = false;
  let pastBullets = false;
  let currentItem = '';
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    
    if (trimmed.match(/^►\s*INCLUYE:/i)) {
      inSection = true;
      continue;
    }
    
    if (inSection && trimmed.match(/^►\s*NO INCLUYE:/i)) {
      if (currentItem) {
        items.push(currentItem.trim());
      }
      break;
    }
    
    if (inSection) {
      if (trimmed === '•') {
        continue;
      }
      
      if (trimmed === '' && !pastBullets) {
        pastBullets = true;
        continue;
      }
      
      if (pastBullets && trimmed) {
        if (currentItem && (trimmed.match(/^[A-Z]/) || trimmed.match(/^\d/))) {
          items.push(currentItem.trim());
          currentItem = trimmed;
        } else if (currentItem) {
          currentItem += ' ' + trimmed;
        } else {
          currentItem = trimmed;
        }
      }
    }
  }
  
  if (currentItem) {
    items.push(currentItem.trim());
  }
  
  return items.filter(item => item.length > 0);
}

function extractExclusions(text: string): string[] {
  const items: string[] = [];
  const lines = text.split('\n');
  
  let inSection = false;
  let pastBullets = false;
  let currentItem = '';
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    
    if (trimmed.match(/^►\s*NO INCLUYE:/i)) {
      inSection = true;
      continue;
    }
    
    if (inSection && trimmed.match(/^►\s*(NOTAS|A TOMAR)/i)) {
      if (currentItem) {
        items.push(currentItem.trim());
      }
      break;
    }
    
    if (inSection) {
      if (trimmed === '•') {
        continue;
      }
      
      if (trimmed === '' && !pastBullets) {
        pastBullets = true;
        continue;
      }
      
      if (pastBullets && trimmed) {
        if (currentItem && (trimmed.match(/^[A-Z]/) || trimmed.match(/^\d/))) {
          items.push(currentItem.trim());
          currentItem = trimmed;
        } else if (currentItem) {
          currentItem += ' ' + trimmed;
        } else {
          currentItem = trimmed;
        }
      }
    }
  }
  
  if (currentItem) {
    items.push(currentItem.trim());
  }
  
  return items.filter(item => item.length > 0);
}

async function processCusco4D3N() {
  const text = await extractPdfText("CUSCO - 4 DIAS - 3 NOCHES_1759587574116.pdf");
  
  const [destination] = await db.select().from(destinations)
    .where(eq(destinations.name, "Cusco Clásico"));
  
  if (!destination) {
    console.log("Destino Cusco Clásico no encontrado");
    return;
  }
  
  await clearDestinationData(destination.id);
  
  const itineraryData = [
    {
      destinationId: destination.id,
      dayNumber: 1,
      title: "Llegada a Cusco / City Tour Arqueológico",
      description: "Traslado a aeropuerto, vuelo a Cusco, llegada y traslado a hotel. Por la tarde, recojo de hotel para inicio del City Tour visitando Sacsayhuaman, Kenko, Puka Pukará y Tambo Machay. Fin del tour en Plaza San Francisco."
    },
    {
      destinationId: destination.id,
      dayNumber: 2,
      title: "Tour Valle Sagrado – Maras - Moray",
      description: "Recojo en hotel e inicio de tour. Visitas a Chinchero (pueblo), Salineras de Maras, Moray. Almuerzo incluido. Visita a Ollantaytambo y Pisaq. Retorno a Cusco. Fin del tour en Plaza San Francisco."
    },
    {
      destinationId: destination.id,
      dayNumber: 3,
      title: "Tour Machu Picchu",
      description: "Recojo de hotel, salida en tren hacia Aguas Calientes desde Ollantaytambo. Llegada a Aguas Calientes y reunión de grupo. Inicio de Tour a Machu Picchu. Fin del tour y retorno a Aguas Calientes. Partida en tren hacia Ollantaytambo y luego traslado a Cusco. Fin del tour en Plaza San Francisco."
    },
    {
      destinationId: destination.id,
      dayNumber: 4,
      title: "Vuelo de Retorno",
      description: "Partida hacia Aeropuerto. Llegada a Lima y vuelo de salida."
    }
  ];
  
  await db.insert(itineraryDays).values(itineraryData);
  
  const hotelsData = [
    {
      destinationId: destination.id,
      name: "ILLA HOTEL",
      location: "Cusco",
      category: "3 estrellas"
    }
  ];
  
  await db.insert(hotels).values(hotelsData);
  
  const inclusionsData = [
    { destinationId: destination.id, item: "Traslado de Aeropuerto/hotel/Aeropuerto – Cusco", displayOrder: 1 },
    { destinationId: destination.id, item: "3 noches de hospedaje en Cusco – ILLA HOTEL (3 estrellas)", displayOrder: 2 },
    { destinationId: destination.id, item: "Todos los desayunos ofrecidos por los hoteles (Box Breakfast para Machu Picchu)", displayOrder: 3 },
    { destinationId: destination.id, item: "City tour Arqueológico - Cusco", displayOrder: 4 },
    { destinationId: destination.id, item: "Tour a Salineras de Maras, Moray, Valle Sagrado (incluye almuerzo)", displayOrder: 5 },
    { destinationId: destination.id, item: "Tour a Machu Picchu", displayOrder: 6 },
    { destinationId: destination.id, item: "Ticket de TREN VOYAGER ó EXPEDITION", displayOrder: 7 },
    { destinationId: destination.id, item: "BTG (Boleto turístico general)", displayOrder: 8 },
    { destinationId: destination.id, item: "Ticket Ingreso a Machu Picchu", displayOrder: 9 },
    { destinationId: destination.id, item: "Boleto de bus de subida y bajada Aguas Calientes/Machupicchu/Aguas Calientes", displayOrder: 10 },
    { destinationId: destination.id, item: "Guía profesional bilingüe para todo el recorrido", displayOrder: 11 },
    { destinationId: destination.id, item: "Bus turístico", displayOrder: 12 }
  ];
  
  await db.insert(inclusions).values(inclusionsData);
  
  const exclusionsData = [
    { destinationId: destination.id, item: "Boletos aéreos LIMA – CUSCO – LIMA", displayOrder: 1 },
    { destinationId: destination.id, item: "4 Almuerzos", displayOrder: 2 },
    { destinationId: destination.id, item: "Cenas", displayOrder: 3 }
  ];
  
  await db.insert(exclusions).values(exclusionsData);
  
  console.log("✓ Cusco Clásico (4D/3N) procesado");
}

async function processCuscoExpress3D2N() {
  const text = await extractPdfText("CUSCO- 3 DIAS - 2 NOCHES_1759587574124.pdf");
  
  const [destination] = await db.select().from(destinations)
    .where(eq(destinations.name, "Cusco Express"));
  
  if (!destination) {
    console.log("Destino Cusco Express no encontrado");
    return;
  }
  
  await clearDestinationData(destination.id);
  
  const itineraryData = [
    {
      destinationId: destination.id,
      dayNumber: 1,
      title: "Llegada a Cusco / City Tour",
      description: "Traslado al aeropuerto, vuelo a Cusco, llegada y traslado a hotel. Por la tarde, City Tour por Cusco visitando la Catedral, Qoricancha, Sacsayhuaman, Qenqo, Puca Pucara y Tambomachay. Retorno al hotel."
    },
    {
      destinationId: destination.id,
      dayNumber: 2,
      title: "Tour Machu Picchu",
      description: "Salida muy temprano hacia estación de tren. Viaje en tren a Aguas Calientes. Ascenso a Machu Picchu en bus. Tour guiado por la ciudadela inca. Tiempo libre. Descenso a Aguas Calientes y retorno en tren a Cusco. Traslado al hotel."
    },
    {
      destinationId: destination.id,
      dayNumber: 3,
      title: "Vuelo de Retorno",
      description: "Desayuno en el hotel. Traslado al aeropuerto de Cusco para vuelo de retorno."
    }
  ];
  
  await db.insert(itineraryDays).values(itineraryData);
  
  const hotelsData = [
    {
      destinationId: destination.id,
      name: "Hotel turista",
      location: "Cusco",
      category: "Turista"
    }
  ];
  
  await db.insert(hotels).values(hotelsData);
  
  const inclusionsData = [
    { destinationId: destination.id, item: "Traslados aeropuerto - hotel - aeropuerto en Cusco", displayOrder: 1 },
    { destinationId: destination.id, item: "2 noches de alojamiento en Cusco", displayOrder: 2 },
    { destinationId: destination.id, item: "2 desayunos", displayOrder: 3 },
    { destinationId: destination.id, item: "City Tour en Cusco con entradas incluidas", displayOrder: 4 },
    { destinationId: destination.id, item: "Tour a Machu Picchu (tren + bus + entrada + guía)", displayOrder: 5 },
    { destinationId: destination.id, item: "Guía profesional en español", displayOrder: 6 }
  ];
  
  await db.insert(inclusions).values(inclusionsData);
  
  const exclusionsData = [
    { destinationId: destination.id, item: "Vuelos Lima - Cusco - Lima", displayOrder: 1 },
    { destinationId: destination.id, item: "Almuerzos y cenas", displayOrder: 2 },
    { destinationId: destination.id, item: "Gastos personales", displayOrder: 3 },
    { destinationId: destination.id, item: "Propinas", displayOrder: 4 }
  ];
  
  await db.insert(exclusions).values(exclusionsData);
  
  console.log("✓ Cusco Express (3D/2N) procesado");
}

async function processCuscoCompleto5D4N() {
  const text = await extractPdfText("CUSCO - 5 DIAS - 4 NOCHES_1759587574117.pdf");
  
  const [destination] = await db.select().from(destinations)
    .where(eq(destinations.name, "Cusco Completo"));
  
  if (!destination) {
    console.log("⚠ Destino Cusco Completo no encontrado");
    return;
  }
  
  await clearDestinationData(destination.id);
  
  const itineraryList = extractItinerary(text);
  if (itineraryList.length > 0) {
    const itineraryData = itineraryList.map(day => ({
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
  
  console.log(`✓ Cusco Completo (5D/4N) - Días: ${itineraryList.length}, Hoteles: ${hotelsList.length}, Inclusiones: ${inclusionsList.length}, Exclusiones: ${exclusionsList.length}`);
}

async function processCuscoExtended6D5N() {
  const text = await extractPdfText("CUSCO - 6 DIAS - 5 NOCHES_1759587574118.pdf");
  
  const [destination] = await db.select().from(destinations)
    .where(eq(destinations.name, "Cusco Extended"));
  
  if (!destination) {
    console.log("⚠ Destino Cusco Extended no encontrado");
    return;
  }
  
  await clearDestinationData(destination.id);
  
  const itineraryList = extractItinerary(text);
  if (itineraryList.length > 0) {
    const itineraryData = itineraryList.map(day => ({
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
  
  console.log(`✓ Cusco Extended (6D/5N) - Días: ${itineraryList.length}, Hoteles: ${hotelsList.length}, Inclusiones: ${inclusionsList.length}, Exclusiones: ${exclusionsList.length}`);
}

async function processCuscoPlusHuacachina5D4N() {
  const text = await extractPdfText("CUSCO + HUACACHINA - 5 DIAS - 4 NOCHES_1759587574122.pdf");
  
  const [destination] = await db.select().from(destinations)
    .where(eq(destinations.name, "Cusco + Huacachina"));
  
  if (!destination) {
    console.log("⚠ Destino Cusco + Huacachina no encontrado");
    return;
  }
  
  await clearDestinationData(destination.id);
  
  const itineraryList = extractItinerary(text);
  if (itineraryList.length > 0) {
    const itineraryData = itineraryList.map(day => ({
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
  
  console.log(`✓ Cusco + Huacachina (5D/4N) - Días: ${itineraryList.length}, Hoteles: ${hotelsList.length}, Inclusiones: ${inclusionsList.length}, Exclusiones: ${exclusionsList.length}`);
}

async function processCuscoPlusVinac4D3N() {
  const text = await extractPdfText("CUSCO + VINI - 4 DIAS - 3 NOCHES_1759587574123.pdf");
  
  const [destination] = await db.select().from(destinations)
    .where(eq(destinations.name, "Cusco + Viñac"));
  
  if (!destination) {
    console.log("⚠ Destino Cusco + Viñac no encontrado");
    return;
  }
  
  await clearDestinationData(destination.id);
  
  const itineraryList = extractItinerary(text);
  if (itineraryList.length > 0) {
    const itineraryData = itineraryList.map(day => ({
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
  
  console.log(`✓ Cusco + Viñac (4D/3N) - Días: ${itineraryList.length}, Hoteles: ${hotelsList.length}, Inclusiones: ${inclusionsList.length}, Exclusiones: ${exclusionsList.length}`);
}

async function processCuscoVinac5D4N() {
  const text = await extractPdfText("CUSCO - VINI - 5 DIAS - 4 NOCHES_1759587574121.pdf");
  
  const [destination] = await db.select().from(destinations)
    .where(eq(destinations.name, "Cusco - Viñac"));
  
  if (!destination) {
    console.log("⚠ Destino Cusco - Viñac no encontrado");
    return;
  }
  
  await clearDestinationData(destination.id);
  
  const itineraryList = extractItinerary(text);
  if (itineraryList.length > 0) {
    const itineraryData = itineraryList.map(day => ({
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
  
  console.log(`✓ Cusco - Viñac (5D/4N) - Días: ${itineraryList.length}, Hoteles: ${hotelsList.length}, Inclusiones: ${inclusionsList.length}, Exclusiones: ${exclusionsList.length}`);
}

async function processCuscoHuacachina6D5N() {
  const text = await extractPdfText("CUSCO - HUACACHINA - 6 DIAS - 5 NOCHES_1759587574119.pdf");
  
  const [destination] = await db.select().from(destinations)
    .where(eq(destinations.name, "Cusco - Huacachina"));
  
  if (!destination) {
    console.log("⚠ Destino Cusco - Huacachina no encontrado");
    return;
  }
  
  await clearDestinationData(destination.id);
  
  const itineraryList = extractItinerary(text);
  if (itineraryList.length > 0) {
    const itineraryData = itineraryList.map(day => ({
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
  
  console.log(`✓ Cusco - Huacachina (6D/5N) - Días: ${itineraryList.length}, Hoteles: ${hotelsList.length}, Inclusiones: ${inclusionsList.length}, Exclusiones: ${exclusionsList.length}`);
}

async function processCuscoHuacachinaLima7D6N() {
  const text = await extractPdfText("CUSCO - HUACACHINA - LIMA - 7 DIAS - 6 NOCHES_1759587574120.pdf");
  
  const [destination] = await db.select().from(destinations)
    .where(eq(destinations.name, "Cusco - Huacachina - Lima"));
  
  if (!destination) {
    console.log("⚠ Destino Cusco - Huacachina - Lima no encontrado");
    return;
  }
  
  await clearDestinationData(destination.id);
  
  const itineraryList = extractItinerary(text);
  if (itineraryList.length > 0) {
    const itineraryData = itineraryList.map(day => ({
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
  
  console.log(`✓ Cusco - Huacachina - Lima (7D/6N) - Días: ${itineraryList.length}, Hoteles: ${hotelsList.length}, Inclusiones: ${inclusionsList.length}, Exclusiones: ${exclusionsList.length}`);
}

async function processCuscoParacasLima9D8N() {
  const text = await extractPdfText("CUSCO - PARACAS - LIMA - 9 DIAS - 8 NOCHES_1759587574120.pdf");
  
  const [destination] = await db.select().from(destinations)
    .where(eq(destinations.name, "Cusco - Paracas - Lima"));
  
  if (!destination) {
    console.log("⚠ Destino Cusco - Paracas - Lima no encontrado");
    return;
  }
  
  await clearDestinationData(destination.id);
  
  const itineraryList = extractItinerary(text);
  if (itineraryList.length > 0) {
    const itineraryData = itineraryList.map(day => ({
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
  
  console.log(`✓ Cusco - Paracas - Lima (9D/8N) - Días: ${itineraryList.length}, Hoteles: ${hotelsList.length}, Inclusiones: ${inclusionsList.length}, Exclusiones: ${exclusionsList.length}`);
}

async function main() {
  console.log("Procesando destinos de Cusco (PDFs)...\n");
  
  try {
    await processCusco4D3N();
    await processCuscoExpress3D2N();
    await processCuscoCompleto5D4N();
    await processCuscoExtended6D5N();
    await processCuscoPlusHuacachina5D4N();
    await processCuscoPlusVinac4D3N();
    await processCuscoVinac5D4N();
    await processCuscoHuacachina6D5N();
    await processCuscoHuacachinaLima7D6N();
    await processCuscoParacasLima9D8N();
    
    console.log("\n✓ Procesamiento completado! Todos los destinos de Cusco han sido procesados.");
  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch(console.error).finally(() => process.exit(0));
