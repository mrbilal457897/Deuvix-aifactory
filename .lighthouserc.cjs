/**
 * Lighthouse CI. Run with `npm run lighthouse`.
 *
 * Boots a real production build (dev-server scores are meaningless) and audits
 * the marketing surface the chatbot sits on top of. The page must be reachable
 * on port 3000 — stop any `npm run dev` first.
 */
module.exports = {
  ci: {
    collect: {
      startServerCommand: "npm run build && npm run start",
      startServerReadyPattern: "Ready in|Local:",
      startServerReadyTimeout: 300_000,
      url: [
        "http://localhost:3000/",
        "http://localhost:3000/products",
        "http://localhost:3000/about",
        "http://localhost:3000/contact",
      ],
      numberOfRuns: 3,
      settings: {
        chromeFlags: "--no-sandbox --disable-gpu",
      },
    },
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.8 }],
        "categories:performance": ["warn", { minScore: 0.7 }],
        "errors-in-console": ["warn", { minLength: 0 }],
        "no-document-write": "error",
        "font-display": "warn",
        "uses-responsive-images": "warn",
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci/reports",
    },
    server: {
      port: 9001,
      storageDir: ".lighthouseci",
    },
  },
};
