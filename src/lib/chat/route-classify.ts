/**
 * Query routing (§2D).
 *
 * Deliberately costs ZERO extra Gemini calls: free-tier Flash-Lite quota is
 * ~500 requests/day, so spending one on classification would halve throughput.
 *
 *  1. Deterministic rules catch obvious cases.
 *  2. Anything ambiguous falls through to score-based routing — the query
 *     embedding is already needed for retrieval, so we search both namespaces
 *     and let the higher cosine score decide.
 *  3. A tie routes to "mixed", which retrieves both and labels them separately.
 */

export type QueryRoute = "deux" | "agentfactory" | "mixed" | "out_of_scope";

/** Words that only make sense as questions about the company. */
const DEUX_MARKERS = [
  "deux", "deux ai", "deuxai", "your company", "your team", "your services",
  "your pricing", "your price", "your process", "your office", "your hours",
  "who are you", "who r u", "who is deux", "about you", "about your",
  "do you offer", "do you provide", "do you build", "can you build",
  "your founders", "your case studies", "your portfolio", "your clients",
  "work with you", "hire you", "hire your", "contact you", "reach you",
  "book a call", "your team members", "bilal", "asad", "asadullah",
  "what does deux", "what services", "services does", "case stud",
  "ap kya", "ap ki company", "tumhari", "tumhara company", "deux kya",
];

/** Words that only make sense as build/technical guidance. */
const BUILD_MARKERS = [
  "how do i build", "how to build", "how can i build", "how would i build",
  "how do i make", "how to make", "how do i create", "how to create",
  "guide me", "step by step", "architecture", "workflow", "pipelines",
  "which tool", "what tool", "which framework", "what framework",
  "agent framework", "rag", "embedding", "vector", "llm", "prompt",
  "api key", "sdk", "deploy", "integrate", "integration", "database",
  "python", "typescript", "openai", "anthropic", "claude", "gemini",
  "langchain", "langgraph", "crewai", "autogen", "mcp", "skill.md",
  "agent factory", "panaversity", "the book", "crash course", "fde",
  "digital fte", "ai worker", "ai-native", "spec-driven", "loop engineering",
  "build an agent", "build ai", "build my", "make an agent", "make ai",
  "automation", "automate", "chatbot", "voice agent", "i want to build",
  "mera business", "business problem", "problem hai", "kaise banaun",
  "kaise banaye", "kya banaun",
];

const OUT_OF_SCOPE_MARKERS = [
  "football", "cricket score", "weather", "joke", "recipe", "cook",
  "movie", "song lyrics", "homework", "essay", "translate this paragraph",
];

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ");
}

function score(text: string, markers: string[]): number {
  let hits = 0;
  for (const m of markers) if (text.includes(m)) hits += 1;
  return hits;
}

/**
 * Cheap first pass. Returns null when the signal is too weak to act on,
 * which is the caller's cue to use score-based routing.
 */
export function classifyLocally(raw: string): QueryRoute | null {
  const text = normalise(raw);
  if (!text) return null;

  if (score(text, OUT_OF_SCOPE_MARKERS) > 0) return "out_of_scope";

  const deux = score(text, DEUX_MARKERS);
  const build = score(text, BUILD_MARKERS);

  if (deux > 0 && build === 0) return "deux";
  if (build > 0 && deux === 0) return "agentfactory";
  if (deux > 0 && build > 0) return "mixed";

  return null;
}

/**
 * Score-based fallback. `deuxTop` / `afTop` are the best cosine similarities
 * from each namespace (1 = identical, 0 = unrelated). A small margin is
 * required before we commit to a single source; otherwise we read it as mixed.
 */
export function routeByScores(deuxTop: number, afTop: number): QueryRoute {
  const MARGIN = 0.06;
  if (deuxTop <= 0 && afTop <= 0) return "mixed";
  if (deuxTop - afTop >= MARGIN) return "deux";
  if (afTop - deuxTop >= MARGIN) return "agentfactory";
  return "mixed";
}

/**
 * Decide which namespaces to search given a local classification.
 * Company questions search Source A only, per §2D.
 */
export function namespacesFor(route: QueryRoute): Array<"deux" | "agentfactory"> {
  switch (route) {
    case "deux":
      return ["deux"];
    case "agentfactory":
      return ["agentfactory"];
    default:
      return ["deux", "agentfactory"];
  }
}
