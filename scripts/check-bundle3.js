const fs = require("fs");
const html = fs.readFileSync("F:\\Web_Opencode\\deuvix\\.next\\analyze\\client.html", "utf8");
const idx = html.indexOf("7838-2ac5a5832e9c3977.js");
if (idx >= 0) {
  console.log("=== Around chunk 7838 ===");
  console.log(html.slice(Math.max(0, idx - 500), idx + 2000));
} else {
  console.log("Chunk 7838 not found in client.html");
  // List all chunk names
  const chunks = html.match(/"([^"]*\.js)"[^}]*"statSize":/g);
  if (chunks) {
    const unique = [...new Set(chunks)];
    console.log("Unique chunks:", unique.length);
    unique.slice(0, 20).forEach(c => console.log("  " + c));
  }
}
