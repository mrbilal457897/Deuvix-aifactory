export const blogCategories = ["All", "FTE", "FDE", "AI Agents", "Company"];

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  image: string;
}

export const posts: BlogPost[] = [
  {
    slug: "loop-engineering",
    title: "Loop Engineering: The Skill That Replaced Prompting",
    excerpt:
      "Prompts start a task; loops run a system. Learn the six parts of an autonomous loop — heartbeat, worktree, skill, subagents, connector, and spine — and why the human gate is where your judgment still lives.",
    category: "AI Agents",
    author: "Bilal",
    date: "August 15",
    image: "https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    slug: "building-digital-fte",
    title: "Building Digital FTEs: Your Guide to AI Workers That Run 24/7",
    excerpt: "Learn how to manufacture, deploy, and monetize Digital FTEs — the reliable AI workers that replace human workflows at 85% cost savings.",
    category: "FTE",
    author: "Bilal",
    date: "December 12",
    image: "https://images.pexels.com/photos/8849295/pexels-photo-8849295.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    slug: "fde-practices",
    title: "Forward Deployed Engineering: The Vendor-Neutral Path to AI Success",
    excerpt: "How FDEs bridge the gap between AI theory and production reality. Spec-driven development with real-world deployment strategies.",
    category: "FDE",
    author: "Asad",
    date: "December 10",
    image: "https://images.pexels.com/photos/8439069/pexels-photo-8439069.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    slug: "monetize-ai-agents",
    title: "Four Ways to Profit from AI Agents in 2026",
    excerpt: "From FTE subscriptions to success fees and licensing — discover the business models driving AI-Native company revenue.",
    category: "AI Agents",
    author: "Bilal",
    date: "December 8",
    image: "https://images.pexels.com/photos/16380906/pexels-photo-16380906.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    slug: "ai-native-development",
    title: "AI-Native vs AI-Assisted: Why the Distinction Matters",
    excerpt: "Understanding the AI development spectrum — from Copilot helpers to full agent orchestration — and why your approach determines your competitive edge.",
    category: "AI Agents",
    author: "Asad",
    date: "December 5",
    image: "https://images.pexels.com/photos/8849287/pexels-photo-8849287.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    slug: "human-vs-digital-fte",
    title: "Human FTE vs Digital FTE: The ROI of AI Workers",
    excerpt: "A Digital FTE works 168 hours a week with zero fatigue. That's 4x the output at a fraction of the cost. Here's the math.",
    category: "FTE",
    author: "Bilal",
    date: "December 3",
    image: "https://images.pexels.com/photos/8438944/pexels-photo-8438944.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    slug: "spec-driven-development",
    title: "Spec-Driven Development: Writing Blueprints Both Humans and AI Understand",
    excerpt: "Specifications as living blueprints that drive code, tests, and documentation. The foundation of AI-Native engineering.",
    category: "FDE",
    author: "Asad",
    date: "December 1",
    image: "https://images.pexels.com/photos/8090151/pexels-photo-8090151.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((post) => post.slug === slug);
}
