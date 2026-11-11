/**
 * Full bodies of the six launch posts, transcribed from
 * "Deuvix AI Factory: Blog Content (6 Drafts).md" with editorial TODO markers kept visible.
 * Keep the TODO comments in code; they are tracked in the post summary.
 */

export const bodies: Record<string, string> = {
  "loop-engineering": `A prompt is a request. You type it, the model answers, and the work stops the moment you stop typing. A loop is different: it starts the work, checks it, records the result, and repeats on its own. That shift, from asking to designing, is what we call Loop Engineering.

### Why prompting hits a ceiling

Prompting is a one-shot skill. Every run starts from nothing, depends on you being present, and leaves no memory behind. That is fine for a quick answer. It breaks the moment you need the same job done every morning, across many tasks, without someone watching.

### The six parts of a loop

1. **Heartbeat.** A schedule or an event that starts each beat. Without it you have one run, not a loop.
2. **Worktree.** Isolation, so parallel agents never overwrite each other. One checkout per task.
3. **Skill.** Project knowledge written down once, so no run starts from zero. In practice this is a plain-text SKILL.md file the agent loads and follows.
4. **Subagents.** The maker-checker split. The agent that builds is never the agent that grades.
5. **Connector (MCP).** The link to your real tools, such as pull requests, tickets and databases, so the loop acts instead of only suggesting. MCP is the standard way an agent plugs into outside tools and data.
6. **Spine.** State and memory between runs. The model forgets everything between runs; the repository does not.

### The seventh part: the human gate

A loop never removes judgment. It removes typing. Every risky call, such as sending money, deleting data or messaging a customer, comes back to a person for approval. No spine, no loop. No human gate, no trust.

### A simple example

Imagine a support-ticket triage loop. Each morning the heartbeat starts a run. A skill describes how your team categorises tickets. One subagent drafts the category and reply; a second subagent checks the draft against the skill. The connector reads and updates your ticket system. The spine records what was decided. Anything involving a refund waits at the human gate. You read a short summary instead of 200 tickets.

### How to start

Pick one repetitive workflow you already understand. Write the skill first. Add a checker before you add speed. Put the gate on anything you could not undo. Then let it run for a week and read what it did.

**Further reading.** Loop Engineering is also covered as a crash course in Panaversity’s open AI Agent Factory book, a good companion to this post.

Want a loop built for your business? Talk to us — an engineer replies within one business day.
`,

  "building-digital-fte": `"FTE" is the HR term for full-time equivalent: one employee's worth of work. A Digital FTE, also called an AI Worker, is an AI that does a real job rather than just answering questions. You tell it what to do, it does the work, and a human still signs off.

### What makes a Digital FTE different from a chatbot

A chatbot answers. A Digital FTE owns a task from start to finish, uses the same tools your team uses, checks its own work and hands back something you can trust. It combines four things:

- **Structured specifications:** a clear definition of what the worker must do.
- **Domain expertise:** the knowledge that guides its decisions.
- **Engineering architecture:** the infrastructure that keeps it reliable.
- **Human oversight:** the feedback loop that keeps it accountable.

Take any one away and you are back to a demo.

### The four steps: Manufacture, Package, Deploy, Monetize

1. **Manufacture.** Use AI coding agents to turn your domain knowledge into a working agent, starting from a written specification rather than a vague prompt.
2. **Package.** Bundle the agent into a production-ready worker using an agent SDK, with its instructions captured in SKILL.md files so they are portable and reviewable.
3. **Deploy.** Launch it where the work happens: your website, your inbox, your phone line or your internal tools. Because it runs on software, it can work around the clock.
4. **Monetize.** Decide how the worker earns: as a managed subscription, a success fee or an enterprise licence. (We cover these in a separate post.)

### Picking the first role

Start with work that is repetitive, rules-based and measurable: lead qualification, ticket triage, report drafting, appointment booking. Avoid anything where a single mistake is catastrophic until you have a track record.

### Common mistakes

- Skipping the specification and prompting your way into a fragile prototype.
- Letting the same agent build and check its own work.
- Forgetting the human gate on irreversible actions.
- Measuring activity instead of outcomes.

### What it costs

Costs depend on the workflow, the volume and how much human review you keep. That is why every Deuvix plan is scoped to your workflow and quoted for your scope. *[TODO: add one real client example with measured results here.]*

Ready to hire your first Digital FTE? Book a free consultation.
`,

  "fde-practices": `Most companies are starting AI projects. Far fewer are getting value from them. Panaversity's AI Agent Factory book cites research from MIT (2025) suggesting that about 95 percent of custom enterprise AI pilots show no measurable financial return. The cause is rarely the model. It is that nobody fits the model into the company's real data, rules, approvals and people.

That distance is the deployment gap, and the person who closes it is the Forward Deployed Engineer.

### What an FDE actually does

An FDE works inside your organisation and builds your AI workforce end to end. In practice that means:

1. **Listening first.** Interviewing the people who do the work and reading real tickets and documents.
2. **Writing the spec.** Turning that domain knowledge into an executable specification both humans and AI can follow.
3. **Building and packaging.** Creating AI workers, connectors and skills that fit your systems.
4. **Deploying with oversight.** Launching with human gates, monitoring and a clear rollback.
5. **Handing over.** Leaving your team with documentation and the ability to run it.

### Why vendor-neutral matters

A vendor's consultant naturally recommends the vendor's product. A vendor-neutral FDE recommends what fits. Models change, pricing changes, access changes. A method built on specifications, skills and human oversight survives all of that, because it is portable by design. Skills written for one coding agent can work in another.

### Spec-driven development in one paragraph

Write down what the work is, what good looks like and where a human must decide. Then let AI build to that document. When something is wrong, you fix the spec, not the symptoms.

### Is an FDE right for you?

It fits if you have a clear, repeated workflow, systems the AI must connect to, and a need for results rather than slides. It is overkill if you only want a simple chatbot, which we can also deploy quickly.

*[TODO: state clearly how Deuvix delivers: on-site, remote or hybrid.]*

Talk to an FDE about your workflow. Book a free consultation.
`,

  "monetize-ai-agents": `Building an AI agent is a skill. Earning from it is a separate one. Here are four models we see working, and when each fits.

### Managed subscription

You run the Digital FTE for a client and charge a monthly fee. **Best when** the work is continuous, such as support, lead handling or reporting. **Watch for** model and usage costs; price with headroom.

### Success fee

You are paid when the agent delivers a measurable result, such as a booked meeting, a recovered invoice or a resolved ticket. **Best when** outcomes are easy to count and the client wants low upfront risk. **Watch for** disputes over attribution; agree on the definition of “success” in writing.

### Enterprise licence

A larger organisation licenses your agent or system for internal use, often with support and compliance terms. **Best when** the buyer has strict security needs. **Watch for** long sales cycles and the need for proper documentation.

### Engagement and retainer

You are paid to design and deploy the system, then retained to improve it. **Best when** you are starting out and need cash flow while you learn what clients value. **Watch for** trading hours for money; move toward reusable products over time.

### How to choose

| Situation | Start with |
| --- | --- |
| Continuous, repeatable work | Managed subscription |
| Clear, countable outcomes | Success fee |
| Large, regulated buyer | Enterprise licence |
| New and building a track record | Engagement and retainer |

Most successful teams combine two: a setup engagement that proves value, then a subscription that keeps it running.

### The thread that connects them

What you sell is not the model. Models get cheaper and more alike. What clients pay for is your specification, your domain knowledge and the trust that the work is checked by a human. Build assets in those areas and every model above becomes easier to sell.

Not sure which model fits your idea? Book a free consultation.
`,

  "ai-native-development": `Two companies can both say they "use AI" and be nothing alike. The difference is whether AI is a tool on the side or the way the work gets done.

### Three points on the spectrum

**AI-assisted.** A person does the work and AI speeds up a step: autocomplete, drafting, summarising. Remove the AI and the process still exists, just slower.

**AI-directed.** A person delegates whole jobs to a general agent and manages the result like a team lead. The person is still the doer; the AI is a powerful tool.

**AI-native.** The business is designed around AI workers that run workflows, with people setting direction and judging results. Remove the AI and the process stops.

### The 10-80-10 pattern

AI-native work follows a rhythm. Humans spend the first 10 percent setting direction: deciding what is worth doing and writing it as a specification. AI carries the middle 80 percent of execution. Humans spend the final 10 percent judging the truth: verifying, evaluating and approving. Panaversity's AI Agent Factory book teaches this as the 10-80-10 rule, and we use it in every engagement.

### Why it matters commercially

- **Speed:** assisted teams get faster at steps; native teams change what a step is.
- **Scale:** assisted work scales with headcount; native work scales with specifications.
- **Defensibility:** tools are rented and copyable; your specs, skills and domain knowledge are yours.

### A quick self-check

Ask yourself: if our AI tools disappeared tomorrow, would a workflow stop or just slow down? Who writes the specification for each AI task? Where does a human verify the output? Are our instructions written down, or only in someone's head?

### You do not have to jump straight to AI-native

Many teams do well starting by delegating one real job to a general agent, then turning the repeatable parts into a worker. Move one rung at a time.

Curious where your company sits? Book a free consultation and we will map it with you.
`,

  "spec-driven-development": `A specification is a written contract between the people who know the job and the machine that will do it. When the contract is clear, the build is boring — in the good way.

### Why specs beat prompts before you start

Prompting muddles direction with instruction: "write me this email" does not say what *this email* is for, who reads it, or what would make it wrong. A spec does. It names the outcome, the constraints, the edges and the definition of done — so both humans and agents can be held to it.

### What a good spec contains

- The job, in one sentence — who does it, how often, for whom.
- The inputs and outputs, including formats and examples of each.
- Constraints and preferences — tone, length, approvals, destinations.
- The failure cases — what happens when the input is missing or ambiguous.
- Where a human must sign off, and who that human is.

### Fix the spec, not the symptoms

When the output is wrong, the fastest loop is the spec: find the missing or ambiguous line and sharpen it. Editing prompts one run at a time is tuning the symptoms; fixing the spec is fixing the problem.

### Specs are portable

The same specification runs on Claude Code, on OpenCode, on any agent that reads a SKILL.md-style file and follows instructions. That is the whole point of writing it down: the asset outlives the tool.

Want a spec for your first workflow? Book a free consultation.
`,

  "human-vs-digital-fte": `A week has 168 hours. A typical full-time employee works about 40 of them. A Digital FTE can be available for all 168, roughly 4.2 times the hours. That does not automatically mean 4 times the output, because quality, review time and workload matter. So let's do the maths properly.

### Step 1: Count the real cost of a human

Include salary, benefits, tools, management time, training and turnover. Divide by the tasks they complete each month. This is your **cost per completed task**.

### Step 2: Count the real cost of a Digital FTE

Include build or setup, the monthly subscription or hosting, model and usage costs, and, importantly, **human review time**. The final 10 percent of the 10-80-10 pattern is part of the cost, not a footnote.

### Step 3: Compare cost per completed task

Here is a **hypothetical example**. These are illustrative numbers, not client data.

|  | Human FTE | Digital FTE |
| --- | --- | --- |
| Monthly cost (all-in) | $2,000 | $700 |
| Tasks completed per month | 800 | 1,400 |
| Cost per task | $2.50 | $0.50 |

In this example the Digital FTE costs 80 percent less per task. Change the inputs and the answer changes, which is exactly why you should run it with your own numbers.

### Step 4: Add what the spreadsheet misses

- **Availability:** work that happens at night or on weekends.
- **Consistency:** fewer missed steps on repetitive work.
- **Speed to scale:** adding capacity in days rather than months.
- **Risk:** cost of errors, and the human gates you add to control them.

### Where humans still win

Judgment, relationships and anything that depends on being genuinely seen by another person. A Digital FTE handles routine execution so your people can spend more time on the work only they can do.

### Build your own ROI case

Pick one workflow, count tasks and time for a month, then price a pilot. If the numbers do not work, you will know before you commit.

*[TODO: add one measured client result here when available.]*

Want help running the numbers on your workflow? Book a free consultation.
`,
};
