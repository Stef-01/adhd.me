import { notFound } from "next/navigation";

// Mock introspection routes disclose signed tokens and reset shared state — they
// exist only for the synthetic phase's e2e suite. They serve outside production,
// or in a production build only when explicitly opted in (the e2e runs a prod
// build). A real deployment sets neither, so the routes 404 and can never leak.
export function mockRoutesEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.CAREYIELD_ENABLE_MOCK_ROUTES === "1";
}

export function assertMockRoutesEnabled(): void {
  if (!mockRoutesEnabled()) notFound();
}
