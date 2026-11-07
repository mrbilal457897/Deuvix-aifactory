import { describe, expect, it } from "vitest";
import { classifyLocally, namespacesFor, routeByScores } from "@/lib/chat/route-classify";

describe("classifyLocally", () => {
  it("routes company questions to Source A", () => {
    expect(classifyLocally("What services does Deuvix offer?")).toBe("deuvix");
    expect(classifyLocally("Who are you?")).toBe("deuvix");
    expect(classifyLocally("How do I contact you?")).toBe("deuvix");
    expect(classifyLocally("Do you have case studies?")).toBe("deuvix");
  });

  it("routes building questions to Source B", () => {
    expect(classifyLocally("How do I build an AI agent?")).toBe("agentfactory");
    expect(classifyLocally("What does the Agent Factory guide say about RAG?")).toBe(
      "agentfactory",
    );
    expect(classifyLocally("Which framework should I use?")).toBe("agentfactory");
  });

  it("declines obviously off-topic questions", () => {
    expect(classifyLocally("football scores today please")).toBe("out_of_scope");
    expect(classifyLocally("tell me a joke")).toBe("out_of_scope");
  });

  it("returns null when the signal is too weak to act on", () => {
    expect(classifyLocally("hi")).toBeNull();
    expect(classifyLocally("tell me more")).toBeNull();
    expect(classifyLocally("ok thanks")).toBeNull();
  });
});

describe("routeByScores", () => {
  it("picks the higher scoring namespace once the margin clears", () => {
    expect(routeByScores(0.8, 0.4)).toBe("deuvix");
    expect(routeByScores(0.3, 0.9)).toBe("agentfactory");
  });

  it("calls it mixed when they are close", () => {
    expect(routeByScores(0.55, 0.52)).toBe("mixed");
    expect(routeByScores(0.4, 0.4)).toBe("mixed");
  });

  it("falls back to both when nothing scored", () => {
    expect(routeByScores(0, 0)).toBe("mixed");
  });
});

describe("namespacesFor", () => {
  it("searches only the namespace it needs", () => {
    expect(namespacesFor("deuvix")).toEqual(["deuvix"]);
    expect(namespacesFor("agentfactory")).toEqual(["agentfactory"]);
    expect(namespacesFor("mixed")).toEqual(["deuvix", "agentfactory"]);
    expect(namespacesFor("out_of_scope")).toEqual(["deuvix", "agentfactory"]);
  });
});
