// `/llms-full.txt` — the long form, same derivation as `/llms.txt`.
import { llmsFullTxt } from "@/seo/llms";
import { SITE_URL } from "../site";

export const dynamic = "force-static";

export function GET(): Response {
  return new Response(llmsFullTxt(SITE_URL), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
