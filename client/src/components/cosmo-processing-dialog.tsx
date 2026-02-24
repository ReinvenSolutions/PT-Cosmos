"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import confetti from "canvas-confetti";
import { Bot, FileText, CheckCircle2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type CosmoProcessingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isProcessing: boolean;
  success: boolean;
  userName?: string | null;
  onSuccessComplete?: () => void;
  /** Progreso real del backend (0-100). Si se provee, se usa en lugar del simulado. */
  progress?: number;
  /** Etiqueta real de la etapa actual. Si se provee, se muestra en lugar del ciclo simulado. */
  stageLabel?: string;
};

export function CosmoProcessingDialog({
  open,
  onOpenChange,
  isProcessing,
  success,
  userName,
  onSuccessComplete,
  progress: realProgress,
  stageLabel: realStageLabel,
}: CosmoProcessingDialogProps) {
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dotCycle, setDotCycle] = useState(0);
  const confettiFired = useRef(false);

  const progress = realProgress ?? simulatedProgress;
  // Etiqueta del backend o mensaje según porcentaje (fallback cuando no hay stream)
  const stageLabel = realStageLabel ?? (progress < 15 ? "Revisando archivo..." : progress < 30 ? "Extrayendo texto..." : progress < 50 ? "Explorando datos..." : progress < 80 ? "Analizando con IA..." : "Preparando la información...");
  const isWaitingForAI = progress >= 40 && progress < 78;

  // Progreso simulado solo cuando NO hay progreso real (fallback legacy)
  useEffect(() => {
    if (!isProcessing || success || realProgress !== undefined) return;
    setSimulatedProgress(0);
    setShowSuccess(false);
    confettiFired.current = false;
    const interval = setInterval(() => {
      setSimulatedProgress((p) => {
        if (p >= 95) return 95;
        return p + Math.random() * 6 + 3;
      });
    }, 350);
    return () => clearInterval(interval);
  }, [isProcessing, success, realProgress]);

  // Puntos animados cada 800ms cuando estamos en fase de espera (analizando IA)
  useEffect(() => {
    if (!isProcessing || !isWaitingForAI || showSuccess) return;
    const t = setInterval(() => setDotCycle((c) => c + 1), 800);
    return () => clearInterval(t);
  }, [isProcessing, isWaitingForAI, showSuccess]);

  // Éxito: confetti UNA sola vez + mensaje
  useEffect(() => {
    if (success && open && !confettiFired.current) {
      setShowSuccess(true);
      confettiFired.current = true;
      const runConfetti = () => {
        const count = 180;
        const defaults = { origin: { y: 0.7 } };
        function fire(particleRatio: number, opts: confetti.Options) {
          confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) });
        }
        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
      };
      const t = setTimeout(runConfetti, 400);
      return () => clearTimeout(t);
    }
  }, [success, open]);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen === false && isProcessing) return;
    if (!newOpen && showSuccess) {
      onSuccessComplete?.();
    }
    if (!newOpen) {
      setShowSuccess(false);
      setSimulatedProgress(0);
      confettiFired.current = false;
    }
    onOpenChange(newOpen);
  };

  const displayName = userName?.trim() || "amigo";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        data-processing={isProcessing}
        aria-describedby="cosmo-dialog-description"
        className="sm:max-w-lg p-0 overflow-hidden border-0 shadow-2xl bg-transparent [&>button]:text-white/70 [&>button]:hover:text-white [&>button]:right-5 [&>button]:top-5 [&[data-processing=true]>button]:invisible [&[data-processing=true]>button]:pointer-events-none"
        onPointerDownOutside={(e) => {
          if (isProcessing) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isProcessing) e.preventDefault();
        }}
      >
        {/* Contenedor glassmorphism tecnológico */}
        <div className="relative bg-gradient-to-br from-slate-900/95 via-teal-900/90 to-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden">
          {/* Grid sutil de fondo */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px]" />
          {/* Borde superior brillante */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

          <div className="relative p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl text-white">
                <motion.span
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg shadow-cyan-500/25"
                  animate={isProcessing && !showSuccess ? { scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] } : {}}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  {showSuccess ? (
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  ) : (
                    <Bot className="h-6 w-6 text-white" />
                  )}
                </motion.span>
                <span className="bg-gradient-to-r from-white to-cyan-200/80 bg-clip-text text-transparent font-semibold">
                  {showSuccess ? "¡Excelente!" : "COSMO en acción"}
                </span>
              </DialogTitle>
            </DialogHeader>

            <DialogDescription asChild>
              <div id="cosmo-dialog-description" className="space-y-5 pt-4">
                <AnimatePresence mode="wait">
                  {isProcessing && !showSuccess && (
                    <motion.div
                      key="processing"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-5"
                    >
                      {/* Estado actual que cambia con el progreso */}
                      <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-4">
                        {isWaitingForAI ? (
                          <Sparkles className="h-8 w-8 shrink-0 text-amber-400/90" />
                        ) : (
                          <FileText className="h-8 w-8 shrink-0 text-cyan-400/80" />
                        )}
                        <div className="flex-1 min-w-0">
                          <motion.p
                            key={`${stageLabel}-${dotCycle}`}
                            initial={{ opacity: 0.8 }}
                            animate={{ opacity: 1 }}
                            className="text-base font-medium text-cyan-200"
                          >
                            {stageLabel}
                            {isWaitingForAI && (
                              <span className="inline-block w-8 text-left">
                                {["", ".", "..", "..."][dotCycle % 4]}
                              </span>
                            )}
                          </motion.p>
                          {isWaitingForAI && (
                            <p className="mt-0.5 text-xs text-cyan-400/70">
                              La inteligencia artificial está trabajando. Puede tardar unos segundos.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Barra de progreso con porcentaje */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-cyan-400/90">Progreso</span>
                          <span className="font-semibold text-cyan-200">{Math.round(progress)}%</span>
                        </div>
                        <Progress
                          value={progress}
                          className="h-3 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-cyan-500 [&>div]:to-teal-500 [&>div]:transition-all [&>div]:duration-500 [&>div]:ease-out"
                        />
                      </div>
                    </motion.div>
                  )}

                  {showSuccess && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="space-y-5"
                    >
                      <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/20 p-4">
                        <p className="text-white/95 leading-relaxed text-base font-medium">
                          {displayName && displayName !== "amigo"
                            ? `${displayName}, ya terminé de procesar la información.`
                            : "Ya terminé de procesar la información."}
                        </p>
                      </div>
                      <p className="text-cyan-200/85 text-sm">
                        Recuerda revisar bien los datos y editarlos antes de guardar.
                      </p>
                      <p className="text-xs text-white/50 italic">
                        — Cosmo, tu agente
                      </p>
                      <DialogFooter className="pt-2 gap-2 sm:gap-0">
                        <Button
                          onClick={() => handleOpenChange(false)}
                          className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white border-0 w-full sm:w-auto"
                        >
                          ¡Entendido!
                        </Button>
                      </DialogFooter>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </DialogDescription>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
