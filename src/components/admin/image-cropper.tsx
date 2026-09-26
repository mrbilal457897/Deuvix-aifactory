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
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageCropperProps {
  src: string;
  fileName?: string;
  onComplete: (file: File) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

const MAX_FRAME_W = 520;
const MAX_FRAME_H = 400;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
const OUTPUT_SIZES = [512, 1024, 1600, 2048];
const DEFAULT_OUTPUT_SIZE = 1600;

const clampZoom = (value: number) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

function formatRatio(ratio: number): string {
  const known: Record<string, string> = {
    "1": "1:1",
    "1.7777777777777777": "16:9",
    "1.3333333333333333": "4:3",
    "1.5": "3:2",
    "0.75": "3:4",
  };
  return known[String(ratio)] ?? `${ratio.toFixed(2)}:1`;
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
  const [processing, setProcessing] = useState(false);
  const dragOrigin = useRef({ pointerX: 0, pointerY: 0, offsetX: 0, offsetY: 0 });

  // Display size of the crop window, capped to fit the modal.
  const frame = useMemo(() => {
    let w = MAX_FRAME_W;
    let h = w / aspectRatio;
    if (h > MAX_FRAME_H) {
      h = MAX_FRAME_H;
      w = h * aspectRatio;
    }
    return { width: Math.round(w), height: Math.round(h) };
  }, [aspectRatio]);

  // Output resolution, derived from the aspect ratio and the chosen long edge.
  const output = useMemo(() => {
    if (aspectRatio >= 1) {
      return { width: outputSize, height: Math.round(outputSize / aspectRatio) };
    }
    return { width: Math.round(outputSize * aspectRatio), height: outputSize };
  }, [aspectRatio, outputSize]);

  // Dimensions of the image after rotation is applied.
  const rotated = useMemo(() => {
    const swapped = rotation % 180 !== 0;
    return {
      width: swapped ? natural.height : natural.width,
      height: swapped ? natural.width : natural.height,
    };
  }, [natural, rotation]);

  // "cover" fit: smallest zoom at which the image fully covers the frame.
  const coverScale = useMemo(() => {
    if (!rotated.width || !rotated.height) return 1;
    return Math.max(frame.width / rotated.width, frame.height / rotated.height);
  }, [rotated, frame]);

  // "contain" fit: largest zoom at which the image still fits inside the
  // frame. Zooming below `cover` shrinks the image below the frame edge.
  const containScale = useMemo(() => {
    if (!rotated.width || !rotated.height) return 1;
    return Math.min(frame.width / rotated.width, frame.height / rotated.height);
  }, [rotated, frame]);

  // Zoom 1 always means "cover". Going below 1 shrinks, above 1 crops.
  const scale = useMemo(() => coverScale * zoom, [coverScale, zoom]);

  const display = useMemo(() => {
    // The element box always uses the natural orientation; the rotation is
    // applied on top of it, so `rotated` only decides the frame footprint.
    const w = natural.width * scale;
    const h = natural.height * scale;
    // How far the image may travel before an edge enters the frame.
    const limitX = Math.max(0, (rotated.width * scale - frame.width) / 2);
    const limitY = Math.max(0, (rotated.height * scale - frame.height) / 2);
    return { width: w, height: h, limitX, limitY };
  }, [natural, scale, rotated, frame]);

  const clamp = useCallback(
    (next: { x: number; y: number }) => ({
      x: Math.min(display.limitX, Math.max(-display.limitX, next.x)),
      y: Math.min(display.limitY, Math.max(-display.limitY, next.y)),
    }),
    [display.limitX, display.limitY]
  );

  // Derived during render so zoom/rotation changes clamp the offset for free,
  // instead of pushing it back through state in an effect.
  const safeOffset = clamp(offset);

  const reset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragOrigin.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setOffset(
      clamp({
        x: dragOrigin.current.offsetX + (e.clientX - dragOrigin.current.pointerX),
        y: dragOrigin.current.offsetY + (e.clientY - dragOrigin.current.pointerY),
      })
    );
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setZoom((prev) => clampZoom(prev - e.deltaY * 0.002));
  };

  const zoomTo = (next: number) => setZoom(clampZoom(next));

  // Fill the frame edge to edge.
  const fillFrame = useCallback(() => setZoom(1), []);

  // Shrink the whole image inside the frame without cropping.
  const fitImage = useCallback(() => {
    if (!coverScale) return;
    setZoom(clampZoom(containScale / coverScale));
    setOffset({ x: 0, y: 0 });
  }, [containScale, coverScale]);

  const handleApply = async () => {
    const img = imgRef.current;
    if (!img || !natural.width) return;
    setProcessing(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = output.width;
      canvas.height = output.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Transparent PNG logos would otherwise turn black once encoded as JPEG.
      if (format === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Ratio between the on-screen frame and the exported image.
      const k = output.width / frame.width;
      const drawW = display.width * k;
      const drawH = display.height * k;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.save();
      ctx.translate(output.width / 2 + safeOffset.x * k, output.height / 2 + safeOffset.y * k);
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
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 20 : 6;
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter" && !processing) handleApply();
      if (e.key === "ArrowLeft") setOffset((p) => clamp({ ...p, x: p.x - step }));
      if (e.key === "ArrowRight") setOffset((p) => clamp({ ...p, x: p.x + step }));
      if (e.key === "ArrowUp") setOffset((p) => clamp({ ...p, y: p.y - step }));
      if (e.key === "ArrowDown") setOffset((p) => clamp({ ...p, y: p.y + step }));
      if (e.key === "+" || e.key === "=") setZoom((p) => clampZoom(p + 0.1));
      if (e.key === "-") setZoom((p) => clampZoom(p - 0.1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const ready = natural.width > 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-2xl max-h-[92svh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
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
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
              <span className="rounded-md bg-muted px-2 py-1 font-medium">
                {formatRatio(aspectRatio)}
              </span>
              <span>
                Output {output.width} &times; {output.height}px
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Size</span>
                {OUTPUT_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setOutputSize(size)}
                    disabled={!ready}
                    className={`rounded-md px-2 py-1 font-medium transition-colors disabled:opacity-50 ${
                      outputSize === size
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
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
                    className={`rounded-md px-2 py-1 font-medium transition-colors disabled:opacity-50 ${
                      format === value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {value === "image/png" ? "PNG" : "JPG"}
                  </button>
                ))}
              </div>
            </div>

            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onWheel={handleWheel}
              style={{ width: frame.width, height: frame.height }}
              className={`relative shrink-0 touch-none overflow-hidden rounded-lg border-2 border-dashed border-primary/60 bg-neutral-900 ${
                dragging ? "cursor-grabbing" : "cursor-grab"
              }`}
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

              {/* Rule-of-thirds guides */}
              {ready ? (
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-y-0 left-1/3 w-px bg-white/25" />
                  <div className="absolute inset-y-0 left-2/3 w-px bg-white/25" />
                  <div className="absolute inset-x-0 top-1/3 h-px bg-white/25" />
                  <div className="absolute inset-x-0 top-2/3 h-px bg-white/25" />
                </div>
              ) : null}

              {!ready ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="size-5 animate-spin text-white/60" />
                </div>
              ) : null}
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Drag to reposition &middot; scroll to zoom
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
              <Button
                variant="outline"
                size="sm"
                onClick={fitImage}
                disabled={!ready}
              >
                <ZoomOut className="size-4" />
                Fit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fillFrame}
                disabled={!ready}
              >
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
