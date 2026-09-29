// /api/health's shape: the build, the boot instant, the store, the reporter and the finder's journal
// (whether this deployment holds the Supabase variables, and the writes since boot). Values only;
// never the variables themselves.

import { describe, expect, it } from "vitest";
import { health } from "./health";

describe("health", () => {
  it("says the journal is not configured without both Supabase variables, and never repeats them", () => {
    const body = health(1_700_000_000_000, 10, {});
    expect(body.journal).toEqual({ configured: false, sent: 0, failed: 0, refused: 0 });
    expect(health(Date.now(), 1, { SUPABASE_URL: "https://x.supabase.co" }).journal.configured).toBe(false);
    const configured = health(Date.now(), 1, { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "service-role" });
    expect(configured.journal.configured).toBe(true);
    expect(JSON.stringify(configured)).not.toContain("service-role");
    expect(JSON.stringify(configured)).not.toContain("x.supabase.co");
  });

  it("derives the boot instant from the process's uptime", () => {
    expect(health(1_700_000_000_000, 10, {}).bootedAt).toBe(new Date(1_700_000_000_000 - 10_000).toISOString());
  });
});
