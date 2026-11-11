import { chromium } from "playwright";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 600 }, colorScheme: "light", deviceScaleFactor: 2 })).newPage();
await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForSelector("header", { timeout: 60000 });
await page.evaluate(() => document.documentElement.classList.remove("dark"));
await page.waitForTimeout(600);
const info = await page.evaluate(() => {
  const out = {};
  for (const label of ["Discuss", "Book a Call"]) {
    const el = [...document.querySelectorAll("header a")].find((a) => a.textContent.trim().startsWith(label));
    if (el) out[label] = { color: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor, darkClass: document.documentElement.classList.contains("dark") };
  }
  return out;
});
console.log(JSON.stringify(info, null, 2));
await page.close();
await browser.close();
process.exit(0);
