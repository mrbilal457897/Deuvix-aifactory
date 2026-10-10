import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export interface SkillMeta {
  name: string;
  description: string;
  whenToUse?: string;
}

export interface Skill extends SkillMeta {
  content: string;
}

/**
 * Skills are plain folders under this directory, each with a `SKILL.md`.
 *
 * Only the frontmatter index (name/description/when_to_use) is injected into the
 * system prompt up front. The full body is loaded on demand through the
 * `load_skill` tool, so a large skill costs nothing until it is actually used.
 *
 * Reading files at runtime mirrors the existing `data/*.md` pattern used by the
 * public chat (see src/lib/chat/systemPrompt.ts).
 */
const SKILLS_DIR = path.join(process.cwd(), "src", "lib", "ai", "skills");

interface Frontmatter {
  data: Record<string, string>;
  body: string;
}

/** Minimal YAML-ish frontmatter: `key: value` lines between `---` fences. */
function parseFrontmatter(raw: string): Frontmatter {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw.trim() };

  const data: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line
      .slice(idx + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key) data[key] = value;
  }
  return { data, body: match[2].trim() };
}

function loadAll(): Skill[] {
  let entries: string[];
  try {
    entries = readdirSync(SKILLS_DIR);
  } catch {
    // Folder absent (e.g. trimmed standalone build): the agent still works,
    // just without skills.
    return [];
  }

  const skills: Skill[] = [];
  for (const entry of entries.sort()) {
    if (entry.startsWith(".")) continue;
    const dir = path.join(SKILLS_DIR, entry);
    try {
      if (!statSync(dir).isDirectory()) continue;
      const raw = readFileSync(path.join(dir, "SKILL.md"), "utf8");
      const { data, body } = parseFrontmatter(raw);
      skills.push({
        name: data.name || entry,
        description: data.description || "",
        whenToUse: data.when_to_use || undefined,
        content: body,
      });
    } catch {
      // A malformed skill must not take down the agent.
    }
  }
  return skills;
}

let cache: Skill[] | null = null;

function all(): Skill[] {
  if (!cache) cache = loadAll();
  return cache;
}

/** Names + descriptions only — what the system prompt advertises. */
export function listSkills(): SkillMeta[] {
  return all().map(({ name, description, whenToUse }) => ({ name, description, whenToUse }));
}

/** Full content of one skill, or null when the name is unknown. */
export function loadSkill(name: string): Skill | null {
  const wanted = name.trim().toLowerCase();
  return all().find((s) => s.name.toLowerCase() === wanted) ?? null;
}

/** Compact index block for the system prompt. */
export function skillsIndexPrompt(): string {
  const skills = listSkills();
  if (skills.length === 0) return "";
  const lines = skills.map(
    (s) => `- ${s.name}: ${s.description}${s.whenToUse ? ` (use when: ${s.whenToUse})` : ""}`,
  );
  return ["<skills>", ...lines, "</skills>"].join("\n");
}

/** Test seam: drop the memoised skill list. */
export function resetSkills(): void {
  cache = null;
}
