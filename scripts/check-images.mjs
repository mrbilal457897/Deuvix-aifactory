/** Check which image URLs the public pages actually use + admin config state. */
import { chromium } from "playwright";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(2200);
const imgs = await page.evaluate(() => [...document.querySelectorAll("img")].map((i) => i.currentSrc || i.src));
console.log("HOME imgs:", JSON.stringify(imgs.filter((s) => /bilal|asad|about[12]|hero-bg|D\.png/.test(s)), null, 1));
// also API directly
const res = await page.evaluate(async () => (await fetch("/api/site-config")).json());
console.log("API config:", JSON.stringify(res));
await browser.close();
process.exit(0);
