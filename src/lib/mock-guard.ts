import { notFound } from "next/navigation";
import { readEnv } from "./env";

// Mock introspection routes disclose signed tokens and reset shared state — they
// exist only for the synthetic phase's e2e suite. They serve outside production,
// or in a production build only when explicitly opted in (the e2e runs a prod
// build). A real deployment sets neither, so the routes 404 and can never leak.
// U2: read through `env.ts`; the production deployment refuses to serve with the flag on.
export function mockRoutesEnabled(): boolean {
  const env = readEnv();
  return !env.production || env.mockRoutesOptedIn;
}

export function assertMockRoutesEnabled(): void {
  if (!mockRoutesEnabled()) notFound();
}
