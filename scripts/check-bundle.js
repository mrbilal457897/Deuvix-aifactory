const fs = require("fs");
const html = fs.readFileSync("F:\\Web_Opencode\\deuvix\\.next\\analyze\\client.html", "utf8");
const libs = ["sentry","gsap","framer","ai-sdk","next-auth","lucide","calcom","supabase","@supabase","@google/genai","base-ui"];
for (const lib of libs) {
  const re = new RegExp(lib, "gi");
  const matches = html.match(re);
  console.log(lib + ": " + (matches ? matches.length : 0) + " mentions");
}

// Find chunk names and sizes - look for chunk filenames
const chunkMatches = html.match(/[a-f0-9]{8,}-[a-f0-9]+\.js/g);
if (chunkMatches) {
  const unique = [...new Set(chunkMatches)];
  console.log("\nUnique chunks:", unique.length);
}
fs.writeFileSync("F:\\Web_Opencode\\deuvix\\.next\\analyze\\chunk-list.txt", JSON.stringify(chunkMatches ? [...new Set(chunkMatches)] : [], null, 2));
