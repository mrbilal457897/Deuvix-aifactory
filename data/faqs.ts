/** Editable FAQ copy — also the single source for the FAQPage JSON-LD. */
export interface Faq {
  q: string;
  a: string;
}

export const faqs: Faq[] = [
  {
    q: "What is a Digital FTE?",
    a: "A Digital FTE (also called an AI Worker) is an AI that does a real job inside your process, such as triaging requests, drafting, monitoring or reporting, under human oversight. It is not a general chatbot. It owns an outcome from start to finish.",
  },
  {
    q: "Will AI make decisions without my team’s approval?",
    a: "No. We follow a 10-80-10 pattern: your team sets the direction, the AI carries out the middle of the work, and a person reviews and approves the outcome. The AI never signs off on its own work.",
  },
  {
    q: "What kind of work can you automate?",
    a: "Customer support chatbots, voice agents, operations workflows, internal tools and custom agents. If you are unsure, book a call and we will tell you honestly whether AI is a good fit for your process.",
  },
  {
    q: "How does the process work, and how long does it take?",
    a: "We follow four steps: Manufacture, Package, Deploy and Monetize. We start with a short discovery call, agree on a specification, then build and launch. Timelines depend on the scope, and we confirm a clear schedule after discovery.",
  },
  {
    q: "Is my business data safe?",
    a: "Your data is only used for your project and is accessed only by the people who need it. We confirm where it is stored, who can access it and whether it is used to train models before we start work.",
  },
  {
    q: "How much does it cost?",
    a: "Pricing depends on the scope. Book a free call and we will give you a clear estimate. Compared to a full-time hire, clients can save up to 85%.",
  },
  {
    q: "What happens after launch? Do you provide support?",
    a: "Yes. We monitor the worker, fix issues and improve it over time, so it keeps doing its job as your process changes.",
  },
];
