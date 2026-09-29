import { notFound } from "next/navigation";
import { readEnv } from "./env";

// W37: the demo surface signs visitors in as the demo-practice owner and reseeds
// every mock store — deliberately, for presentations. In production that is an
// unauthenticated owner-session + state-reset endpoint, so it fails CLOSED unless
// a deployment explicitly opts in (same posture as the mock introspection routes).
// Read through `env.ts`. Pages that point at /demo ask this first, so a production deployment
// without the flag shows no way into a page that would answer 404.
export function demoEnabled(): boolean {
  const env = readEnv();
  return !env.production || env.demoOptedIn;
}

export function assertDemoEnabled(): void {
  if (!demoEnabled()) notFound();
}
