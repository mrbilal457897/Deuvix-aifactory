"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

function splitIntoCharSpans(
  children: React.ReactNode,
  baseClassName: string,
  counter: { value: number },
  inheritedClassName: string = ""
): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === "string") {
      return child.split("").map((char) => {
        const charIndex = counter.value++;
        const cls = [baseClassName, inheritedClassName].filter(Boolean).join(" ");
        return (
          <span
            key={`char-${charIndex}`}
            className={cls}
            style={{ "--char": charIndex } as React.CSSProperties}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        );
      });
    }
    const el = child as React.ReactElement<{ children?: React.ReactNode; className?: string }> | null;
    if (el && el.props && el.props.children) {
      const parentCls = el.props.className || "";
      return splitIntoCharSpans(el.props.children, baseClassName, counter, parentCls);
    }
    return child;
  });
}

export function TitleAnimUp({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const counter = { value: 0 };
  const content = splitIntoCharSpans(children, "ta-anim-char", counter);

  return (
    <span className={`title-anim-up-text ${className}`}>
      {content}
    </span>
  );
}

export function CharReveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const counter = { value: 0 };
  const content = splitIntoCharSpans(children, "cr-char", counter);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const chars = el.querySelectorAll<HTMLElement>(".cr-char");
    if (!chars.length) return;

    gsap.set(chars, { opacity: 0.3, x: -7 });

    const anim = gsap.to(chars, {
      x: 0,
      opacity: 1,
      stagger: 0.2,
      duration: 0.7,
      ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        start: "top 80%",
        end: "top 20%",
        scrub: 1,
      },
    });

    return () => {
      anim.scrollTrigger?.kill();
      anim.kill();
    };
  }, []);

  return (
    <span ref={ref} className={`char-reveal ${className}`}>
      {content}
    </span>
  );
}

export function BlurReveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const counter = { value: 0 };
  const content = splitIntoCharSpans(children, "blur-char", counter);

  useEffect(() => {
    const timeout = setTimeout(() => {
      document.querySelectorAll<HTMLElement>(".blur-char").forEach((char) => {
        char.classList.add("blur-active");
      });
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <span className={`blur-reveal ${className}`}>
      {content}
    </span>
  );
}
