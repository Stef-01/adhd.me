// `/llms.txt`, served from the register rather than committed as a file.
//
// A static `public/llms.txt` would be the obvious way to do this and is the wrong one: it is a
// hand-maintained copy of the site map, and the whole point of `src/seo/llms.ts` is that there
// isn't one. Generating it here means the file is rebuilt from `SEO_PAGES` and the hidden-route
// register on every deploy, so it cannot outlive a page it names.
import { llmsTxt } from "@/seo/llms";
import { SITE_URL } from "../site";

export const dynamic = "force-static";

export function GET(): Response {
  return new Response(llmsTxt(SITE_URL), {
    headers: {
      // `text/plain` is what llmstxt.org specifies and what every fetcher expects; the charset is
      // explicit because the copy contains em dashes and a model reading mojibake reads nonsense.
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
