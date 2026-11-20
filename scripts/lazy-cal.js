const fs = require("fs");
const p = "F:\\Web_Opencode\\deuvix\\src\\lib/cal/embed.ts";
let content = fs.readFileSync(p, "utf8");

// 1. Replace the static import with dynamic import logic
content = content.replace(
  `import { getCalApi } from "@calcom/embed-react";`,
  `let getCalApi: any;\nasync function getCalApiInstance() {\n  if (!getCalApi) {\n    const mod = await import("@calcom/embed-react");\n    getCalApi = mod.getCalApi;\n  }\n  return getCalApi;\n}`
);

// 2. Replace the getCalInstance function body to use dynamic import
content = content.replace(
  `let apiPromise: Promise<CalApi | null> | null = null;\n\nexport async function getCalInstance(): Promise<CalApi | null> {\n  if (apiPromise) return apiPromise;\n\n  apiPromise = (async () => {\n    if (!isCalConfigured()) {\n      console.warn("[cal] NEXT_PUBLIC_CAL_ORIGIN / NEXT_PUBLIC_CAL_LINK are not set");\n      return null;\n    }\n    try {\n      const api = (await getCalApi({ namespace: NAMESPACE })) as unknown as CalApi;\n      api("init", { calOrigin: getCalOrigin() });\n      api("ui", themeInstruction(readDomTheme()));\n      return api;\n    } catch (err) {\n      console.error("[cal] failed to initialise embed:", err instanceof Error ? err.message : err);\n      return null;\n    }\n  })();\n\n  return apiPromise;\n}`,
  `export async function getCalInstance(): Promise<CalApi | null> {\n  if (!isCalConfigured()) {\n    console.warn("[cal] NEXT_PUBLIC_CAL_ORIGIN / NEXT_PUBLIC_CAL_LINK are not set");\n    return null;\n  }\n  try {\n    const api = (await getCalApiInstance()({ namespace: NAMESPACE })) as unknown as CalApi;\n    api("init", { calOrigin: getCalOrigin() });\n    api("ui", themeInstruction(readDomTheme()));\n    return api;\n  } catch (err) {\n    console.error("[cal] failed to initialise embed:", err instanceof Error ? err.message : err);\n    return null;\n  }\n}`
);

fs.writeFileSync(p, content);
console.log("Done");
