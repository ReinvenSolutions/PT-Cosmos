import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { FileText, Check } from "lucide-react";

interface PDFLoadingModalProps {
  isOpen: boolean;
}

const loadingSteps = [
  { message: "Preparando datos de la cotización...", duration: 1000 },
  { message: "Generando páginas del documento...", duration: 1500 },
  { message: "Procesando imágenes y contenido...", duration: 1200 },
  { message: "Aplicando formato profesional...", duration: 1000 },
  { message: "Finalizando tu cotización...", duration: 800 },
];

export function PDFLoadingModal({ isOpen }: PDFLoadingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setProgress(0);
      return;
    }

    let stepTimeout: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;

    const totalDuration = loadingSteps.reduce((acc, step) => acc + step.duration, 0);
    const progressPerStep = 100 / loadingSteps.length;

    const runSteps = () => {
      let currentTime = 0;
      let stepIndex = 0;

      const updateStep = () => {
        if (stepIndex < loadingSteps.length) {
          setCurrentStep(stepIndex);
          currentTime += loadingSteps[stepIndex].duration;
          stepIndex++;
          stepTimeout = setTimeout(updateStep, loadingSteps[stepIndex - 1].duration);
        }
      };

      updateStep();

      // Smooth progress animation
      const startTime = Date.now();
      progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const calculatedProgress = Math.min((elapsed / totalDuration) * 100, 99);
        setProgress(calculatedProgress);
      }, 50);
    };

    runSteps();

    return () => {
      clearTimeout(stepTimeout);
      clearInterval(progressInterval);
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen}>
      <DialogContent 
        className="sm:max-w-md [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center justify-center py-8 px-4">
          {/* Icon with animation */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
            <div className="relative bg-blue-500 p-4 rounded-full">
              <FileText className="w-8 h-8 text-white animate-pulse" />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">
            Generando tu Cotización
          </h3>

          {/* Progress bar */}
          <div className="w-full mb-6">
            <Progress value={progress} className="h-2 mb-2" />
            <p className="text-sm text-gray-600 text-center">
              {Math.round(progress)}% completado
            </p>
          </div>

          {/* Current step message */}
          <div className="min-h-[60px] flex items-center justify-center">
            <div className="flex items-center gap-2 text-blue-600">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              <p className="text-sm font-medium animate-fade-in">
                {loadingSteps[currentStep]?.message}
              </p>
            </div>
          </div>

          {/* Steps indicator */}
          <div className="flex gap-2 mt-4">
            {loadingSteps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index <= currentStep
                    ? "bg-blue-500 w-8"
                    : "bg-gray-200 w-6"
                }`}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
