const fs = require("fs");
const html = fs.readFileSync("F:\\Web_Opencode\\deuvix\\.next\\analyze\\client.html", "utf8");

// Extract all chunk entries with their modules
const chunkMatches = html.match(/\{"label":"[^"]*\.js","isAsset":true.*?"groups":\[.*?\]\}/g);
if (chunkMatches) {
  for (const match of chunkMatches) {
    try {
      const obj = JSON.parse(match);
      const name = obj.label;
      const size = obj.statSize;
      const gzipSize = obj.gzipSize;
      // Get top-level module groups
      const topGroups = (obj.groups || []).map(g => g.label).slice(0, 5);
      console.log(`${name} | ${Math.round(size/1024)}KB | ${Math.round(gzipSize/1024)}KB gzip | Top: ${topGroups.join(", ")}`);
    } catch(e) {}
  }
} else {
  console.log("No chunk matches found with that pattern");
  // Try a simpler pattern
  const simple = html.match(/\{"label":"[^"]+\.js","isAsset":true/g);
  if (simple) {
    console.log("Found", simple.length, "asset entries");
    simple.slice(0, 20).forEach(s => console.log(s));
  }
}
