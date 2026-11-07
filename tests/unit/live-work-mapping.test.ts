import { describe, expect, it } from "vitest";
import { normalizeStatus, rowToProject, toPublicProject } from "@/lib/live-work/mapping";

const desktop = { url: "https://cdn.example.com/d.png", path: "projects/d.png", width: 1600, height: 1000, alt: "Desk" };
const mobile = { url: "https://cdn.example.com/m.png", path: "projects/m.png", width: 900, height: 1920, alt: "Phone" };

function legacyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "1",
    title: "Voice Support Agent",
    description: "Answers calls and books work.",
    category: "AI",
    status: "Active",
    image: "https://cdn.example.com/old.png",
    url: "https://voice.example.com",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("rowToProject — legacy rows (before the migration)", () => {
  it("keeps the old title as both name and title", () => {
    const project = rowToProject(legacyRow());
    expect(project.name).toBe("Voice Support Agent");
    expect(project.title).toBe("Voice Support Agent");
    expect(project.category).toBe("AI");
  });

  it("generates a slug from the name when the column is empty", () => {
    expect(rowToProject(legacyRow()).slug).toBe("voice-support-agent");
  });

  it("maps the old url to liveUrl", () => {
    expect(rowToProject(legacyRow()).liveUrl).toBe("https://voice.example.com");
  });

  it("stays a draft when it has no mobile screenshot", () => {
    const project = rowToProject(legacyRow({ desktop_thumbnail: desktop }));
    expect(project.status).toBe("draft");
    expect(project.desktopThumbnail).toEqual(desktop);
    expect(project.mobileThumbnail).toBeNull();
  });

  it("defaults order to 0 and featured to false", () => {
    const project = rowToProject(legacyRow());
    expect(project.order).toBe(0);
    expect(project.featured).toBe(false);
  });

  it("falls back to 'Untitled project' when there is no name at all", () => {
    const project = rowToProject({ id: "9", title: "", name: "" });
    expect(project.name).toBe("Untitled project");
  });
});

describe("rowToProject — migrated rows", () => {
  const completeRow = {
    id: "42",
    name: "Ops Loop Agent",
    slug: "ops-loop-agent",
    unit_id: "FTE-011",
    description: "Watches the queue and closes the loop.",
    status: "published",
    featured: true,
    sort_order: 3,
    stats: [
      { value: "24/7", label: "Uptime" },
      { value: "40%", label: "Fewer tickets" },
      { value: "12min", label: "To resolve" },
    ],
    tags: ["Ops", "Agents"],
    desktop_thumbnail: desktop,
    mobile_thumbnail: mobile,
    live_url: "https://ops.example.com",
    case_study_url: "/projects/ops-loop-agent",
    browser_url_label: "ops.example.com",
    chip_title: "Queue cleared",
    chip_subtitle: "FTE-011 · just now",
    content: "## What we shipped",
    gallery: [desktop, mobile],
    previous_slugs: ["ops-agent"],
    created_at: "2026-02-01T00:00:00.000Z",
    updated_at: "2026-02-03T00:00:00.000Z",
  };

  it("reads every new field", () => {
    const project = rowToProject(completeRow);
    expect(project.slug).toBe("ops-loop-agent");
    expect(project.unitId).toBe("FTE-011");
    expect(project.stats).toHaveLength(3);
    expect(project.tags).toEqual(["Ops", "Agents"]);
    expect(project.featured).toBe(true);
    expect(project.order).toBe(3);
    expect(project.browserUrlLabel).toBe("ops.example.com");
    expect(project.previousSlugs).toEqual(["ops-agent"]);
    expect(project.gallery).toHaveLength(2);
  });

  it("keeps an explicit published status", () => {
    expect(rowToProject(completeRow).status).toBe("published");
  });

  it("drops empty stats entries and caps them at three", () => {
    const project = rowToProject({
      ...completeRow,
      stats: [
        { value: "24/7", label: "Uptime" },
        { value: "", label: "Broken" },
        { value: "a", label: "b" },
        { value: "c", label: "d" },
      ],
    });
    expect(project.stats).toEqual([
      { value: "24/7", label: "Uptime" },
      { value: "a", label: "b" },
      { value: "c", label: "d" },
    ]);
  });

  it("treats a null thumbnail jsonb as no image", () => {
    const project = rowToProject({ ...completeRow, mobile_thumbnail: null });
    expect(project.mobileThumbnail).toBeNull();
    expect(project.status).toBe("draft");
  });
});

describe("normalizeStatus", () => {
  it("passes through the two canonical values", () => {
    expect(normalizeStatus("published", false)).toBe("published");
    expect(normalizeStatus("draft", true)).toBe("draft");
  });

  it("maps legacy lifecycle labels by completeness", () => {
    expect(normalizeStatus("Active", true)).toBe("published");
    expect(normalizeStatus("Active", false)).toBe("draft");
    expect(normalizeStatus("Planning", true)).toBe("published");
    expect(normalizeStatus("Paused", false)).toBe("draft");
    expect(normalizeStatus(undefined, true)).toBe("published");
  });
});

describe("toPublicProject", () => {
  it("never leaks admin-only fields", () => {
    const project = rowToProject(legacyRow({ desktop_thumbnail: desktop, mobile_thumbnail: mobile }));
    const publicProject = toPublicProject(project);

    expect(publicProject).not.toHaveProperty("status");
    expect(publicProject).not.toHaveProperty("previousSlugs");
    expect(publicProject).not.toHaveProperty("createdAt");
    expect(publicProject).not.toHaveProperty("category");
    expect(publicProject).not.toHaveProperty("title");
    expect(publicProject.slug).toBe("voice-support-agent");
  });
});
