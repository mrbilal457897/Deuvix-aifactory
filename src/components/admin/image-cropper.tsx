"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { X, RotateCcw, Check, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageCropperProps {
  src: string;
  onComplete: (croppedDataUrl: string) => void;
  onCancel: () => void;
  aspectRatio?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export default function ImageCropper({
  src,
  onComplete,
  onCancel,
  aspectRatio = 1,
  maxWidth = 1200,
  maxHeight = 1200,
}: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgNaturalSize, setImgNaturalSize] = useState({ width: 0, height: 0 });

  const drawImage = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width: imgW, height: imgH } = imgNaturalSize;
    const cropW = canvas.width;
    const cropH = canvas.height;

    const scaledW = imgW * scale;
    const scaledH = imgH * scale;

    ctx.clearRect(0, 0, cropW, cropH);
    ctx.save();
    ctx.translate(cropW / 2, cropH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(
      img,
      -scaledW / 2 + position.x,
      -scaledH / 2 + position.y,
      scaledW,
      scaledH
    );
    ctx.restore();
  }, [scale, position, rotation, imgLoaded, imgNaturalSize]);

  useEffect(() => {
    drawImage();
  }, [drawImage]);

  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;

    const { width, height } = img;
    setImgNaturalSize({ width, height });

    const canvas = canvasRef.current;
    if (!canvas) return;

    let canvasW, canvasH;
    if (width / height > aspectRatio) {
      canvasH = Math.min(height, maxHeight);
      canvasW = canvasH * aspectRatio;
    } else {
      canvasW = Math.min(width, maxWidth);
      canvasH = canvasW / aspectRatio;
    }

    canvas.width = canvasW;
    canvas.height = canvasH;

    const scaleX = canvasW / width;
    const scaleY = canvasH / height;
    setScale(Math.min(scaleX, scaleY));
    setPosition({ x: 0, y: 0 });
    setImgLoaded(true);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.min(Math.max(prev * zoomFactor, 0.1), 5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    const { width, height } = imgNaturalSize;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let canvasW, canvasH;
    if (width / height > aspectRatio) {
      canvasH = Math.min(height, maxHeight);
      canvasW = canvasH * aspectRatio;
    } else {
      canvasW = Math.min(width, maxWidth);
      canvasH = canvasW / aspectRatio;
    }

    canvas.width = canvasW;
    canvas.height = canvasH;

    const scaleX = canvasW / width;
    const scaleY = canvasH / height;
    setScale(Math.min(scaleX, scaleY));
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    onComplete(dataUrl);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 1;
    switch (e.key) {
      case "ArrowLeft":
        setPosition((p) => ({ ...p, x: p.x - step }));
        break;
      case "ArrowRight":
        setPosition((p) => ({ ...p, x: p.x + step }));
        break;
      case "ArrowUp":
        setPosition((p) => ({ ...p, y: p.y - step }));
        break;
      case "ArrowDown":
        setPosition((p) => ({ ...p, y: p.y + step }));
        break;
      case "Escape":
        onCancel();
        break;
      case "Enter":
        handleApply();
        break;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      autoFocus
    >
      <div className="relative w-full max-w-4xl max-h-[90svh] bg-card border border-border rounded-xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-4">
            <h3 className="font-heading font-semibold text-lg">Crop & Adjust Image</h3>
            <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted">
              Aspect Ratio: {aspectRatio === 1 ? "1:1" : aspectRatio === 16/9 ? "16:9" : aspectRatio === 4/3 ? "4:3" : aspectRatio.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleRotate} title="Rotate (R)">
              <RotateCcw className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleReset} title="Reset">
              <Maximize2 className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onCancel} title="Cancel">
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 flex items-center justify-center bg-muted/50 min-h-[300px] max-h-[60svh] overflow-auto">
          <div className="relative" style={{ touchAction: "none" }}>
            <canvas
              ref={canvasRef}
              className="shadow-xl bg-white dark:bg-black"
              style={{ cursor: isDragging ? "grabbing" : "grab" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onWheel={handleWheel}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                if (touch) {
                  const mouseEvent = new MouseEvent("mousedown", {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                  });
                  canvasRef.current?.dispatchEvent(mouseEvent);
                }
              }}
              onTouchMove={(e) => {
                const touch = e.touches[0];
                if (touch) {
                  const mouseEvent = new MouseEvent("mousemove", {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                  });
                  canvasRef.current?.dispatchEvent(mouseEvent);
                }
              }}
              onTouchEnd={() => {
                const mouseEvent = new MouseEvent("mouseup", {});
                canvasRef.current?.dispatchEvent(mouseEvent);
              }}
            />
            <img ref={imgRef} src={src} alt="" style={{ display: "none" }} onLoad={handleImgLoad} />
          </div>
        </div>

        <div className="p-4 border-t border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <kbd className="px-1.5 py-0.5 bg-background border border-border rounded">Scroll</kbd> Zoom
            <span className="mx-1">|</span>
            <kbd className="px-1.5 py-0.5 bg-background border border-border rounded">Drag</kbd> Move
            <span className="mx-1">|</span>
            <kbd className="px-1.5 py-0.5 bg-background border border-border rounded">R</kbd> Rotate
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleApply}>
              <Check className="size-4 mr-2" />
              Apply & Upload
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}