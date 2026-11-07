/**
 * Reads the pixel dimensions straight out of an image's header bytes.
 *
 * Done server-side on purpose: the uploaded file is the source of truth, so a
 * tampered client cannot claim a 1600×1000 screenshot that is really a 40×40
 * icon (which would cause layout shift once the real image loads).
 *
 * Supports the three formats the uploader accepts: PNG, JPEG and WebP.
 */
export interface ImageSize {
  width: number;
  height: number;
}

const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function readUInt16BE(buffer: Buffer, offset: number): number {
  return buffer.readUInt16BE(offset);
}

function pngSize(buffer: Buffer): ImageSize | null {
  if (buffer.length < 24) return null;
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < signature.length; i += 1) {
    if (buffer[i] !== signature[i]) return null;
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function jpegSize(buffer: Buffer): ImageSize | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];

    // Fill bytes: any number of 0xFF may precede the marker id.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    // Standalone markers carry no length payload.
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }

    const length = readUInt16BE(buffer, offset + 2);
    if (length < 2) return null;

    if (JPEG_SOF_MARKERS.has(marker)) {
      return { height: readUInt16BE(buffer, offset + 5), width: readUInt16BE(buffer, offset + 7) };
    }

    offset += 2 + length;
  }
  return null;
}

function webpSize(buffer: Buffer): ImageSize | null {
  if (buffer.length < 30) return null;
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }

  const chunk = buffer.toString("ascii", 12, 16);

  if (chunk === "VP8X") {
    const width = 1 + buffer.readUIntLE(24, 3);
    const height = 1 + buffer.readUIntLE(27, 3);
    return { width, height };
  }

  if (chunk === "VP8L") {
    if (buffer[20] !== 0x2f) return null;
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }

  if (chunk === "VP8 ") {
    // Lossy bitstream: 3-byte frame tag, then the 3-byte start code 9d 01 2a.
    if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) return null;
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  return null;
}

/** Returns null when the format is unrecognised or the header is truncated. */
export function readImageSize(buffer: Buffer): ImageSize | null {
  return pngSize(buffer) ?? jpegSize(buffer) ?? webpSize(buffer);
}
