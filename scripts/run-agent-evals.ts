/**
 * Runs the admin-agent eval set against the configured model and exits non-zero
 * if any case fails.
 *
 *   npm run eval:agent            # all cases
 *   npm run eval:agent -- ur      # only Urdu cases (id substring or language)
 *
 * If the model server is unreachable the run is SKIPPED (exit 0) with a clear
 * message, so this is safe to wire into CI without a local Ollama.
 *
 * The eval modules are imported dynamically, AFTER loadEnvConfig(), because some
 * of them create a Supabase client at import time and would otherwise run before
 * .env.local is read.
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { CASES } = await import("@/lib/ai/evals/cases");
  const { runEvals } = await import("@/lib/ai/evals/run");

  const filter = process.argv[2];
  const target = filter ? CASES.filter((c) => c.id.includes(filter) || c.lang === filter) : CASES;
  console.log(
    `Running ${target.length}/${CASES.length} admin-agent evals${filter ? ` (filter: ${filter})` : ""}…\n`,
  );

  const summary = await runEvals({
    filter,
    onResult: (r) => {
      const line = `${r.pass ? "PASS" : "FAIL"}  ${r.id.padEnd(24)} [${r.toolNames.join(", ") || "no tools"}]`;
      console.log(r.pass ? line : `${line}\n      -> ${r.failures.join("; ")}`);
    },
  });

  if (!summary.reachable) {
    console.error("\nModel server unreachable — evals skipped. Start Ollama (or set LLM_BASE_URL) and retry.");
    process.exit(0);
  }

  console.log(`\n${summary.passed}/${summary.results.length} passed on ${summary.model ?? "unknown model"}`);
  process.exit(summary.failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
