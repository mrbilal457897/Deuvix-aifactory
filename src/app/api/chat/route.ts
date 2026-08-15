import { NextResponse } from "next/server";
import {
  sanitizeInput,
  isRestrictedRequest,
  RESTRICTED_RESPONSE,
} from "@/lib/chat/guardrails";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const responses: Record<string, string> = {
  services: `We offer 7 core services at Deux:\n\n1. **Digital FTE Deployment** — AI workers that operate 24/7, 168 hours/week at 85% cost savings. Domain-specific agents that handle your business tasks.\n\n2. **Forward Deployed Engineer (FDE)** — Expert engineers deployed to your site to implement AI-native solutions with spec-driven development.\n\n3. **AI Chatbots** — Customer-facing chatbots trained on your business that qualify and convert visitors around the clock.\n\n4. **Voice Agents** — AI voice agents that take calls, book appointments, and follow up in natural speech.\n\n5. **Custom Agents** — Tailor-made agents built for your exact workflow, integrated with your tools.\n\n6. **Loop Engineering** — We build and operate agent loops — a heartbeat, worktree, and spine — that run your operations continuously, with a human gate keeping you in control.\n\n7. **AI Agent E-books** — Comprehensive guides to building AI-Native companies. Learn to manufacture, deploy, and monetize Digital FTEs.\n\nWe also build AI-Powered Web Apps and deliver Business AI Solutions.\n\nWant details on any specific service?`,

  fte: `A **Digital FTE** (Full-Time Equivalent) is an AI worker that operates 24/7, 168 hours a week — that's 4x the output of a human worker.\n\nKey benefits:\n• 85% cost savings vs human employees\n• Instant scaling — add more FTEs anytime\n• Domain-specific expertise\n• 99%+ consistency\n• Zero fatigue, zero downtime\n\nWe help you manufacture, deploy, and monetize Digital FTEs for your business.`,

  fde: `A **Forward Deployed Engineer (FDE)** is an expert engineer deployed directly to your site to implement AI solutions.\n\nWhat FDEs do:\n• Spec-driven development with blueprints both humans and AI understand\n• Production-ready architecture from day one\n• On-site implementation and integration\n• Full-stack AI development (Python + TypeScript)\n\nFDEs bridge the gap between AI theory and production reality.`,

  pricing: `Our pricing plans:\n\n**Starter** — $500/mo\n• 1 Digital FTE\n• Basic Agent Setup\n• Email support\n• Community access\n\n**Professional** — $2,000/mo (Most Popular)\n• 5 Digital FTEs\n• Custom Agent Training\n• Priority support\n• FDE consultation\n• Analytics dashboard\n\n**Enterprise** — Custom pricing\n• Unlimited FTEs\n• Dedicated FDE team\n• SLA guarantee\n• On-premise option\n• Custom integrations\n\nAll plans include a 14-day free trial!`,

  getting_started: `Getting started with Deux is simple:\n\n1. **Book a consultation** — Visit our Contact page or email us at sobber.id@gmail.com\n2. **Discuss your needs** — We'll understand your business and identify AI opportunities\n3. **Choose your plan** — Starter ($500/mo), Professional ($2,000/mo), or Enterprise\n4. **Deploy your FTEs** — We manufacture and deploy your AI workers\n5. **Scale & optimize** — Monitor results and expand your AI workforce\n\nReady to start? Book a consultation at /contact`,

  team: `Deux is led by:\n\n**Bilal** — Leader\nOversees company strategy and AI-Native development direction.\n\n**Asad** — Co-Leader\nHandles technical architecture and FDE implementation.\n\nWe're based in Pakistan and work with businesses globally to build AI-Native companies.`,

  company: `**Deux** is an AI-Native company focused on helping businesses manufacture, deploy, and monetize Digital FTEs.\n\nOur philosophy:\n• **Spec-Driven Development** — Write specs that both humans and AI understand\n• **Co-Learning Partnership** — You and AI teach each other through iteration\n• **Production-Ready Architecture** — Cloud-native with Docker, Kubernetes, and Dapr\n• **Dual Language Mastery** — Python for reasoning, TypeScript for UI\n\nWe believe in building AI-Native companies, not just using AI as a tool.`,

  contact: `You can reach us through:\n\n📧 **Email:** sobber.id@gmail.com\n📱 **Phone (Bilal):** 0308-2835303\n📱 **Phone (Asad):** 0334-3406773\n📍 **Location:** Pakistan\n\n**Office Hours:**\n• Monday–Friday: 9:00 AM – 6:00 PM\n• Saturday: 10:00 AM – 2:00 PM\n• Sunday: Closed\n\nOr visit our Contact page to book a free consultation!`,

  spec_driven: `**Spec-Driven Development** is our core methodology.\n\nInstead of writing code directly, we write specifications — blueprints that both humans and AI understand. These specs become executable instructions for building intelligent systems.\n\nBenefits:\n• Clear communication between humans and AI\n• Reproducible results\n• Easy to iterate and improve\n• Foundation of AI-Native engineering\n\nThis is how we build all our Digital FTEs and AI solutions.`,

  co_learning: `**Co-Learning Partnership** means you and AI teach each other through iteration.\n\nIt's not about using AI as a tool — it's about co-creating where both human and AI learn and improve together.\n\nHow it works:\n• You provide domain expertise and feedback\n• AI provides speed and pattern recognition\n• Together you build better solutions over time\n• The system gets smarter with each iteration\n\nThis philosophy is at the heart of everything we do at Deux.`,

  ebook: `Our **AI Agent E-books** are comprehensive guides to building AI-Native companies.\n\nWhat you'll learn:\n• How to manufacture Digital FTEs step by step\n• How to deploy AI workers to production\n• How to monetize your AI workforce\n• Real case studies and examples\n• Production-focused strategies\n\nThese guides follow our co-learning philosophy — practical, not theoretical.`,

  web_apps: `We build **AI-Powered Web Applications** with AI-native architecture.\n\nWhat we deliver:\n• Full-stack web applications\n• AI-native architecture from day one\n• Real-time processing capabilities\n• Cloud-deployed and scalable\n• Intelligent automation baked in\n\nFrom concept to production, we build web apps that leverage AI at their core.`,

  greeting: `Hello! Welcome to Deux. I can help you learn about our AI solutions, services, pricing, or how to get started. What would you like to know?`,

  thanks: `You're welcome! If you have any more questions about our services, pricing, or how to get started, feel free to ask. You can also reach us at sobber.id@gmail.com or visit our Contact page.`,

  help: `I can help you with:\n\n• **Services** — Digital FTE, FDE, AI Chatbots, Voice Agents, Custom Agents, Loop Engineering, E-books, Web Apps\n• **Pricing** — Starter ($500/mo), Professional ($2,000/mo), Enterprise\n• **Getting Started** — How to begin your AI journey\n• **Company** — Our team, philosophy, and approach\n• **Contact** — Email, phone, and office hours\n\nJust ask me anything!`,

  default: `Thanks for your message! I'm here to help you learn about Deux's AI solutions.\n\nI can help with:\n• Our services (Digital FTE, FDE, AI Chatbots, Voice Agents, Custom Agents, Loop Engineering, E-books, Web Apps)\n• Pricing plans ($500/mo to Enterprise)\n• How to get started\n• Our team and company philosophy\n• Contact information\n\nWhat would you like to know?`,
};

