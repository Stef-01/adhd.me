import { notFound } from "next/navigation";
import { readEnv } from "./env";

// W37: the demo surface signs visitors in as the demo-practice owner and reseeds
// every mock store — deliberately, for presentations. In production that is an
// unauthenticated owner-session + state-reset endpoint, so it fails CLOSED unless
// a deployment explicitly opts in (same posture as the mock introspection routes).
// U2: read through `env.ts`; the production deployment refuses to serve with the flag on.
export function demoEnabled(): boolean {
  const env = readEnv();
  return !env.production || env.demoOptedIn;
}

export function assertDemoEnabled(): void {
  if (!demoEnabled()) notFound();
}
