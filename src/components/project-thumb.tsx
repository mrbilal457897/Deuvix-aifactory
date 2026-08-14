import Image from "next/image";

export function thumbSrc(src?: string): string {
  if (!src) return "";
  if (/^https?:\/\//i.test(src)) {
    return `/api/proxy-image?url=${encodeURIComponent(src)}`;
  }
  return src;
}

export function projectPreviewUrl(url?: string, image?: string): string | null {
  if (url && /^https?:\/\//i.test(url)) return url;
  if (image) {
    const stripped = image.replace(
      /^https?:\/\/image\.thum\.io\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/[^/]+\//i,
      ""
    );
    if (/^https?:\/\//i.test(stripped)) return stripped;
    const inner = image.match(/^https?:\/\/image\.thum\.io\/.*?(https?:\/\/[^/]+.*)$/i);
    if (inner && /^https?:\/\//i.test(inner[1])) return inner[1];
  }
  return null;
}

interface ThumbImageProps {
  src?: string;
  alt: string;
  className?: string;
  sizes?: string;
  width?: number;
  height?: number;
  fill?: boolean;
}

export function ThumbImage({
  src,
  alt,
  className,
  sizes,
  width,
  height,
  fill = true,
}: ThumbImageProps) {
  if (!src) return null;
  return (
    <Image
      src={thumbSrc(src)}
      alt={alt}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={className}
      sizes={sizes}
      unoptimized
    />
  );
}