function getAIResponse(input: string): string {
  const lower = input.toLowerCase();

  if (lower.includes("fte") || lower.includes("digital worker") || lower.includes("ai worker") || lower.includes("ai workforce")) {
    return responses.fte;
  }

  if (lower.includes("fde") || lower.includes("engineer") || lower.includes("deployed engineer")) {
    return responses.fde;
  }

  if (lower.includes("service") || lower.includes("product") || lower.includes("offer") || lower.includes("what do you do") || lower.includes("what does") || lower.includes("chatbot") || lower.includes("voice agent") || lower.includes("custom agent") || lower.includes("loop engineering") || lower.includes("agent loop")) {
    return responses.services;
  }

  if (lower.includes("price") || lower.includes("cost") || lower.includes("plan") || lower.includes("pricing") || lower.includes("how much")) {
    return responses.pricing;
  }

  if (lower.includes("start") || lower.includes("sign") || lower.includes("begin") || lower.includes("onboard") || lower.includes("how do i")) {
    return responses.getting_started;
  }

  if (lower.includes("team") || lower.includes("who") || lower.includes("founder") || lower.includes("leader") || lower.includes("bilal") || lower.includes("asad")) {
    return responses.team;
  }

  if (lower.includes("company") || lower.includes("about") || lower.includes("philosophy") || lower.includes("ai-native") || lower.includes("deux")) {
    return responses.company;
  }

  if (lower.includes("contact") || lower.includes("email") || lower.includes("phone") || lower.includes("location") || lower.includes("address") || lower.includes("reach")) {
    return responses.contact;
  }

  if (lower.includes("spec") || lower.includes("specification") || lower.includes("blueprint")) {
    return responses.spec_driven;
  }

  if (lower.includes("co-learn") || lower.includes("co learn") || lower.includes("partnership") || lower.includes("iteration")) {
    return responses.co_learning;
  }

  if (lower.includes("ebook") || lower.includes("e-book") || lower.includes("book") || lower.includes("guide") || lower.includes("learn")) {
    return responses.ebook;
  }

  if (lower.includes("web app") || lower.includes("website") || lower.includes("application") || lower.includes("full stack")) {
    return responses.web_apps;
  }

  if (lower.match(/^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening))/)) {
    return responses.greeting;
  }

  if (lower.includes("thank") || lower.includes("thanks")) {
    return responses.thanks;
  }

  if (lower.includes("help") || lower === "?") {
    return responses.help;
  }

  return responses.default;
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many messages. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    let body: { messages?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    const last = messages[messages.length - 1];
    const rawContent = last && typeof last === "object" && "content" in last
      ? (last as { content?: unknown }).content
      : "";

    const input = sanitizeInput(typeof rawContent === "string" ? rawContent : "");

    if (!input) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }

    const isRestricted = isRestrictedRequest(input);
    const response = isRestricted ? RESTRICTED_RESPONSE : getAIResponse(input);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const words = response.split(" ");
        let index = 0;

        const interval = setInterval(() => {
          if (index < words.length) {
            const word = words[index] + " ";
            controller.enqueue(encoder.encode(word));
            index++;
          } else {
            clearInterval(interval);
            controller.close();
          }
        }, 30);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
