const fs = require("fs");
const html = fs.readFileSync("F:\\Web_Opencode\\deuvix\\.next\\analyze\\client.html", "utf8");
const chunks = ["4bd1b696", "8064", "9509", "4729"];
for (const chunk of chunks) {
  const idx = html.indexOf(chunk);
  if (idx >= 0) {
    console.log("=== Around chunk " + chunk + " ===");
    console.log(html.slice(Math.max(0, idx - 200), idx + 1500));
    console.log("\n");
  }
}
