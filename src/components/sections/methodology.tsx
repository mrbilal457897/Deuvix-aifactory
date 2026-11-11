const steps = [
  {
    numeral: "01",
    phase: "10%",
    owner: "Human — set direction",
    title: "Decide what good looks like",
    body:
      "Brief, specification, edge cases and where the human gate sits. If nobody can write down the definition of done, nobody can hold the machine to it.",
  },
  {
    numeral: "02",
    phase: "80%",
    owner: "AI — executes",
    title: "Carry the middle of the work",
    body:
      "The worker drafts, builds, triages, monitors and reports. This is the part of the job your calendar is full of — and the part that should stop depending on it.",
  },
  {
    numeral: "03",
    phase: "10%",
    owner: "Human — judge the outcome",
    title: "Own the call",
    body:
      "Evaluation, approval and accountability. The machine never signs off on its own work — that decision stays with the person answerable for the result.",
  },
] as const;

export function MethodologySection() {
  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-background" aria-labelledby="methodology-title">
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-secondary mb-4">
          Our methodology
        </p>
        <h2 id="methodology-title" className="font-heading h2-lg text-foreground max-w-4xl">
          The 10-80-10 pattern behind every engagement.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Not autonomy for its own sake. A relay — people decide, the worker carries the middle, people
          review — so the work happens on schedule without anyone on your team babysitting it.
        </p>

        {/* three editorial steps separated by thin rules */}
        <ol className="mt-12 grid grid-cols-1 md:grid-cols-3 border-t border-border">
          {steps.map((s) => (
            <li
              key={s.numeral}
              className="flex flex-col gap-3 py-8 md:px-8 md:py-10 border-b border-border md:border-b-0 md:border-l md:first:border-l-0"
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-heading text-5xl font-light text-foreground/90 leading-none" aria-hidden="true">
                  {s.numeral}
                </span>
                <span className="font-mono text-xs tracking-[0.2em] text-secondary">{s.phase}</span>
              </div>
              <p className="text-[12px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">
                {s.owner}
              </p>
              <h3 className="font-heading text-xl font-semibold text-foreground">{s.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>

        {/* general agent vs deployed AI Worker */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-px bg-border border border-border">
          <div className="bg-card p-6 sm:p-8">
            <h3 className="font-heading text-lg font-semibold text-foreground">
              What a general agent does for you
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              It rides along in your workflow and drafts, summarises and answers. You stay the bottleneck:
              task in, review, task out. Useful, but the work still waits for you.
            </p>
          </div>
          <div className="bg-card p-6 sm:p-8">
            <h3 className="font-heading text-lg font-semibold text-foreground">
              What a deployed AI Worker does for the job
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              It owns an outcome end-to-end inside your process — the tools, the gates, the monitoring.
              You review the work on arrival, not every step along the way.
            </p>
          </div>
        </div>

        <p className="mt-6 text-base text-foreground">
          Digital FTE and AI Worker mean the same thing: an AI that does a real job under human oversight.
        </p>

        {/* tools + credit removed at the owner's request */}
      </div>
    </section>
  );
}
