import { chromium } from "playwright";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 140 }, colorScheme: "light", deviceScaleFactor: 2 })).newPage();
await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForSelector("header a[aria-label='Book a Call']", { timeout: 60000 });
await page.waitForTimeout(1500);
const info = await page.evaluate(() => {
  const out = {};
  for (const label of ["Discuss", "Book a Call"]) {
    const el = [...document.querySelectorAll("header a")].find((a) => a.textContent.trim().startsWith(label));
    if (el) out[label] = { color: getComputedStyle(el).color, border: getComputedStyle(el).borderColor };
  }
  return out;
});
console.log(JSON.stringify(info, null, 2));
await page.close();
// mobile panel (375px, light) — open menu, check panel Book a Call color
const mp = await (await browser.newContext({ viewport: { width: 375, height: 700 }, colorScheme: "light", deviceScaleFactor: 2 })).newPage();
await mp.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 90000 });
await mp.waitForSelector("header", { timeout: 60000 });
await mp.click("button[aria-label='Open menu']");
await mp.waitForTimeout(700);
const panel = await mp.evaluate(() => {
  const a = [...document.querySelectorAll("#navbar-panel a")].find((a) => a.textContent.trim().startsWith("Book a Call"));
  return a ? { color: getComputedStyle(a).color, border: getComputedStyle(a).borderColor } : null;
});
console.log("mobile panel Book a Call:", JSON.stringify(panel));
await browser.close();
process.exit(0);
