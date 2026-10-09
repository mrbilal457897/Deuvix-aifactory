/**
 * Probe: does the free-tier embedding quota count per *request* or per *content*?
 *
 * Sends N batches of M contents each through the multi-content embedContent call
 * and reports how many succeed before a 429. If far more than the remaining daily
 * budget of single calls go through, batching is billed per request and the whole
 * crawl fits in one day.
 *
 *   npx tsx scripts/probe-batch.ts
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { GoogleGenAI } from "@google/genai";
import { chatConfig } from "../src/lib/chat/config";

const BATCH = 25;
const ROUNDS = 12;

const sample =
  "Agent Factory helps teams build and operate AI workers. ".repeat(12).slice(0, 600);

async function main() {
  const ai = new GoogleGenAI({ apiKey: chatConfig.apiKey });
  let contents = 0;
  let requests = 0;

  for (let round = 0; round < ROUNDS; round += 1) {
    try {
      const res = await ai.models.embedContent({
        model: chatConfig.embeddingModel,
        contents: Array.from({ length: BATCH }, () => sample),
        config: { outputDimensionality: 768 },
      });
      const got = res.embeddings?.length ?? 0;
      contents += got;
      requests += 1;
      console.log(`batch ${round + 1}: ok — ${got} embeddings (total ${contents} contents in ${requests} requests)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`batch ${round + 1}: FAILED after ${contents} contents in ${requests} requests`);
      console.log(msg.slice(0, 400));
      break;
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
