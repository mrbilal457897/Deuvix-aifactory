const fs = require("fs");
const path = require("path");
const dir = "F:\\Web_Opencode\\deuvix\\src";
let allCss = "";
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(d, e.name));
    else if (e.name.endsWith(".css") || e.name.endsWith(".module.css")) {
      allCss += fs.readFileSync(path.join(d, e.name), "utf8") + "\n";
    }
  }
}
walk(dir);

const lines = allCss.split("\n");
let currentFamily = null;
let inRule = false;
const pairs = new Set();
for (const line of lines) {
  if (line.includes("{")) inRule = true;
  if (line.includes("}")) { inRule = false; currentFamily = null; continue; }
  if (!inRule) continue;
  const fMatch = line.match(/font-family:\s*var\(--font-(\w+)\)/);
  if (fMatch) currentFamily = fMatch[1];
  const wMatch = line.match(/font-weight:\s*(\d+)/);
  if (wMatch && currentFamily) {
    pairs.add(currentFamily + " → " + wMatch[1]);
  }
}
console.log("Font family → weight pairs used:");
for (const p of [...pairs].sort()) console.log(p);
