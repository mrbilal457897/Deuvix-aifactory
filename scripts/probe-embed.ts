import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { GoogleGenAI } from "@google/genai";

async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });
  const models = [
    process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
    "text-embedding-004",
  ];
  for (const model of models) {
    try {
      const r = await ai.models.embedContent({
        model,
        contents: "hello world",
        config: { outputDimensionality: 768 },
      });
      console.log(`${model}: OK dims=${r.embeddings?.[0]?.values?.length ?? 0}`);
    } catch (e: unknown) {
      const err = e as { message?: string; status?: string };
      const msg = err.message ?? String(e);
      const metric = /Quota exceeded for metric: ([^,]+)/.exec(msg);
      const retry = /Please retry in ([\dhms.]+)/.exec(msg);
      console.log(
        `${model}: FAIL status=${err.status ?? "?"} metric=${metric?.[1] ?? "?"}` +
          (retry ? ` retry_in=${retry[1]}` : ""),
      );
    }
  }
}

void main();
