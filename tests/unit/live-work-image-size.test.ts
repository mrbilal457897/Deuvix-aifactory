import { describe, expect, it } from "vitest";
import { readImageSize } from "@/lib/live-work/image-size";

/** Minimal but structurally valid PNG: signature + IHDR length/type + dims. */
function png(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(33);
  [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].forEach((byte, index) => {
    buffer[index] = byte;
  });
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

/** SOI + APP0/JFIF + SOF0 with a single component. */
function jpeg(width: number, height: number): Buffer {
  const app0 = Buffer.alloc(18);
  app0.writeUInt16BE(0xffe0, 0);
  app0.writeUInt16BE(16, 2);
  app0.write("JFIF\0", 4, "ascii");

  const sof = Buffer.alloc(11);
  sof.writeUInt16BE(0xffc0, 0);
  sof.writeUInt16BE(11, 2);
  sof[4] = 8;
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  sof[9] = 1;
  sof[10] = 1;
  sof[11] = 0x11;
  sof[12] = 0;

  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof]);
}

/** Extended WebP (VP8X) — dimensions live in three little-endian bytes each. */
function webpExtended(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(30);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(22, 4);
  buffer.write("WEBP", 8, "ascii");
  buffer.write("VP8X", 12, "ascii");
  buffer.writeUInt32LE(10, 16);
  buffer.writeUIntLE(width - 1, 24, 3);
  buffer.writeUIntLE(height - 1, 27, 3);
  return buffer;
}

/** Lossy WebP (VP8) — dimensions follow the 9d 01 2a start code. */
function webpLossy(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(30);
  buffer.write("RIFF", 0, "ascii");
  buffer.write("WEBP", 8, "ascii");
  buffer.write("VP8 ", 12, "ascii");
  buffer[23] = 0x9d;
  buffer[24] = 0x01;
  buffer[25] = 0x2a;
  buffer.writeUInt16LE(width, 26);
  buffer.writeUInt16LE(height, 28);
  return buffer;
}

/** Lossless WebP (VP8L) — one packed 28-bit word holds both dimensions. */
function webpLossless(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(30);
  buffer.write("RIFF", 0, "ascii");
  buffer.write("WEBP", 8, "ascii");
  buffer.write("VP8L", 12, "ascii");
  buffer[20] = 0x2f;
  buffer.writeUInt32LE(((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14), 21);
  return buffer;
}

describe("readImageSize", () => {
  it("reads PNG dimensions", () => {
    expect(readImageSize(png(1600, 1000))).toEqual({ width: 1600, height: 1000 });
    expect(readImageSize(png(900, 1920))).toEqual({ width: 900, height: 1920 });
  });

  it("reads JPEG dimensions past an APP0 segment", () => {
    expect(readImageSize(jpeg(1600, 1000))).toEqual({ width: 1600, height: 1000 });
  });

  it("reads WebP dimensions in all three chunk flavours", () => {
    expect(readImageSize(webpExtended(800, 600))).toEqual({ width: 800, height: 600 });
    expect(readImageSize(webpLossy(800, 600))).toEqual({ width: 800, height: 600 });
    expect(readImageSize(webpLossless(800, 600))).toEqual({ width: 800, height: 600 });
  });

  it("returns null for garbage and truncated data", () => {
    expect(readImageSize(Buffer.from("not an image at all, really"))).toBeNull();
    expect(readImageSize(Buffer.alloc(4))).toBeNull();
  });

  it("returns null when the PNG signature does not match", () => {
    const corrupted = png(1600, 1000);
    corrupted[1] = 0x00;
    expect(readImageSize(corrupted)).toBeNull();
  });
});
