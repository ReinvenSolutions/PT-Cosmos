import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Download, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function safeFileBase(title: string): string {
  const t = title
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\-_.]/g, "")
    .slice(0, 80);
  return t || "programa";
}

type PlanAudioPlayerProps = {
  destinationId: string;
  src: string;
  planTitle: string;
  className?: string;
};

export function PlanAudioPlayer({ destinationId, src, planTitle, className }: PlanAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrubbingRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadErr, setDownloadErr] = useState<string | null>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    scrubbingRef.current = false;
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    el.pause();
    el.src = src;
    el.load();
  }, [src]);

  const onTimeUpdate = useCallback(() => {
    if (scrubbingRef.current) return;
    const el = audioRef.current;
    if (!el) return;
    setCurrent(el.currentTime);
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onLoadedMeta = () => setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
      el.currentTime = 0;
    };
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("loadedmetadata", onLoadedMeta);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("loadedmetadata", onLoadedMeta);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
  }, [src, onTimeUpdate]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      return;
    }
    void el.play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, [playing]);

  const onDownload = async () => {
    const base = safeFileBase(planTitle);
    setDownloadErr(null);
    setDownloadBusy(true);
    try {
      const res = await fetch(
        `/api/destinations/${encodeURIComponent(destinationId)}/descriptive-audio-download`,
        { credentials: "include" },
      );
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        let msg = res.statusText || "Error al descargar";
        try {
          const j = JSON.parse(errBody) as { message?: string };
          if (j?.message) msg = j.message;
        } catch {
          if (errBody && errBody.length > 0 && errBody.length < 200) msg = errBody;
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${base}.mp3`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setDownloadErr((e as Error)?.message || "No se pudo descargar el audio.");
    } finally {
      setDownloadBusy(false);
    }
  };

  const max = duration > 0 ? duration : 1;

  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/40",
        "shadow-md backdrop-blur-sm p-4 sm:p-5",
        className,
      )}
    >
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" className="hidden" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3 min-w-0 lg:max-w-[min(100%,280px)]">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/20">
            <Headphones className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Audio descriptivo
            </p>
            <p className="text-sm font-medium text-foreground leading-snug">
              Escucha el programa mientras revisas itinerario y condiciones
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 min-w-0">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="default"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-full shadow-sm"
              onClick={toggle}
              aria-label={playing ? "Pausar audio" : "Reproducir audio"}
            >
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 pl-0.5" />}
            </Button>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <Slider
                value={[Math.min(current, max)]}
                max={max}
                step={0.25}
                disabled={!duration}
                onValueChange={(v) => {
                  scrubbingRef.current = true;
                  const t = Math.min(v[0] ?? 0, max);
                  setCurrent(t);
                  const el = audioRef.current;
                  if (el) el.currentTime = t;
                }}
                onValueCommit={() => {
                  scrubbingRef.current = false;
                }}
                className="py-1"
              />
              <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground px-0.5">
                <span>{formatTime(current)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-2 self-start lg:self-center border-primary/25 hover:bg-primary/5"
          onClick={() => void onDownload()}
          disabled={downloadBusy}
        >
          <Download className="h-4 w-4" aria-hidden />
          {downloadBusy ? "Descargando…" : "Descargar MP3"}
        </Button>
      </div>
      {downloadErr ? (
        <p className="mt-3 text-xs text-destructive leading-snug">{downloadErr}</p>
      ) : null}
    </div>
  );
}
