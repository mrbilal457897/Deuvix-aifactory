import gsap from "gsap";

const letters = (svg: SVGSVGElement) =>
  gsap.utils.toArray<SVGGElement>(svg.querySelectorAll("[data-letter]"));

const prep = (svg: SVGSVGElement) =>
  gsap.set(letters(svg), { transformBox: "fill-box", transformOrigin: "50% 100%" });

/** INTRO (the approved "Replay intro" style): D mark pops in with a small rotation,
 *  e-u-v-i rise one by one, the x spins in with a back-ease. Returns the timeline. */
export function logoIntro(svg: SVGSVGElement) {
  gsap.killTweensOf(letters(svg));
  gsap.set(svg, { autoAlpha: 1 });
  gsap.set(letters(svg), { clearProps: "all" });
  prep(svg);
  const [d, ...rest] = letters(svg);
  const x = rest[rest.length - 1];
  const mid = rest.slice(0, -1);
  return gsap
    .timeline({ defaults: { ease: "power3.out" } })
    .from(d, { scale: 0.4, rotate: -18, autoAlpha: 0, transformOrigin: "50% 50%", duration: 0.8 })
    .from(mid, { yPercent: 70, autoAlpha: 0, scaleY: 0.6, stagger: 0.09, duration: 0.7 }, 0.25)
    .from(x, { scale: 0.2, rotate: 140, autoAlpha: 0, transformOrigin: "50% 50%", duration: 0.8, ease: "back.out(1.6)" }, 0.55);
}

/** HOVER WAVE: letters bounce in a quick ripple. */
export function logoWave(svg: SVGSVGElement) {
  prep(svg);
  return gsap.to(letters(svg), {
    yPercent: -14,
    duration: 0.25,
    stagger: { each: 0.05, yoyo: true, repeat: 1 },
    ease: "power2.out",
    overwrite: "auto",
  });
}

/** LOADER: calm breathing pulse while something loads. Call .kill() when done. */
export function logoLoader(svg: SVGSVGElement) {
  prep(svg);
  return gsap.to(letters(svg), {
    opacity: 0.25,
    duration: 0.6,
    stagger: { each: 0.12, yoyo: true, repeat: -1 },
    ease: "sine.inOut",
  });
}
