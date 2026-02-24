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
    "TAILANDIA 6D-5N_1759587590768.docx",
    "VIETNAM 4D -3N_1759587598463.docx"
  ];
  
  for (const fileName of files) {
    const filePath = path.join(process.cwd(), "attached_assets", fileName);
    console.log(`\n${"=".repeat(80)}`);
    console.log(`FILE: ${fileName}`);
    console.log("=".repeat(80));
    
    const text = await readDocx(filePath);
    
    // Show first 3000 characters to understand structure
    console.log(text.substring(0, 3000));
    console.log("\n...\n");
    
    // Find all day patterns
    const lines = text.split('\n');
    console.log("\nLines that might be day headers:");
    lines.forEach((line, idx) => {
      if (line.match(/d[ií]a\s*\d+/i) || line.match(/day\s*\d+/i)) {
        console.log(`Line ${idx}: ${line.trim()}`);
      }
    });
  }
}

main().catch(console.error);
