import fs from "node:fs";

const res = await fetch(process.argv[2] ?? "http://localhost:3000/");
const html = await res.text();
console.log("status", res.status, "bytes", html.length);
const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
console.log("scripts", srcs.length);
for (const s of srcs) console.log("  ", s);
const css = [...html.matchAll(/<link[^>]+href="([^"]+\.css[^"]*)"/g)].map((m) => m[1]);
console.log("css", css);
console.log("has js-sub:", html.includes("js-sub"));
const i = html.indexOf("js-sub");
console.log("hero_sub ctx:", i >= 0 ? html.slice(Math.max(0, i - 120), i + 220).replace(/\s+/g, " ") : "NOT FOUND");
const lcp = html.indexOf('class="hero_sub');
console.log("hero_sub class ctx:", lcp >= 0 ? html.slice(lcp - 80, lcp + 120) : "n/a");
