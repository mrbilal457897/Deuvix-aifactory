/**
 * Every user-facing string in the chat widget, in one file (§8.4).
 */
export const uiStrings = {
  launcherLabel: "Open chat with DEUX AI Factory",
  launcherGreeting: "Need help building an AI agent?",
  launcherGreetingDismiss: "Dismiss",

  dialogLabel: "DEUX AI Factory assistant",
  statusOnline: "Online · Replies instantly",
  statusSaved: "History is saved",
  statusGuest: "Guest mode · not saved",

  newChat: "New chat",
  clearHistory: "Clear history",
  close: "Close chat",
  menu: "Chat options",
  copy: "Copy",
  copied: "Copied",
  thumbsUp: "Helpful",
  thumbsDown: "Not helpful",
  regenerate: "Regenerate",
  stop: "Stop generating",
  stopped: "Stopped.",
  jumpToLatest: "Jump to latest",
  retry: "Retry",

  placeholder: "Ask about AI agents…",
  send: "Send message",
  privacyHint: "Don't share card numbers or passwords",
  charLimit: (n: number, max: number) => `${n}/${max}`,

  greeting:
    "Salam! I'm the DEUX assistant. I can explain what Deux does, or help you plan how to build an AI agent for your business.",
  quickReplies: [
    "What does Deux offer?",
    "Who are you?",
    "How do I build an AI agent?",
    "Explore Agent Factory",
    "I have a business problem",
    "Talk to the founders",
  ],

  typing: "Assistant is typing",
  sourcesLabel: "Sources",
  sourceDeux: "Deux",
  sourceAgentFactory: "Agent Factory",

  emptyAnswer: "I couldn't put that together. Please try again.",
  rateLimited:
    "You're sending messages a little quickly. Wait a moment and try again.",
  networkError:
    "I lost the connection. Check your network and press Retry.",
  modelError:
    "The assistant is unavailable right now. Please try again in a moment.",
  offline: "You're offline — messages will fail until the connection returns.",

  noAnswer:
    "I don't have that information. The founders can help — use the contact options below.",
  boundary: (topic: string) =>
    `Let's keep this about building AI agents and what Deux does. I can't help with ${topic}.`,
  abuseBoundary:
    "Let's keep this respectful. I'm happy to help with building AI agents — what are you working on?",
  sessionEnded:
    "This chat has ended. You can start a new one when you're ready.",
  startNewChat: "Start new chat",
  cooldownSeconds: (s: number) => `New chat available in ${s}s`,

  pricingReply:
    "Pricing depends on the project, so the founders handle that personally. I don't quote prices. Reach them via the options below.",

  paymentWarning:
    "Please don't share card numbers, bank details, or passwords — I don't accept payment information and I've removed what you sent.",
  orderDecline:
    "I can't place, change, or cancel orders, bookings, or contracts. The founders handle anything like that personally.",

  leadCardTitle: "Talk to the founders",
  leadCardBody:
    "Share a few details and one of the founders will get back to you.",
  leadName: "Your name",
  leadContact: "Email or phone",
  leadSummary: "What are you trying to build? (1–2 lines)",
  leadConsent: "I agree to be contacted about this enquiry.",
  leadSubmit: "Send to founders",
  leadSending: "Sending…",
  leadSuccess: "Thanks — the founders will get your message.",
  leadError: "That didn't send. Please try again.",
  leadValidation: {
    name: "Enter your name (at least 2 characters).",
    contact: "Enter a valid email address or phone number.",
    summary: "Tell us briefly what you need (at least 10 characters).",
    consent: "Please tick the box so we can reply.",
  },

  emailCta: "Email",
  whatsappCta: "WhatsApp",
  bookCallCta: "Book a call",

  historyNote:
    "Your conversation is saved to your account so you can pick it up later.",
  guestNote: "You're in guest mode — this chat isn't saved.",
} as const;

export type UiStrings = typeof uiStrings;
