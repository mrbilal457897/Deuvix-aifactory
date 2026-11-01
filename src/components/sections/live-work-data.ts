/**
 * Data for the "Our live Work" showcase section (LiveWork.tsx).
 *
 * Everything the section renders — copy, stats, tags, device-screen content,
 * floating chip and the two CTA URLs — lives here so a project can be swapped
 * or added without touching the component. The screen/chip content is a
 * miniature of the live DEUX home page rendered inside the CSS device frames.
 */

export interface LiveWorkStat {
  value: string;
  label: string;
}

export interface LiveWorkStripItem {
  value: string;
  label: string;
}

export interface LiveWorkScreen {
  /** URL shown in the macOS window bar of the laptop mock. */
  url: string;
  /** Hero badge text (rendered with a leading dot). */
  badge: string;
  /** Mini-site H1 — plain text, never highlighted. */
  h1: string;
  /** Mini-site hero paragraph. */
  paragraph: string;
  /** e.g. "FTE-004 / Outbound" */
  agentCode: string;
  /** Agent card title inside the mini site. */
  agentTitle: string;
  /** Big accent number in the agent card. */
  bigNumber: string;
  /** Mono caption under the big number. */
  bigCaption: string;
  /** Bottom stats strip of the mini site. */
  strip: LiveWorkStripItem[];
}

export interface LiveWorkChip {
  title: string;
  sub: string;
}

export interface LiveWorkProject {
  id: string;
  /** Short pager label, e.g. "01 Outbound". */
  pager: string;
  /** Full project name shown as the small mono label in the left column. */
  name: string;
  description: string;
  stats: LiveWorkStat[];
  tags: string[];
  liveUrl: string;
  caseStudyUrl: string;
  screen: LiveWorkScreen;
  chip: LiveWorkChip;
}

/** Shared mini-site stats strip (mirrors the real DEUX home page). */
const defaultStrip: LiveWorkStripItem[] = [
  { value: "168h", label: "FTE uptime" },
  { value: "85%", label: "Cost savings" },
  { value: "4x", label: "More output" },
];

const SITE_URL = "https://deux-aicompany.vercel.app";

export const liveWorkProjects: LiveWorkProject[] = [
  {
    id: "outbound-qualification-agent",
    pager: "01 Outbound",
    name: "Outbound Qualification Agent",
    description:
      "Screens inbound leads, books qualified calls and logs every touch to CRM, with zero downtime since deployment.",
    stats: [
      { value: "7 days", label: "To go live" },
      { value: "312", label: "Leads per wk" },
      { value: "68%", label: "Qualified" },
    ],
    tags: ["Sales Ops", "CRM", "Agents"],
    liveUrl: SITE_URL,
    caseStudyUrl: "/projects",
    screen: {
      url: "deux-aicompany.vercel.app",
      badge: "Now accepting clients",
      h1: "Build your AI workforce, unit by unit.",
      paragraph:
        "We design, manufacture and deploy Digital FTEs — AI workers built to run production lines, not demos.",
      agentCode: "FTE-004 / Outbound",
      agentTitle: "Outbound Qualification Agent",
      bigNumber: "312",
      bigCaption: "Leads handled this week",
      strip: defaultStrip,
    },
    chip: {
      title: "Call booked: Tue 3:00 PM",
      sub: "FTE-004 · just now",
    },
  },
  {
    id: "voice-support-agent",
    pager: "02 Voice",
    name: "Voice Support Agent",
    description:
      "Answers calls in Urdu and English, resolves routine issues instantly and hands the rest to a human with full context.",
    stats: [
      { value: "85%", label: "Cost saved" },
      { value: "81%", label: "Resolved" },
      { value: "12s", label: "Answer time" },
    ],
    tags: ["Voice", "Support", "Realtime"],
    liveUrl: SITE_URL,
    caseStudyUrl: "/projects",
    screen: {
      url: "deux-aicompany.vercel.app",
      badge: "Voice agents",
      h1: "Never miss a call again.",
      paragraph:
        "Voice FTEs that pick up on the first ring, in Urdu and English, and hand off with full context.",
      agentCode: "FTE-007 / Voice",
      agentTitle: "Voice Support Agent",
      bigNumber: "81%",
      bigCaption: "Calls resolved on first try",
      strip: defaultStrip,
    },
    chip: {
      title: "Call resolved in 41s",
      sub: "FTE-007 · just now",
    },
  },
  {
    id: "ops-loop-agent",
    pager: "03 Ops",
    name: "Ops Loop Agent",
    description:
      "Watches your pipelines around the clock, repairs failing jobs and reports every change before your team wakes up.",
    stats: [
      { value: "99%+", label: "Consistency" },
      { value: "846", label: "Jobs/day" },
      { value: "97%", label: "Auto-fixed" },
    ],
    tags: ["Loop Eng", "DevOps", "Automation"],
    liveUrl: SITE_URL,
    caseStudyUrl: "/projects",
    screen: {
      url: "deux-aicompany.vercel.app",
      badge: "Loop Engineering",
      h1: "Fix it before they notice.",
      paragraph:
        "Loop engineers that watch every pipeline, repair the failure and file the report before standup.",
      agentCode: "FTE-011 / Ops",
      agentTitle: "Ops Loop Agent",
      bigNumber: "97%",
      bigCaption: "Failures fixed automatically",
      strip: defaultStrip,
    },
    chip: {
      title: "Failed job repaired",
      sub: "FTE-011 · just now",
    },
  },
];
