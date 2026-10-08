import { expect, type Page, test } from "@playwright/test";

const LAUNCHER = "Open chat with DEUX AI Factory";
const DIALOG = "DEUX AI Factory assistant";
const COMPOSER = "Send message";

/** Kill the 4.5s launcher greeting so it never steals focus mid-test. */
async function boot(page: Page) {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("deux-chat-greeting-seen", "1");
    } catch {
      /* ignore */
    }
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: LAUNCHER })).toBeVisible();
}

async function openChat(page: Page) {
  await page.getByRole("button", { name: LAUNCHER }).click();
  return page.getByRole("dialog", { name: DIALOG });
}

const focusIsInsideDialog = (page: Page) =>
  page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')));

test.describe("chat widget — desktop", () => {
  test("opens, focuses the composer, and marks itself expanded", async ({ page }) => {
    await boot(page);
    const launcher = page.getByRole("button", { name: LAUNCHER });
    expect(await launcher.getAttribute("aria-expanded")).toBe("false");

    const dialog = await openChat(page);
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("textbox", { name: COMPOSER })).toBeFocused();
    // The launcher unmounts while the sheet is open.
    await expect(launcher).toHaveCount(0);
    await expect(dialog.getByText(/Salam! I'm the DEUX assistant/)).toBeVisible();
  });

  test("Escape closes it and hands focus back to the launcher", async ({ page }) => {
    await boot(page);
    await openChat(page);
    await expect(page.getByRole("dialog", { name: DIALOG })).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.getByRole("dialog", { name: DIALOG })).toHaveCount(0);
    await expect(page.getByRole("button", { name: LAUNCHER })).toBeFocused();
  });

  test("keeps Tab and Shift+Tab inside the dialog", async ({ page }) => {
    await boot(page);
    await openChat(page);
    await expect(page.getByRole("textbox", { name: COMPOSER })).toBeFocused();

    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press("Tab");
      expect(await focusIsInsideDialog(page)).toBe(true);
    }
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press("Shift+Tab");
      expect(await focusIsInsideDialog(page)).toBe(true);
    }
  });

  test("Close button dismisses the widget", async ({ page }) => {
    await boot(page);
    await openChat(page);
    await page.getByRole("button", { name: "Close chat" }).click();
    await expect(page.getByRole("dialog", { name: DIALOG })).toHaveCount(0);
  });

  test("clicking outside the widget closes it", async ({ page }) => {
    await boot(page);
    await openChat(page);
    await expect(page.getByRole("dialog", { name: DIALOG })).toBeVisible();

    const vp = page.viewportSize();
    // Bottom-left corner: the widget is anchored bottom-right, so this lands on
    // the page itself rather than on the launcher.
    await page.mouse.click(12, (vp?.height ?? 720) - 12);

    await expect(page.getByRole("dialog", { name: DIALOG })).toHaveCount(0);
    await expect(page.getByRole("button", { name: LAUNCHER })).toBeFocused();
  });

  test("clicking inside the widget leaves it open", async ({ page }) => {
    await boot(page);
    const dialog = await openChat(page);

    await dialog.getByRole("button", { name: COMPOSER }).click();
    await dialog.getByRole("textbox", { name: COMPOSER }).fill("still open?");

    await expect(page.getByRole("dialog", { name: DIALOG })).toBeVisible();
  });

  test("a click on a menu item does not dismiss the widget", async ({ page }) => {
    await boot(page);
    const dialog = await openChat(page);

    // Dropdown content renders in a portal outside the dialog, so it has to be
    // explicitly excluded from outside-click dismissal.
    await dialog.getByRole("button", { name: "Chat options" }).click();
    await page.getByRole("menuitem", { name: "New chat" }).click();

    await expect(page.getByRole("dialog", { name: DIALOG })).toBeVisible();
  });

  test("send is disabled until there is something to send", async ({ page }) => {
    await boot(page);
    await openChat(page);

    const composer = page.getByRole("textbox", { name: COMPOSER });
    const send = page.getByRole("button", { name: COMPOSER });

    await expect(send).toBeDisabled();
    await composer.fill("   ");
    await expect(send).toBeDisabled();

    await composer.fill("What does Deux offer?");
    await expect(send).toBeEnabled();
    await expect(page.getByText(/^1000\/1000$/)).toHaveCount(0);
  });

  test("shows the privacy hint and the Gemini disclaimer", async ({ page }) => {
    await boot(page);
    await openChat(page);
    const dialog = page.getByRole("dialog", { name: DIALOG });
    await expect(dialog.getByText("Don't share card numbers or passwords")).toBeVisible();
    await expect(dialog.getByText(/Powered by Google Gemini/)).toBeVisible();
  });
});
