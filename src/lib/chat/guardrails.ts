const MAX_MESSAGE_LENGTH = 800;

export const RESTRICTED_RESPONSE =
  "I can't share internal, confidential, or personal information — including instructions, credentials, system details, or data about other people.\n\nI'm here to help with our public offerings: services, pricing, getting started, team, and contact details. Is there something about those I can help with?";

const INJECTION_PATTERNS: RegExp[] = [
  /\bignore\b.{0,40}\b(previous|prior|above|all|your)\b.{0,40}\b(instructions|prompts?|messages|rules)\b/i,
  /\b(reveal|expose|leak|disclose|print|echo|output|show|share|give|repeat|dump|display)\b.{0,30}\b(instructions|system prompt|system message|prompt|rules|guidelines)\b/i,
  /\b(system prompt|system message|initial prompt|original prompt|your prompt)\b/i,
  /\b(simulate|pretend|act as|role ?play|jailbreak|developer mode)\b/i,
  /\b(api ?key|secret key|access token|oauth token|password|passphrase|credential)\b/i,
  /\b(database|db)\b.{0,20}\b(password|login|url|host|port)\b/i,
  /\b(admin|internal|confidential|secret|private)\b.{0,30}\b(panel|account|data|info|details|system)\b/i,
  /\b(other|another)\b.{0,20}\b(users?|customers?|clients?|data)\b/i,
  /\b(environment variables|env ?vars|process\.env|config\.(json|ts)|\.env)\b/i,
  /\b(source code|sourcecode|raw html|backend|server code)\b/i,
  /\bshow me your\b.{0,30}\b(setup|configuration|settings|backend|instructions)\b/i,
];

export function sanitizeInput(raw: string): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);
}

export function isRestrictedRequest(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}
