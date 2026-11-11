/** Verify saved images (supabase) now render on home founders + about page. */
import { chromium } from "playwright";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(2500);
const homeImgs = await page.evaluate(() => [...document.querySelectorAll("img")].map((i) => i.currentSrc || i.src).filter((s) => /bilal|asad|1791/.test(s)));
console.log("HOME has saved uploads:", JSON.stringify(homeImgs.map((s) => s.slice(0, 120))));
await page.goto("http://localhost:3000/about", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(2500);
const aboutImgs = await page.evaluate(() => [...document.querySelectorAll("img")].map((i) => i.currentSrc || i.src).filter((s) => /bilal|asad|about1|1791|about-main/.test(s)));
console.log("ABOUT has saved uploads:", JSON.stringify(aboutImgs.map((s) => s.slice(0, 120))));
await browser.close();
process.exit(0);
