"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const initialClipPaths = [
  "polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%)",
  "polygon(33.33% 0%, 33.33% 0%, 33.33% 0%, 33.33% 0%)",
  "polygon(65.66% 0%, 66.66% 0%, 66.66% 0%, 66.66% 0%)",
  "polygon(0% 33.33%, 0% 33.33%, 0% 33.33%, 0% 33.33%)",
  "polygon(33.33% 33.33%, 33.33% 33.33%, 33.33% 33.33%, 33.33% 33.33%)",
  "polygon(65.66% 33.33%, 66.66% 33.33%, 66.66% 33.33%, 66.66% 33.33%)",
  "polygon(0% 66.66%, 0% 66.66%, 0% 66.66%, 0% 66.66%)",
  "polygon(33.33% 66.66%, 33.33% 66.66%, 33.33% 66.66%, 33.33% 66.66%)",
  "polygon(65.66% 66.66%, 66.66% 66.66%, 66.66% 66.66%, 66.66% 66.66%)",
];

const finalClipPaths = [
  "polygon(0% 0%, 34.33% 0%, 34.33% 34.33%, 0% 34.33%)",
  "polygon(32.33% 0%, 66.66% 0%, 66.66% 33.33%, 33.33% 34.33%)",
  "polygon(65.66% 0%, 100% 0%, 100% 33.33%, 65.66% 34.33%)",
  "polygon(0% 33.33%, 33.33% 33.33%, 33.33% 66.66%, 0% 66.66%)",
  "polygon(30.33% 33.33%, 66.66% 33.33%, 66.66% 66.66%, 33.33% 66.66%)",
  "polygon(65.66% 33.33%, 100% 32.33%, 100% 66.66%, 65.66% 66.66%)",
  "polygon(0% 65.66%, 33.33% 66.66%, 33.33% 100%, 0% 100%)",
  "polygon(30.33% 66.66%, 66.66% 65.66%, 66.66% 100%, 33.33% 100%)",
  "polygon(65.66% 66.66%, 100% 65.66%, 100% 100%, 65.66% 100%)",
];

interface GridRevealImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
}

export default function GridRevealImage({
  src,
  alt,
  className = "",
  sizes = "100vw",
}: GridRevealImageProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const wrapper = wrapperRef.current;

    const masks = wrapper.querySelectorAll<HTMLElement>(".grid-mask");
    if (!masks.length) return;

    gsap.set(masks, { clipPath: (i: number) => initialClipPaths[i] });

    const order = [
      [".grid-mask-1"],
      [".grid-mask-2", ".grid-mask-4"],
      [".grid-mask-3", ".grid-mask-5", ".grid-mask-7"],
      [".grid-mask-6", ".grid-mask-8"],
      [".grid-mask-9"],
    ];

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapper,
        start: "top 90%",
        toggleActions: "restart none none reverse",
      },
    });

    order.forEach((targets, i) => {
      const validTargets = targets
        .map((c) => wrapper.querySelector(c))
        .filter((el) => el);

      if (validTargets.length) {
        tl.to(
          validTargets,
          {
            clipPath: (_j: number, el: HTMLElement) =>
              finalClipPaths[Array.from(masks).indexOf(el)],
            duration: 1,
            ease: "power4.out",
            stagger: 0.1,
          },
          i * 0.125
        );
      }
    });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <div ref={wrapperRef} className={`grid-reveal-anim ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className="grid-reveal-anim-img object-cover"
        sizes={sizes}
      />
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <div
          key={i}
          className={`grid-mask grid-mask-${i}`}
          style={{
            backgroundImage: `url(${src})`,
          }}
        />
      ))}
    </div>
  );
}
