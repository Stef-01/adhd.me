// U3 (O228): the fault fixture. A page whose only purpose is to throw on request, so the e2e can
// look at the real error boundary in a real browser (`e2e/error-boundary.spec.ts`) rather than
// at a unit render of it. Behind the mock-route guard like every other `/api/mock/*` surface —
// it 404s on the production deployment — and behind its own segment, so a sweep that visits
// a made-up kind sees a 404 rather than an error. `render` is the one kind it knows.
import { notFound } from "next/navigation";
import { assertMockRoutesEnabled } from "@/lib/mock-guard";

export const dynamic = "force-dynamic";

export default async function FaultFixture({ params }: { params: Promise<{ kind: string }> }) {
  assertMockRoutesEnabled();
  const { kind } = await params;
  if (kind !== "render") notFound();
  throw new Error("fault fixture: the render error /api/mock/fault/render exists to raise");
}
