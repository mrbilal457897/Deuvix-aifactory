import { describe, expect, it } from "vitest";
import { bookingRequestSchema } from "@/lib/booking/schema";

const valid = {
  date: "2026-10-20",
  time: "14:30",
  timeZone: "Asia/Karachi",
  name: "Sam Ali",
  email: "sam@example.com",
  language: "en",
};

describe("booking request schema", () => {
  it("accepts a minimal valid request", () => {
    expect(bookingRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts the optional fields", () => {
    const res = bookingRequestSchema.safeParse({
      ...valid,
      whatsapp: "+92 300 1234567",
      company: "Acme",
      notes: "Automate inbound lead triage",
    });
    expect(res.success).toBe(true);
  });

  it("rejects a malformed date, time or time zone", () => {
    expect(bookingRequestSchema.safeParse({ ...valid, date: "20-10-2026" }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...valid, time: "2:30pm" }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...valid, timeZone: "" }).success).toBe(false);
  });

  it("rejects a bad email and a too-short name", () => {
    expect(bookingRequestSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...valid, name: "S" }).success).toBe(false);
  });

  it("requires a known preferred language", () => {
    expect(bookingRequestSchema.safeParse({ ...valid, language: undefined }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...valid, language: "xx" }).success).toBe(false);
  });

  it("rejects a filled honeypot but allows an empty one", () => {
    expect(bookingRequestSchema.safeParse({ ...valid, companyWebsite: "http://spam.example" }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...valid, companyWebsite: "" }).success).toBe(true);
  });
});
