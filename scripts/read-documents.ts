import mammoth from "mammoth";
import fs from "fs/promises";
import path from "path";
import * as pdfParseModule from "pdf-parse";

const pdfParse = (pdfParseModule as any).default || pdfParseModule;

async function readDocx(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function readPdf(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

async function main() {
  const assetsDir = path.join(process.cwd(), "..", "attached_assets");
  
  console.log("=== ESTAMBUL Y CAPADOCIA ===\n");
  const estambulText = await readDocx(path.join(assetsDir, "ESTAMBUL Y CAPADOCIA_1759587583698.docx"));
  console.log(estambulText);
  console.log("\n\n");
  
  console.log("=== DUBAI 3D-2N ===\n");
  const dubaiText = await readDocx(path.join(assetsDir, "DUBAI 3D-2N_1759587489610.docx"));
  console.log(dubaiText);
  console.log("\n\n");
  
  console.log("=== CUSCO 4D-3N ===\n");
  const cuscoText = await readPdf(path.join(assetsDir, "CUSCO - 4 DIAS - 3 NOCHES_1759587574116.pdf"));
  console.log(cuscoText);
}

main().catch(console.error);
