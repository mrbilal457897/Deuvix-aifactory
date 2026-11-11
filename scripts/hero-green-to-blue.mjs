import { readFileSync, writeFileSync } from "node:fs";
const f = "src/components/sections/hero.module.css";
let s = readFileSync(f, "utf8");
const jobs = [
  [".pillDot {\n  width: 8px;\n  height: 8px;\n  flex-shrink: 0;\n  background: var(--sec);",
   ".pillDot {\n  width: 8px;\n  height: 8px;\n  flex-shrink: 0;\n  background: var(--blue);", "pillDot"],
  [".tabDot {\n  width: 7px;\n  height: 7px;\n  border-radius: 0;\n  background: var(--mut);\n}\n.tabActive .tabDot {\n  background: var(--sec);\n}",
   ".tabDot {\n  width: 7px;\n  height: 7px;\n  border-radius: 0;\n  background: var(--blue);\n}\n.tabActive .tabDot {\n  background: var(--blue);\n}", "tabDot"],
  [".tabActive {\n  background: var(--fg);\n  color: var(--bg);\n  border-color: var(--fg);\n  box-shadow: inset 0 -3px 0 var(--sec);",
   ".tabActive {\n  background: var(--fg);\n  color: var(--bg);\n  border-color: var(--fg);\n  box-shadow: inset 0 -3px 0 var(--blue);", "tabActive underline"],
  [".tab:hover {\n  color: var(--fg);\n}",
   ".tab:not(.tabActive):hover {\n  color: var(--fg);\n}", "tab hover contrast"],
  ["border: 1px solid rgba(74, 222, 128, 0.4);\n  background: rgba(74, 222, 128, 0.1);\n  color: #4CAF7D;",
   "border: 1px solid rgba(46, 197, 255, 0.4);\n  background: rgba(46, 197, 255, 0.1);\n  color: #2EC5FF;", "outputChip"],
  [".outputChip::before {\n  content: \"\";\n  width: 6px;\n  height: 6px;\n  border-radius: 0;\n  background: #4CAF7D;\n}",
   ".outputChip::before {\n  content: \"\";\n  width: 6px;\n  height: 6px;\n  border-radius: 0;\n  background: #2EC5FF;\n}", "outputChip dot"],
  [".onlineDot {\n  width: 6px;\n  height: 6px;\n  border-radius: 50%;\n  background: #4CAF7D;\n  flex-shrink: 0;\n}",
   ".onlineDot {\n  width: 6px;\n  height: 6px;\n  border-radius: 50%;\n  background: #2EC5FF;\n  flex-shrink: 0;\n}", "onlineDot"],
  [".wheelCoreSub {\n  fill: #4CAF7D;",
   ".wheelCoreSub {\n  fill: #2EC5FF;", "wheelCoreSub"],
];
for (const [a, b, tag] of jobs) {
  const n = s.split(a).length - 1;
  if (!n) { console.log("MISS:", tag); continue; }
  s = s.split(a).join(b);
  console.log("ok:", tag);
}
writeFileSync(f, s);
