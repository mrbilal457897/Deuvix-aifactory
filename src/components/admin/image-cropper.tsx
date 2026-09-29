"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import {
  X,
  Check,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageCropperProps {
  src: string;
  fileName?: string;
  onComplete: (file: File) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

const MAX_FRAME_W = 560;
const MAX_FRAME_H = 420;
const MIN_FRAME = 96;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
const OUTPUT_SIZES = [512, 1024, 1600, 2048];
const DEFAULT_OUTPUT_SIZE = 1600;
const NUDGE_STEPS = [1, 5, 20];

const RATIO_PRESETS = [
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
  { label: "3:4", value: 3 / 4 },
  { label: "2:3", value: 2 / 3 },
];

const clampZoom = (value: number) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

const clampDim = (value: number, max: number) =>
  Math.min(max, Math.max(MIN_FRAME, Math.round(value)));

function formatRatio(ratio: number): string {
  const known: Record<string, string> = {
    "1": "1:1",
    "1.7777777777777777": "16:9",
    "1.3333333333333333": "4:3",
    "1.5": "3:2",
    "0.75": "3:4",
    "0.6666666666666666": "2:3",
  };
  return known[String(ratio)] ?? `${ratio.toFixed(2)}:1`;
}

function frameForRatio(ratio: number) {
  let w = MAX_FRAME_W;
  let h = w / ratio;
  if (h > MAX_FRAME_H) {
    h = MAX_FRAME_H;
    w = h * ratio;
  }
  return { width: Math.round(w), height: Math.round(h) };
}

const NUDGE_DIRS: Record<string, { x: number; y: number }> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};

const NUDGE_ICONS: Record<string, LucideIcon> = {
  left: ArrowLeft,
  right: ArrowRight,
  up: ArrowUp,
  down: ArrowDown,
};

const KEY_DIRS: Record<string, { x: number; y: number }> = {
  arrowleft: NUDGE_DIRS.left,
  arrowright: NUDGE_DIRS.right,
  arrowup: NUDGE_DIRS.up,
  arrowdown: NUDGE_DIRS.down,
};

interface HandleProps {
  dirX: number;
  dirY: number;
  className: string;
  onStart: (e: React.PointerEvent<HTMLDivElement>, dirX: number, dirY: number) => void;
  onMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onEnd: (e: React.PointerEvent<HTMLDivElement>) => void;
}

function Handle({ dirX, dirY, className, onStart, onMove, onEnd }: HandleProps) {
  return (
    <div
      role="presentation"
      onPointerDown={(e) => onStart(e, dirX, dirY)}
      onPointerMove={onMove}
      onPointerUp={onEnd}
      onPointerCancel={onEnd}
      className={cn(
        "absolute z-20 rounded-[3px] transition-colors hover:bg-primary/50",
        className
      )}
    />
  );
}

