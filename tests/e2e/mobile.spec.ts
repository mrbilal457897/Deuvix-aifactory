import { expect, type Page, test } from "@playwright/test";

const LAUNCHER = "Open chat with Deuvix AI Factory";
const DIALOG = "Deuvix AI Factory assistant";
const COMPOSER = "Send message";

async function boot(page: Page) {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("deuvix-chat-greeting-seen", "1");
    } catch {
      /* ignore */
    }
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: LAUNCHER })).toBeVisible();
}

test.describe("chat widget — mobile sheet", () => {
  test("expands to the full screen and can be closed again", async ({ page }) => {
    await boot(page);
    await page.getByRole("button", { name: LAUNCHER }).click();

    const dialog = page.getByRole("dialog", { name: DIALOG });
    await expect(dialog).toBeVisible();

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    if (!viewport) return;

    // The sheet animates in — wait until it has settled at full bleed.
    await expect
      .poll(
        async () => {
          const box = await dialog.boundingBox();
          if (!box) return false;
          return box.width >= viewport.width - 1 && box.height >= viewport.height - 1;
        },
        // Generous: the first request after a cold dev-server start compiles.
        { timeout: 15_000 },
      )
      .toBe(true);

    await expect(page.getByRole("textbox", { name: COMPOSER })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  test("composer and greeting fit inside the viewport", async ({ page }) => {
    await boot(page);
    await page.getByRole("button", { name: LAUNCHER }).click();

    const composer = page.getByRole("textbox", { name: COMPOSER });
    await expect(composer).toBeVisible();

    const viewport = page.viewportSize();
    const box = await composer.boundingBox();
    if (!viewport || !box) return;

    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(box.x).toBeGreaterThanOrEqual(-1);
    await expect(page.getByText(/Salam! I'm the Deuvix assistant/)).toBeVisible();
  });
});
