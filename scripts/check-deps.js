const fs = require("fs");
const path = require("path");
const dir = "F:\\Web_Opencode\\deuvix\\src";
let allCode = "";
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(d, e.name));
    else if (e.name.endsWith(".ts") || e.name.endsWith(".tsx")) {
      allCode += fs.readFileSync(path.join(d, e.name), "utf8") + "\n";
    }
  }
}
walk(dir);

// Check for shadcn imports
const shadcnMatches = allCode.match(/from ["']shadcn["']/g) || [];
console.log("shadcn imports:", shadcnMatches.length);

// Check for @sentry imports
const sentryMatches = allCode.match(/@sentry\//g);
console.log("@sentry imports:", sentryMatches ? sentryMatches.length : 0);

// Check for framer-motion imports
const framerMatches = allCode.match(/framer-motion/g);
console.log("framer-motion imports:", framerMatches ? framerMatches.length : 0);

// Check for gsap imports
const gsapMatches = allCode.match(/gsap/g);
console.log("gsap references:", gsapMatches ? gsapMatches.length : 0);

// Check for @calcom/embed-react
const calMatches = allCode.match(/@calcom\/embed-react/g);
console.log("@calcom/embed-react imports:", calMatches ? calMatches.length : 0);

// Check for "use client" count
const useClientMatches = allCode.match(/"use client"/g);
console.log('"use client" count:', useClientMatches ? useClientMatches.length : 0);

// List files with "use client"
const walk2 = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) walk2(path.join(d, e.name));
    else if (e.name.endsWith(".ts") || e.name.endsWith(".tsx")) {
      const content = fs.readFileSync(path.join(d, e.name), "utf8");
      if (content.includes('"use client"')) {
        console.log("  " + path.join(d, e.name).replace("F:\\Web_Opencode\\deuvix\\src\\", ""));
      }
    }
  }
}
console.log("\nFiles with 'use client':");
walk2(dir);
