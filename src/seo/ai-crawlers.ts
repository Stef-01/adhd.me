// The AI crawlers, named — and the posture toward each one, decided rather than defaulted.
//
// `app/robots.ts` had one rule, `User-agent: *`, which allowed every AI crawler by silence. That
// is not the same as allowing them: a silence is what a file has before anybody has thought about
// the question, and the question here has two different answers depending on what the bot does.
//
//   A RETRIEVAL bot fetches a page because somebody is asking a question right now, and cites what
//   it fetched. Blocking one does not protect anything — the page is already public — it only
//   removes this product from the answer a person is being given about ADHD care in Australia,
//   which is precisely the moment it would be useful. All of them are allowed.
//
//   A TRAINING-CORPUS bot fetches the whole site to bulk it into a dataset. There is no citation
//   at the end of that and no reader on the other side of it, so the trade the retrieval bots
//   offer is not on the table. CCBot is the one that names itself honestly, and it is disallowed.
//
// THE HIDDEN SET IS HIDDEN FROM ALL OF THEM, and that is the reason this register exists as data
// rather than as three lines in `robots.ts`. `src/security/robots.ts` holds the routes this
// deployment does not publish — the finder itself among them, because the founder's posture is
// that it is for testing. A per-bot rule that forgot to repeat that disallow would quietly hand an
// AI crawler what the wildcard rule refuses, and it would be invisible: `robots.txt` would still
// look correct at a glance, because the wildcard block above would still say the right thing.
// So the disallow list is built once and every rule gets it.

export type CrawlerPurpose =
  /** Fetches to answer a question now, and cites the source. The trade is worth taking. */
  | "retrieval"
  /** Fetches to build a training corpus. No citation, no reader, nothing offered back. */
  | "training";

export interface AiCrawler {
  /** The `User-agent` token, exactly as the operator publishes it. */
  readonly agent: string;
  /** The product a reader would recognise. */
  readonly product: string;
  readonly purpose: CrawlerPurpose;
  /** Why this posture, in a sentence somebody can disagree with. */
  readonly why: string;
}

export const AI_CRAWLERS: readonly AiCrawler[] = [
  {
    agent: "GPTBot",
    product: "OpenAI — ChatGPT search",
    purpose: "retrieval",
    why: "The largest single source of AI answers to health-navigation questions. A person asking ChatGPT how to get assessed for ADHD in Australia is the exact reader this product is for.",
  },
  {
    agent: "ChatGPT-User",
    product: "OpenAI — ChatGPT browsing on a person's behalf",
    purpose: "retrieval",
    why: "Fetches a page because a person in a conversation asked for it. Blocking it blocks a reader who has already decided to look here.",
  },
  {
    agent: "OAI-SearchBot",
    product: "OpenAI — ChatGPT search index",
    purpose: "retrieval",
    why: "The indexing half of the same product as GPTBot; blocking it while allowing GPTBot would be an incoherent posture rather than a narrower one.",
  },
  {
    agent: "ClaudeBot",
    product: "Anthropic — Claude with web search",
    purpose: "retrieval",
    why: "Same trade as GPTBot: it cites what it fetched, so being readable is the whole of being citable.",
  },
  {
    agent: "Claude-User",
    product: "Anthropic — Claude browsing on a person's behalf",
    purpose: "retrieval",
    why: "A person's own fetch, made through an assistant. Refusing it refuses them.",
  },
  {
    agent: "PerplexityBot",
    product: "Perplexity",
    purpose: "retrieval",
    why: "Always shows its sources with links, which makes it the platform where a citation most directly returns a reader.",
  },
  {
    agent: "Google-Extended",
    product: "Google — Gemini and AI Overviews grounding",
    purpose: "retrieval",
    why: "Controls Gemini grounding only; it does not affect ordinary Google Search indexing either way, so the decision here is exactly the AI-answer one and nothing else.",
  },
  {
    agent: "Applebot-Extended",
    product: "Apple Intelligence",
    purpose: "retrieval",
    why: "The same distinction Apple draws itself: `Applebot` indexes for Siri and Spotlight, and this token governs the generative layer on top.",
  },
  {
    agent: "CCBot",
    product: "Common Crawl",
    purpose: "training",
    why: "A bulk corpus with no reader at the end of it and no citation back. The retrieval bots are allowed because they hand a person the source; this one offers nothing in that trade, so it is the one that is refused.",
  },
];

/** The bots a robots.txt should name, split by what they are for. */
export function crawlersFor(purpose: CrawlerPurpose): readonly AiCrawler[] {
  return AI_CRAWLERS.filter((crawler) => crawler.purpose === purpose);
}
