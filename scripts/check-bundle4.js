const fs = require("fs");
const html = fs.readFileSync("F:\\Web_Opencode\\deuvix\\.next\\analyze\\client.html", "utf8");
const idx = html.indexOf("338.353b512b005f146a.js");
if (idx >= 0) {
  console.log(html.slice(Math.max(0, idx - 200), idx + 2000));
} else {
  console.log("Chunk not found directly");
}
