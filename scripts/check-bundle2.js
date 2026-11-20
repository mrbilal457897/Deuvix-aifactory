const fs = require("fs");
const html = fs.readFileSync("F:\\Web_Opencode\\deuvix\\.next\\analyze\\client.html", "utf8");

// Search for chunk 8402 (the big 432KB one) - find what modules are in it
const idx = html.indexOf("8402-c61c23e9df52267e.js");
if (idx >= 0) {
  console.log("=== Around chunk 8402 ===");
  console.log(html.slice(Math.max(0, idx - 500), idx + 2000));
}
