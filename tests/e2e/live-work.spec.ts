import { expect, test } from "@playwright/test";
import path from "node:path";

/**
 * End-to-end flow for "Our live Work":
 *   create → publish → shows as its own block on the site → reorder → the block
 *   moves → edit → reflected → delete → gone, page 404s, images removed.
 *
 * It needs a real database and a real admin account, so it is opt-in:
 *   E2E_ADMIN_EMAIL=you@example.com E2E_ADMIN_PASSWORD=… npm run test:e2e
 * Without those variables the whole spec is skipped.
 *
 * Selectors are scoped to the form dialog and address fields by role: the live
 * preview inside the form is an `<article>` whose accessible name can collide
 * with a plain `getByLabel("Project name")`.
 */

const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const DESKTOP_SHOT = path.join(process.cwd(), "public/images/about1.jpg");
const MOBILE_SHOT = path.join(process.cwd(), "public/images/building.jpg");

test.describe.configure({ mode: "serial" });

test.skip(!EMAIL || !PASSWORD, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run this flow");

const name = `E2E Live Work ${Date.now()}`;
const updatedName = `${name} v2`;

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByPlaceholder("Email address").fill(EMAIL!);
  await page.getByPlaceholder("Password").fill(PASSWORD!);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/deuvix/, { timeout: 20_000 });
}

/**
 * Waits for a project block to show up on a public page. `revalidatePath` is
 * asynchronous, so the first paint after a save can still be the old render —
 * reload until the fresh one lands.
 */
async function expectBlockOn(page: import("@playwright/test").Page, text: string) {
  const block = page.locator("article.lw-block", { hasText: text });
  await expect(async () => {
    await page.reload();
    await expect(block).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 45_000 });
}

test("create, publish, reorder, edit and delete a live-work block", async ({ page }) => {
  // First hit on a new dynamic route compiles in dev, and the flow itself is
  // long (two uploads + a full CRUD cycle).
  test.setTimeout(180_000);

  await login(page);

  /* ---------------------------------------------------------- create -- */
  await page.goto("/deuvix");
  await page.getByRole("button", { name: "New project" }).click();

  const form = page.getByRole("dialog");
  await expect(form.getByRole("heading", { name: "New project" })).toBeVisible();

  await form.getByRole("textbox", { name: /^Project name/ }).fill(name);
  await expect(form.getByRole("textbox", { name: /^Slug/ })).not.toHaveValue("");

  await form
    .getByRole("textbox", { name: /^Description/ })
    .fill("Screens inbound leads, books qualified calls and logs every touch to CRM.");

  await form.getByRole("textbox", { name: "Stat 1 value" }).fill("7 days");
  await form.getByRole("textbox", { name: "Stat 1 label" }).fill("To go live");
  await form.getByRole("textbox", { name: "Stat 2 value" }).fill("312");
  await form.getByRole("textbox", { name: "Stat 2 label" }).fill("Leads per wk");
  await form.getByRole("textbox", { name: "Stat 3 value" }).fill("68%");
  await form.getByRole("textbox", { name: "Stat 3 label" }).fill("Qualified");

  await form.getByRole("textbox", { name: "Tag 1" }).fill("Sales Ops");
  await form.getByRole("textbox", { name: "Tag 2" }).fill("CRM");

  await form.getByLabel("Desktop screenshot", { exact: true }).setInputFiles(DESKTOP_SHOT);
  await form.getByLabel("Mobile screenshot", { exact: true }).setInputFiles(MOBILE_SHOT);
  await expect(form.getByText(/^\d+×\d+$/).first()).toBeVisible();

  await form.getByRole("checkbox", { name: /Featured on the home page/ }).check();
  await form.getByRole("combobox").selectOption("published");

  const create = form.getByRole("button", { name: "Create project" });
  await expect(create).toBeEnabled();
  await create.click();

  await expect(page.getByText("Saved — the site has been updated.")).toBeVisible();
  await expect(form).toBeHidden();

  const row = page.locator("li", { hasText: name });
  await expect(row).toBeVisible();
  const slug = (await row.innerText()).match(/\/([a-z0-9-]+)/)?.[1] ?? "";
  expect(slug).not.toBe("");

  /* -------------------------------------------------- appears on site -- */
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Our live Work" })).toBeVisible();
  await expectBlockOn(page, name);

  await page.goto("/projects");
  await expectBlockOn(page, name);

  /* ---------------------------------------------------- detail page --- */
  const detail = await page.goto(`/projects/${slug}`);
  expect(detail?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

  /* ---------------------------------------------------------- reorder -- */
  await page.goto("/deuvix");
  const row2 = page.locator("li", { hasText: name });
  await expect(row2).toBeVisible(); // wait for the list to finish loading
  const before = await page.locator("li").allTextContents();
  const index = before.findIndex((text) => text.includes(name));
  expect(index).toBeGreaterThanOrEqual(0);

  if (index > 0) {
    await page.getByRole("button", { name: `Move ${name} up` }).click();
    await expect(page.getByText("Order saved — the site has been updated.")).toBeVisible();
    await expect(row2).toBeVisible();
    const after = await page.locator("li").allTextContents();
    expect(after.findIndex((text) => text.includes(name))).toBe(index - 1);
  }

  /* ------------------------------------------------------------- edit -- */
  await row.getByTitle("Edit").click();
  const editForm = page.getByRole("dialog");
  await expect(editForm.getByRole("heading", { name: "Edit project" })).toBeVisible();
  await editForm.getByRole("textbox", { name: /^Project name/ }).fill(updatedName);
  await editForm.getByRole("textbox", { name: /^Slug/ }).fill(`${slug}-renamed`);
  await editForm.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved — the site has been updated.")).toBeVisible();

  await page.goto("/");
  await expectBlockOn(page, updatedName);

  /* --------------------------------------- renamed slug keeps working -- */
  const renamed = await page.goto(`/projects/${slug}`);
  expect(renamed?.status()).toBe(200); // 301 → /projects/<slug>-renamed
  await expect(page).toHaveURL(new RegExp(`/projects/${slug}-renamed$`));

  /* ----------------------------------------------------------- delete -- */
  await page.goto("/deuvix");
  const target = page.locator("li", { hasText: updatedName });
  await expect(target).toBeVisible();

  const thumbUrl = await page.evaluate(async (expected) => {
    const list = await (await fetch("/api/projects", { cache: "no-store" })).json();
    const found = (list as Array<{ name: string; desktopThumbnail?: { url: string } | null }>).find(
      (p) => p.name === expected
    );
    return found?.desktopThumbnail?.url ?? "";
  }, updatedName);

  page.once("dialog", (dialog) => void dialog.accept());
  await target.getByTitle("Delete").click();
  await expect(page.getByText("Project deleted.")).toBeVisible();
  await expect(page.locator("li", { hasText: updatedName })).toHaveCount(0);

  const gone = await page.goto(`/projects/${slug}`);
  expect(gone?.status()).toBe(404);

  if (thumbUrl) {
    // Cache-busting param: the object was already fetched by `next/image`
    // earlier in the run, and a cached 200 would mask the deletion.
    const separator = thumbUrl.includes("?") ? "&" : "?";
    const res = await page.request.get(`${thumbUrl}${separator}cb=${Date.now()}`);
    expect(res.status()).toBeGreaterThanOrEqual(400); // removed from storage
  }
});
