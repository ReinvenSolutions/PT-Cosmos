import mammoth from "mammoth";
import fs from "fs/promises";
import path from "path";

async function readDocx(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function extractItineraryDebug(text: string, filename: string): void {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  const dayPattern = /^D[ií]a\s+(\d+)\s*[:\-–]\s*(.+)$/i;
  
  let currentDay: any = null;
  let currentDescription: string[] = [];
  let skipUntilDetailedSection = true;
  let inHotelSection = false;
  const days: any[] = [];
  
  console.log(`\n${"=".repeat(80)}`);
  console.log(`Processing: ${filename}`);
  console.log("=".repeat(80));
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect hotel section
    if (line.match(/^(Ciudad|Turista\s*\d+|Superior\s*\d+|Deluxe\s*\d+|Gold\s+Deluxe)/i)) {
      if (!inHotelSection) {
        console.log(`Line ${i}: ENTERING HOTEL SECTION`);
      }
      inHotelSection = true;
    }
    
    // Stop when we reach the inclusions/exclusions sections
    if (line.match(/^(SERVICIO.*INCLUIDO|SERVICIO.*NO INCLUIDO|INCLUYE|NO INCLUYE|Notas|Términos)/i)) {
      console.log(`Line ${i}: BREAK - Found section marker: ${line.substring(0, 50)}`);
      break;
    }
    
    const match = line.match(dayPattern);
    
    if (match) {
      const dayNumber = parseInt(match[1]);
      let title = match[2].trim();
      
      title = title.replace(/\s*\([^)]*\)\s*\.?\s*$/g, '').trim();
      title = title.replace(/\.\s*$/g, '').trim();
      
      const hasSubstantialContent = title.length > 5;
      
      if (hasSubstantialContent && skipUntilDetailedSection) {
        console.log(`Line ${i}: STARTING DETAILED SECTION at Day ${dayNumber}`);
        skipUntilDetailedSection = false;
      }
      
      if (!skipUntilDetailedSection) {
        if (currentDay && currentDescription.length > 0) {
          currentDay.description = currentDescription.join(' ').trim();
          days.push(currentDay);
          console.log(`  -> Saved Day ${currentDay.dayNumber} with ${currentDescription.length} description lines`);
          currentDescription = [];
        }
        
        console.log(`Line ${i}: Found Day ${dayNumber}: ${title}`);
        currentDay = {
          dayNumber,
          title: title || `Día ${dayNumber}`,
          description: ''
        };
        
        inHotelSection = false;
      }
    } else if (currentDay && !skipUntilDetailedSection && !inHotelSection) {
      if (line.length > 10 && !line.match(/^(ITINERARIO|CIRCUITO|OPCIONAL|Régimen|Recomendaciones)/i)) {
        currentDescription.push(line);
      }
    }
  }
  
  if (currentDay) {
    if (currentDescription.length > 0) {
      currentDay.description = currentDescription.join(' ').trim();
    } else {
      currentDay.description = currentDay.title;
    }
    days.push(currentDay);
    console.log(`  -> Saved FINAL Day ${currentDay.dayNumber} with ${currentDescription.length} description lines`);
  }
  
  console.log(`\nTotal days extracted: ${days.length}`);
  days.forEach(day => {
    console.log(`  Day ${day.dayNumber}: ${day.title} (${day.description.length} chars)`);
  });
}

async function main() {
  const files = [
    "VIETNAM 4D -3N_1759587598463.docx",
  ];
  
  for (const fileName of files) {
    const filePath = path.join(process.cwd(), "attached_assets", fileName);
    const text = await readDocx(filePath);
    extractItineraryDebug(text, fileName);
  }
}

main().catch(console.error);
