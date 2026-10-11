import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

export const bookingStatus = pgEnum("booking_status", [
  "confirmed",
  "rescheduled",
  "cancelled",
]);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    calUid: text("cal_uid").notNull().unique(),
    status: bookingStatus("status").notNull().default("confirmed"),
    eventTitle: text("event_title"),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    timezone: text("timezone"),
    name: text("name"),
    email: text("email"),
    whatsapp: text("whatsapp"),
    company: text("company"),
    notes: text("notes"),
    meetingUrl: text("meeting_url"),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>(),
    reminderSent: boolean("reminder_sent").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("bookings_start_time_idx").on(table.startTime),
    index("bookings_status_idx").on(table.status),
    index("bookings_reminder_idx").on(table.reminderSent, table.startTime),
  ],
);

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type BookingStatus = (typeof bookingStatus.enumValues)[number];

export const now = sql`now()`;

/* -------------------------------------------------------------------------- */
/* Chat: knowledge base                                                       */
/* -------------------------------------------------------------------------- */

export type KbSource = "deux" | "agentfactory";

export const kbPages = pgTable(
  "kb_pages",
  {
    source: text("source").$type<KbSource>().notNull(),
    url: text("url").notNull(),
    title: text("title"),
    contentHash: text("content_hash").notNull(),
    chunkCount: integer("chunk_count").notNull().default(0),
    lastFetched: timestamp("last_fetched", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.source, table.url] })],
);

export const kbChunks = pgTable(
  "kb_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source").$type<KbSource>().notNull(),
    url: text("url").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    title: text("title"),
    heading: text("heading"),
    text: text("text").notNull(),
    contentHash: text("content_hash").notNull(),
    embedding: vector("embedding", { dimensions: 768 }),
    lastFetched: timestamp("last_fetched", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("kb_chunks_unique_idx").on(table.source, table.url, table.chunkIndex),
    index("kb_chunks_source_idx").on(table.source),
  ],
);

/* -------------------------------------------------------------------------- */
/* Chat: session memory (logged-in users only)                                */
/* -------------------------------------------------------------------------- */

export const conversationStatus = pgEnum("conversation_status", [
  "active",
  "ended",
]);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Ownership boundary: every query filters on this. */
    userId: text("user_id").notNull(),
    title: text("title"),
    /** Rolling summary of messages older than the history window. */
    summary: text("summary"),
    /** Compact profile: business type, goals, problem, tools mentioned. */
    profile: jsonb("profile")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    abuseStrikes: integer("abuse_strikes").notNull().default(0),
    status: conversationStatus("status").notNull().default("active"),
    endedReason: text("ended_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("conversations_user_idx").on(table.userId, table.updatedAt)],
);

export const messageRole = pgEnum("message_role", ["user", "assistant", "system"]);
export const messageFeedback = pgEnum("message_feedback", ["up", "down"]);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRole("role").notNull(),
    content: text("content").notNull(),
    /** [{ title, url, source }] — only URLs that came from retrieval. */
    sources: jsonb("sources")
      .$type<Array<{ title: string; url: string; source: KbSource }>>()
      .notNull()
      .default([]),
    feedback: messageFeedback("feedback"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("messages_conversation_idx").on(table.conversationId, table.createdAt),
  ],
);

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type ChatMessage = typeof messages.$inferSelect;
export type NewChatMessage = typeof messages.$inferInsert;
export type KbChunk = typeof kbChunks.$inferSelect;

/* -------------------------------------------------------------------------- */
/* Chat: leads handed to the founders                                         */
/* -------------------------------------------------------------------------- */

export const chatLeads = pgTable("chat_leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  contact: text("contact").notNull(),
  summary: text("summary").notNull(),
  consent: boolean("consent").notNull().default(false),
  channel: text("channel").notNull().default("email"),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ChatLead = typeof chatLeads.$inferSelect;

/* -------------------------------------------------------------------------- */
/* Admin AI agent: audit log                                                  */
/* -------------------------------------------------------------------------- */

/** One entry per tool call, stored inside the row's tool_calls jsonb column. */
export interface AdminAgentToolCall {
  name: string;
  risk?: string;
  status: "running" | "ok" | "error" | "pending";
  args?: unknown;
  result?: unknown;
  error?: string;
}

export const adminAgentAudit = pgTable(
  "admin_agent_audit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminId: text("admin_id"),
    adminEmail: text("admin_email"),
    inputMode: text("input_mode").notNull().default("text"),
    prompt: text("prompt"),
    /** Filled for voice input; the reviewed transcript, not raw audio. */
    transcript: text("transcript"),
    skillsLoaded: jsonb("skills_loaded")
      .$type<string[]>()
      .notNull()
      .default([]),
    toolCalls: jsonb("tool_calls")
      .$type<AdminAgentToolCall[]>()
      .notNull()
      .default([]),
    status: text("status").notNull().default("ok"),
    error: text("error"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("admin_agent_audit_created_idx").on(table.createdAt)],
);

export type AdminAgentAuditRow = typeof adminAgentAudit.$inferSelect;
