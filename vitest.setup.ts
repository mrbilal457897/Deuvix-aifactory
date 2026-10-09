import "@testing-library/jest-dom/vitest";

// The chat tests run against a stub key so nothing can accidentally hit the
// real Gemini API (or spend quota) from a unit test.
process.env.GEMINI_API_KEY ||= "test-key-not-a-real-key";
process.env.CHAT_LOG_EVENTS ||= "false";
