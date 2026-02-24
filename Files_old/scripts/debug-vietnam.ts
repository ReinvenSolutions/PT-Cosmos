import mammoth from "mammoth";
import fs from "fs/promises";
import path from "path";

async function readDocx(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function main() {
  const files = [
    { file: "VIETNAM 4D -3N_1759587598463.docx", expectedDays: 4 },
    { file: "VIETNAM 5D -4N_1759587598465.docx", expectedDays: 5 },
    { file: "VIETNAM 6D -5N_1759587598466.docx", expectedDays: 6 },
  ];
  
  for (const { file, expectedDays } of files) {
    const filePath = path.join(process.cwd(), "attached_assets", file);
    console.log(`\n${"=".repeat(80)}`);
    console.log(`FILE: ${file} (Expected ${expectedDays} days)`);
    console.log("=".repeat(80));
    
    const text = await readDocx(filePath);
    const lines = text.split('\n');
    
    console.log("\nAll lines matching day patterns:");
    const dayPattern = /D[ií]a\s+(\d+)/i;
    lines.forEach((line, idx) => {
      if (dayPattern.test(line.trim())) {
        console.log(`Line ${idx}: ${line.trim()}`);
      }
    });
    
    // Find where itinerary section ends
    console.log("\nLines that might mark end of itinerary:");
    lines.forEach((line, idx) => {
      if (line.trim().match(/^(SERVICIO|INCLUYE|NO INCLUYE|CATEGORIA|HOTEL)/i)) {
        console.log(`Line ${idx}: ${line.trim()}`);
      }
    });
  }
}

main().catch(console.error);
