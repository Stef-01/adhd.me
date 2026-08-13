// W105: the CSV export, behind the same Meherr-staff gate as the page.
//
// Gated here as well as on the page, not instead of it. A route handler is independently
// invocable — the W13 law — so a page-level check protects the link and nothing else, and this
// route is the one that streams every signup's name and email in a single request.

import { cookies } from "next/headers";
import { interestSignupsCsv } from "@/interest/store";
import { SESSION_COOKIE, verifySession } from "@/console/session";
import { isMeherrStaff } from "@/tenancy/staff";

export const dynamic = "force-dynamic";

export async function GET() {
  const jar = await cookies();
  const email = verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!email) {
    return new Response("Sign in required", { status: 401 });
  }
  if (!isMeherrStaff(email)) {
    // 403, not 404: the register's existence is already public (the community landing page
    // invites people to join it), so pretending it is not there would be theatre. What is
    // withheld is the contents.
    return new Response("This register is not available to practice accounts", { status: 403 });
  }

  return new Response(interestSignupsCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meherr-community-interest.csv"',
      "Cache-Control": "no-store",
    },
  });
}
