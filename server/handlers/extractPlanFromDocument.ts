import type { Request, Response } from "express";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { extractPlanHeuristic, extractPlanWithAI, type ExtractedPlan } from "../services/planDocumentExtractor";
import { logger } from "../logger";

/** Respuesta JSON normal (para errores o clientes legacy) */
function safeJson(res: Response, status: number, data: object): void {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).json(data);
}

/** Envía un chunk NDJSON por streaming y fuerza flush si está disponible */
function sendStreamChunk(res: Response, data: object): void {
  res.write(JSON.stringify(data) + "\n");
  (res as Response & { flush?: () => void }).flush?.();
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    if (text?.trim()) return text;
  } catch (e) {
    logger.warn("unpdf falló, intentando pdf-parse", { error: (e as Error).message });
  }
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result?.text ?? "";
    } finally {
      await parser.destroy();
    }
  } catch (e) {
    logger.warn("pdf-parse fallback falló", { error: (e as Error).message });
    throw new Error("No se pudo extraer texto del PDF. Verifica que el archivo sea un PDF válido.");
  }
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export async function handleExtractPlanFromDocument(req: Request, res: Response): Promise<void> {
  const wantsStream = req.headers["x-stream-progress"] === "true";

  try {
    if (!req.file || !req.file.buffer) {
      safeJson(res, 400, { message: "No se subió ningún archivo. Usa PDF o Word (.docx)." });
      return;
    }

    const { buffer, originalname, mimetype } = req.file;
    if (buffer.length > MAX_FILE_SIZE) {
      safeJson(res, 400, { message: "Archivo muy grande. Máximo 50 MB." });
      return;
    }

    const ext = originalname?.split(".").pop()?.toLowerCase();
    const isPdf = ext === "pdf" || mimetype === "application/pdf";
    const isDocx = ext === "docx" || mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    if (!isPdf && !isDocx) {
      safeJson(res, 400, { message: "Solo se permiten PDF o Word (.docx)." });
      return;
    }

    let rawText: string;

    const userName = (req.user as { name?: string; username?: string } | undefined)?.name || (req.user as { username?: string } | undefined)?.username || "";

    if (wantsStream) {
      res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
      res.setHeader("Transfer-Encoding", "chunked");
      res.status(200);
      res.flushHeaders();
      const greeting = userName
        ? `${userName}, estoy revisando tu archivo...`
        : "Estoy revisando tu archivo...";
      sendStreamChunk(res, { stage: "reading", progress: 5, label: greeting });
    }

    if (isPdf) {
      if (wantsStream) sendStreamChunk(res, { stage: "extracting", progress: 15, label: "Estoy extrayendo el texto del PDF..." });
      rawText = await extractTextFromPdf(buffer);
    } else {
      if (wantsStream) sendStreamChunk(res, { stage: "extracting", progress: 15, label: "Estoy extrayendo el texto de Word..." });
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value || "";
    }

    if (wantsStream) {
      sendStreamChunk(res, { stage: "extracting", progress: 28, label: "Estoy explorando los datos del documento..." });
    }

    if (!rawText.trim()) {
      if (wantsStream) {
        sendStreamChunk(res, { stage: "error", progress: 0, error: "No se pudo extraer texto del documento." });
        res.end();
        return;
      }
      safeJson(res, 400, {
        message: "No se pudo extraer texto del documento. Verifica que el archivo no esté dañado.",
      });
      return;
    }

    if (wantsStream) {
      sendStreamChunk(res, { stage: "analyzing", progress: 45, label: "Estoy analizándolo con inteligencia artificial..." });
    }

    let extracted: ExtractedPlan;
    // Durante la espera de IA, enviar actualizaciones cada ~3s para que la UX no parezca trabada
    let tickCount = 0;
    const progressInterval =
      wantsStream
        ? setInterval(() => {
            const labels = [
              "La IA está leyendo tu documento...",
              "Identificando itinerarios y hoteles...",
              "Extrayendo precios y fechas...",
              "Casi listo con el análisis...",
            ];
            const idx = Math.min(tickCount, labels.length - 1);
            tickCount += 1;
            sendStreamChunk(res, {
              stage: "analyzing",
              progress: Math.min(45 + tickCount * 6, 72),
              label: labels[idx],
            });
          }, 3000)
        : undefined;

    const withAI = await extractPlanWithAI(rawText);

    if (progressInterval) clearInterval(progressInterval);

    if (wantsStream) {
      sendStreamChunk(res, { stage: "structuring", progress: 75, label: "Estoy estructurando la información..." });
    }

    if (withAI) {
      extracted = withAI;
      logger.info("Plan extracted with AI", { name: extracted.name });
    } else {
      extracted = extractPlanHeuristic(rawText);
      logger.info("Plan extracted with heuristic parser", { name: extracted.name });
    }

    if (wantsStream) {
      sendStreamChunk(res, { stage: "copying", progress: 95, label: "Estoy preparando todo para ti..." });
      sendStreamChunk(res, { stage: "done", progress: 100, plan: extracted, source: withAI ? "ai" : "heuristic" });
      res.end();
    } else {
      safeJson(res, 200, {
        plan: extracted,
        source: withAI ? "ai" : "heuristic",
      });
    }
  } catch (error) {
    const err = error as Error;
    logger.error("Extract plan from document error", { error: err.message, stack: err.stack });
    // Si ya enviamos headers de streaming, enviar error en formato NDJSON y cerrar
    if (wantsStream && res.headersSent) {
      try {
        sendStreamChunk(res, { stage: "error", progress: 0, error: err.message });
        res.end();
      } catch (e) {
        logger.error("Error sending stream error chunk", { error: (e as Error).message });
      }
      return;
    }
    if (wantsStream && !res.headersSent) {
      try {
        sendStreamChunk(res, { stage: "error", progress: 0, error: err.message });
        res.end();
      } catch {
        safeJson(res, 500, { message: "Error al procesar el documento. Intenta con otro archivo o formato." });
      }
    } else {
      safeJson(res, 500, {
        message: err.message || "Error al procesar el documento. Intenta con otro archivo o formato.",
      });
    }
  }
}
