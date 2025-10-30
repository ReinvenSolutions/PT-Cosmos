import mammoth from "mammoth";
import fs from "fs/promises";
import path from "path";

async function readDocx(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function main() {
  const filePath = path.join(process.cwd(), "attached_assets", "VIETNAM 4D -3N_1759587598463.docx");
  const text = await readDocx(filePath);
  const lines = text.split('\n');
  
  console.log("Content from line 80 (Día 4) to line 186 (SERVICIO INCLUIDOS):");
  console.log("=".repeat(80));
  for (let i = 80; i < 186; i++) {
    if (lines[i].trim()) {
      console.log(`${i}: ${lines[i].trim()}`);
    }
  }
}

main().catch(console.error);