export default function ImageCropper({
  src,
  fileName = "image",
  onComplete,
  onCancel,
  aspectRatio = 1,
}: ImageCropperProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [outputSize, setOutputSize] = useState(DEFAULT_OUTPUT_SIZE);
  const [format, setFormat] = useState<"image/jpeg" | "image/png">("image/png");
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [ratio, setRatio] = useState<number | null>(aspectRatio);
  const [frame, setFrame] = useState(() => frameForRatio(aspectRatio));
  const [nudgeStep, setNudgeStep] = useState(5);

  const dragOrigin = useRef({ pointerX: 0, pointerY: 0, offsetX: 0, offsetY: 0 });
  const resizeOrigin = useRef({ startW: 0, startH: 0, pointerX: 0, pointerY: 0, dirX: 0, dirY: 0 });
  const repeatTimer = useRef<number | null>(null);
  const limitsRef = useRef({ x: 0, y: 0 });
  const ratioRef = useRef<number | null>(aspectRatio);
  const stepRef = useRef(nudgeStep);

  const rotated = useMemo(() => {
    const swapped = rotation % 180 !== 0;
    return {
      width: swapped ? natural.height : natural.width,
      height: swapped ? natural.width : natural.height,
    };
  }, [natural, rotation]);

  const coverScale = useMemo(() => {
    if (!rotated.width || !rotated.height) return 1;
    return Math.max(frame.width / rotated.width, frame.height / rotated.height);
  }, [rotated, frame]);

  const containScale = useMemo(() => {
    if (!rotated.width || !rotated.height) return 1;
    return Math.min(frame.width / rotated.width, frame.height / rotated.height);
  }, [rotated, frame]);

  const scale = useMemo(() => coverScale * zoom, [coverScale, zoom]);

  const display = useMemo(() => {
    const w = natural.width * scale;
    const h = natural.height * scale;
    const limitX = Math.max(0, (rotated.width * scale - frame.width) / 2);
    const limitY = Math.max(0, (rotated.height * scale - frame.height) / 2);
    return { width: w, height: h, limitX, limitY };
  }, [natural, scale, rotated, frame]);

  const frameRatio = frame.width / frame.height;

  const output = useMemo(() => {
    if (frameRatio >= 1) {
      return { width: outputSize, height: Math.round(outputSize / frameRatio) };
    }
    return { width: Math.round(outputSize * frameRatio), height: outputSize };
  }, [frameRatio, outputSize]);

  useEffect(() => {
    limitsRef.current = { x: display.limitX, y: display.limitY };
    ratioRef.current = ratio;
    stepRef.current = nudgeStep;
  });

  const safeOffset = useMemo(
    () => ({
      x: Math.min(display.limitX, Math.max(-display.limitX, offset.x)),
      y: Math.min(display.limitY, Math.max(-display.limitY, offset.y)),
    }),
    [offset, display.limitX, display.limitY]
  );

  const nudge = useCallback((dir: { x: number; y: number }, step?: number) => {
    const s = step ?? stepRef.current;
    setOffset((p) => {
      const L = limitsRef.current;
      return {
        x: Math.min(L.x, Math.max(-L.x, p.x + dir.x * s)),
        y: Math.min(L.y, Math.max(-L.y, p.y + dir.y * s)),
      };
    });
  }, []);

  const stopRepeat = useCallback(() => {
    if (repeatTimer.current !== null) {
      window.clearInterval(repeatTimer.current);
      repeatTimer.current = null;
    }
  }, []);

  const startRepeat = useCallback(
    (dir: { x: number; y: number }) => {
      nudge(dir);
      stopRepeat();
      repeatTimer.current = window.setInterval(() => nudge(dir), 60);
    },
    [nudge, stopRepeat]
  );

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  useEffect(() => stopRepeat, [stopRepeat]);

  const reset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setRatio(aspectRatio);
    setFrame(frameForRatio(aspectRatio));
  }, [aspectRatio]);

  const applyRatio = useCallback((next: number | null) => {
    setRatio(next);
    if (next !== null) setFrame(frameForRatio(next));
    setOffset({ x: 0, y: 0 });
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (resizing) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragOrigin.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      offsetX: safeOffset.x,
      offsetY: safeOffset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const L = limitsRef.current;
    setOffset({
      x: Math.min(L.x, Math.max(-L.x, dragOrigin.current.offsetX + (e.clientX - dragOrigin.current.pointerX))),
      y: Math.min(L.y, Math.max(-L.y, dragOrigin.current.offsetY + (e.clientY - dragOrigin.current.pointerY))),
    });
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
  };

  const startResize = (e: React.PointerEvent<HTMLDivElement>, dirX: number, dirY: number) => {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeOrigin.current = {
      startW: frame.width,
      startH: frame.height,
      pointerX: e.clientX,
      pointerY: e.clientY,
      dirX,
      dirY,
    };
    setResizing(true);
  };

  const moveResize = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizing) return;
    const r = resizeOrigin.current;
    const dx = (e.clientX - r.pointerX) * r.dirX;
    const dy = (e.clientY - r.pointerY) * r.dirY;
    const lock = ratioRef.current;
    if (lock !== null && r.dirX !== 0) {
      const w = clampDim(r.startW + dx, MAX_FRAME_W);
      setFrame({ width: w, height: Math.round(w / lock) });
    } else if (lock !== null) {
      const h = clampDim(r.startH + dy, MAX_FRAME_H);
      setFrame({ width: Math.round(h * lock), height: h });
    } else {
      setFrame({
        width: clampDim(r.startW + dx, MAX_FRAME_W),
        height: clampDim(r.startH + dy, MAX_FRAME_H),
      });
    }
  };

  const endResize = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setResizing(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setZoom((prev) => clampZoom(prev - e.deltaY * 0.002));
  };

  const zoomTo = (next: number) => setZoom(clampZoom(next));
  const fillFrame = useCallback(() => setZoom(1), []);

  const fitImage = useCallback(() => {
    if (!coverScale) return;
    setZoom(clampZoom(containScale / coverScale));
    setOffset({ x: 0, y: 0 });
  }, [containScale, coverScale]);

  const handleApply = useCallback(async () => {
    const img = imgRef.current;
    if (!img || !natural.width) return;
    setProcessing(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = output.width;
      canvas.height = output.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (format === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const k = output.width / frame.width;
      const drawW = display.width * k;
      const drawH = display.height * k;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.save();
      ctx.translate(
        output.width / 2 + safeOffset.x * k,
        output.height / 2 + safeOffset.y * k
      );
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const blob = await new Promise<Blob | null>((resolve) =>
        format === "image/png"
          ? canvas.toBlob(resolve, "image/png")
          : canvas.toBlob(resolve, "image/jpeg", 0.92)
      );
      if (!blob) return;

      const base = fileName.replace(/\.[^.]+$/, "") || "image";
      const ext = format === "image/png" ? "png" : "jpg";
      onComplete(new File([blob], `${base}.${ext}`, { type: format }));
    } finally {
      setProcessing(false);
    }
  }, [
    natural.width,
    output,
    frame.width,
    display.width,
    display.height,
    safeOffset.x,
    safeOffset.y,
    rotation,
    flipH,
    flipV,
    format,
    fileName,
    onComplete,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (typing) return;

      if (e.key === "Enter") {
        if (target && target.tagName === "BUTTON") return;
        e.preventDefault();
        if (!processing) handleApply();
        return;
      }

      const dir = KEY_DIRS[e.key.toLowerCase()];
      if (dir) {
        e.preventDefault();
        nudge(dir, e.shiftKey ? nudgeStep * 4 : nudgeStep);
        return;
      }

      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((p) => clampZoom(p + 0.1));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom((p) => clampZoom(p - 0.1));
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nudge, nudgeStep, processing, handleApply, onCancel]);

  const ready = natural.width > 0;
  const slotMismatch = ratio !== null && Math.abs(ratio - aspectRatio) > 0.01;

  const nudgeButton = (dirName: keyof typeof NUDGE_DIRS, className: string) => {
    const Icon = NUDGE_ICONS[dirName];
    return (
      <button
        type="button"
        aria-label={`Move ${dirName}`}
        disabled={!ready}
        onPointerDown={() => startRepeat(NUDGE_DIRS[dirName])}
        onPointerUp={stopRepeat}
        onPointerCancel={stopRepeat}
        onPointerLeave={stopRepeat}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            nudge(NUDGE_DIRS[dirName]);
          }
        }}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:bg-primary/20 active:text-foreground disabled:opacity-40 touch-none select-none",
          className
        )}
      >
        <Icon className="size-4" />
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-3xl max-h-[92svh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h3 className="font-heading text-base font-semibold text-foreground">
              Adjust Image
            </h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{fileName}</p>
          </div>
          <button
            onClick={onCancel}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Ratio</span>
                {RATIO_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyRatio(preset.value)}
                    disabled={!ready}
                    className={cn(
                      "rounded-md px-2 py-1 font-medium transition-colors disabled:opacity-50",
                      ratio !== null && Math.abs(ratio - preset.value) < 0.001
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => applyRatio(null)}
                  disabled={!ready}
                  className={cn(
                    "rounded-md px-2 py-1 font-medium transition-colors disabled:opacity-50",
                    ratio === null
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  Free
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Nudge</span>
                {NUDGE_STEPS.map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setNudgeStep(step)}
                    disabled={!ready}
                    className={cn(
                      "rounded-md px-2 py-1 font-medium transition-colors disabled:opacity-50",
                      nudgeStep === step
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {step}px
                  </button>
                ))}
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Size</span>
                {OUTPUT_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setOutputSize(size)}
                    disabled={!ready}
                    className={cn(
                      "rounded-md px-2 py-1 font-medium transition-colors disabled:opacity-50",
                      outputSize === size
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Format</span>
                {(["image/png", "image/jpeg"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormat(value)}
                    disabled={!ready}
                    className={cn(
                      "rounded-md px-2 py-1 font-medium transition-colors disabled:opacity-50",
                      format === value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {value === "image/png" ? "PNG" : "JPG"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {nudgeButton("left", "")}
              <div className="flex flex-col items-center gap-2">
                {nudgeButton("up", "")}
                <div
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onWheel={handleWheel}
                  style={{ width: frame.width, height: frame.height }}
                  className={cn(
                    "relative shrink-0 touch-none overflow-hidden rounded-lg border-2 border-dashed border-primary/60 bg-neutral-900",
                    resizing ? "cursor-default" : dragging ? "cursor-grabbing" : "cursor-grab"
                  )}
                >
                  {src ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- local data URL, no optimization */
                    <img
                      ref={imgRef}
                      src={src}
                      alt=""
                      draggable={false}
                      onLoad={(e) => {
                        const el = e.currentTarget;
                        setNatural({ width: el.naturalWidth, height: el.naturalHeight });
                      }}
                      style={{
                        width: display.width,
                        height: display.height,
                        left: "50%",
                        top: "50%",
                        transform: `translate(calc(-50% + ${safeOffset.x}px), calc(-50% + ${safeOffset.y}px)) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                      }}
                      className="pointer-events-none absolute select-none"
                    />
                  ) : null}

                  {ready ? (
                    <div className="pointer-events-none absolute inset-0">
                      <div className="absolute inset-y-0 left-1/3 w-px bg-white/25" />
                      <div className="absolute inset-y-0 left-2/3 w-px bg-white/25" />
                      <div className="absolute inset-x-0 top-1/3 h-px bg-white/25" />
                      <div className="absolute inset-x-0 top-2/3 h-px bg-white/25" />
                    </div>
                  ) : null}

                  <Handle dirX={-1} dirY={-1} className="left-0 top-0 size-4 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize" onStart={startResize} onMove={moveResize} onEnd={endResize} />
                  <Handle dirX={1} dirY={-1} className="right-0 top-0 size-4 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize" onStart={startResize} onMove={moveResize} onEnd={endResize} />
                  <Handle dirX={-1} dirY={1} className="bottom-0 left-0 size-4 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize" onStart={startResize} onMove={moveResize} onEnd={endResize} />
                  <Handle dirX={1} dirY={1} className="bottom-0 right-0 size-4 translate-x-1/2 translate-y-1/2 cursor-nwse-resize" onStart={startResize} onMove={moveResize} onEnd={endResize} />
                  <Handle dirX={0} dirY={-1} className="left-1/2 top-0 h-5 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize" onStart={startResize} onMove={moveResize} onEnd={endResize} />
                  <Handle dirX={0} dirY={1} className="bottom-0 left-1/2 h-5 w-3 -translate-x-1/2 translate-y-1/2 cursor-ns-resize" onStart={startResize} onMove={moveResize} onEnd={endResize} />
                  <Handle dirX={-1} dirY={0} className="left-0 top-1/2 h-3 w-5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize" onStart={startResize} onMove={moveResize} onEnd={endResize} />
                  <Handle dirX={1} dirY={0} className="right-0 top-1/2 h-3 w-5 translate-x-1/2 -translate-y-1/2 cursor-ew-resize" onStart={startResize} onMove={moveResize} onEnd={endResize} />

                  {!ready ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="size-5 animate-spin text-white/60" />
                    </div>
                  ) : null}
                </div>
                {nudgeButton("down", "")}
              </div>
              {nudgeButton("right", "")}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
              <span className="rounded-md bg-muted px-2 py-1 font-medium">
                {ratio === null ? "Free" : formatRatio(ratio)}
              </span>
              <span>
                Output {output.width} &times; {output.height}px
              </span>
              <span className="tabular-nums">
                Frame {frame.width} &times; {frame.height}
              </span>
            </div>

            {slotMismatch ? (
              <p className="max-w-md text-center text-[11px] text-amber-600 dark:text-amber-400">
                This slot is designed for {formatRatio(aspectRatio)}. The page will crop
                anything outside that shape.
              </p>
            ) : null}

            <p className="text-center text-xs text-muted-foreground">
              Drag to reposition &middot; scroll to zoom &middot; arrow keys or buttons to
              nudge &middot; drag edges to resize the crop
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3">
              <ZoomOut className="size-4 shrink-0 text-muted-foreground" />
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                disabled={!ready}
                onChange={(e) => zoomTo(Number(e.target.value))}
                aria-label="Zoom"
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary disabled:opacity-50"
              />
              <ZoomIn className="size-4 shrink-0 text-muted-foreground" />
              <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={fitImage} disabled={!ready}>
                <ZoomOut className="size-4" />
                Fit
              </Button>
              <Button variant="outline" size="sm" onClick={fillFrame} disabled={!ready}>
                <ZoomIn className="size-4" />
                Fill
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                disabled={!ready}
              >
                <RotateCw className="size-4" />
                Rotate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFlipH((v) => !v)}
                disabled={!ready}
                aria-pressed={flipH}
              >
                <FlipHorizontal className="size-4" />
                Flip H
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFlipV((v) => !v)}
                disabled={!ready}
                aria-pressed={flipV}
              >
                <FlipVertical className="size-4" />
                Flip V
              </Button>
              <Button variant="outline" size="sm" onClick={reset} disabled={!ready}>
                <Maximize2 className="size-4" />
                Reset
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-4">
          <Button variant="outline" onClick={onCancel} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!ready || processing}>
            {processing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="size-4" />
                Apply
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
