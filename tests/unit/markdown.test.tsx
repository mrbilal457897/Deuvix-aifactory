// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Markdown } from "@/lib/chat/markdown";

describe("Markdown rendering", () => {
  it("renders headings, emphasis and inline code", () => {
    render(<Markdown content={"# Build an agent\n\nUse **tool calls** and `memory`."} />);
    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent("Build an agent");
    expect(screen.getByText("tool calls").tagName).toBe("STRONG");
    expect(screen.getByText("memory").tagName).toBe("CODE");
  });

  it("renders bullets and numbered steps", () => {
    render(<Markdown content={"1. Define the goal\n2. Pick the tools"} />);
    expect(screen.getByText(/Define the goal/)).toBeInTheDocument();
    expect(screen.getByText(/Pick the tools/)).toBeInTheDocument();
  });

  it("keeps a fenced code block as text, not markup", () => {
    const { container } = render(
      <Markdown content={"```ts\nconst a = 1 < 2;\n```"} />,
    );
    expect(container.querySelector("pre")).not.toBeNull();
    expect(container.querySelector("pre")?.textContent).toContain("const a = 1 < 2;");
  });

  describe("XSS resistance", () => {
    it("never turns an inline script tag into a real element", () => {
      const { container } = render(
        <Markdown content={"hello <script>alert('xss')</script> world"} />,
      );
      expect(container.querySelector("script")).toBeNull();
      expect(container.textContent).toContain("<script>");
    });

    it("drops javascript: URLs instead of linking them", () => {
      const { container } = render(
        <Markdown content={"[click me](javascript:alert(1))"} />,
      );
      expect(container.querySelector("a")).toBeNull();
      expect(container.textContent).toContain("click me");
    });

    it("drops data: URLs too", () => {
      const { container } = render(
        <Markdown content={"[x](data:text/html,<script>alert(1)</script>)"} />,
      );
      expect(container.querySelector("a")).toBeNull();
    });

    it("keeps a safe external link and marks it to open safely", () => {
      const { container } = render(
        <Markdown content={"[about](https://deuvix-aicompany.vercel.app/about)"} />,
      );
      const anchor = container.querySelector("a");
      expect(anchor).not.toBeNull();
      expect(anchor?.getAttribute("href")).toBe("https://deuvix-aicompany.vercel.app/about");
      expect(anchor?.getAttribute("rel")).toContain("noopener");
      expect(anchor?.getAttribute("target")).toBe("_blank");
    });

    it("keeps a site-relative link", () => {
      const { container } = render(<Markdown content={"[contact](/contact)"} />);
      expect(container.querySelector("a")?.getAttribute("href")).toBe("/contact");
    });

    it("renders an onerror attribute as inert text", () => {
      const { container } = render(
        <Markdown content={'<img src=x onerror="alert(1)">'} />,
      );
      expect(container.querySelector("img")).toBeNull();
      expect(container.textContent).toContain("onerror");
    });
  });
});
