import { readFileSync, writeFileSync } from "node:fs";
const f = "src/app/(marketing)/about/about-client.tsx";
let s = readFileSync(f, "utf8");
const jobs = [
  ["import styles from \"./about.module.css\";",
   "import styles from \"./about.module.css\";\nimport { useSiteConfig } from \"@/hooks/use-site-config\";",
   "import useSiteConfig"],
  ["    src: \"/images/bilal.jpg\",", "    slot: \"team-bilal\",", "bilal slot"],
  ["    src: \"/images/asad.jpg\",", "    slot: \"team-asad\",", "asad slot"],
  ["export function AboutClient() {\n  const rootRef = useRef<HTMLElement>(null);",
   "export function AboutClient() {\n  const { img } = useSiteConfig();\n  const rootRef = useRef<HTMLElement>(null);",
   "img in component"],
  ["                      src={leader.src}", "                      src={img(leader.slot)}", "portrait src"],
  ["                    src=\"/images/about1.jpg\"", "                    src={img(\"about-main\")}", "story image"],
];
for (const [a, b, tag] of jobs) {
  const n = s.split(a).length - 1;
  if (!n) { console.log("MISS:", tag); continue; }
  s = s.split(a).join(b);
  console.log("ok (" + n + "):", tag);
}
writeFileSync(f, s);
