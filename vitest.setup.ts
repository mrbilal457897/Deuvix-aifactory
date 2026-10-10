import "@testing-library/jest-dom/vitest";

// The chat tests run against a stub key so nothing can accidentally hit the
// real Gemini API (or spend quota) from a unit test.
process.env.GEMINI_API_KEY ||= "test-key-not-a-real-key";
process.env.CHAT_LOG_EVENTS ||= "false";

// The Supabase client is constructed at import time. Unit tests never talk to
// it, so placeholder values keep data modules (leads, contacts, ...) importable.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-service-role-key";
