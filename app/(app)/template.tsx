import { Hydrated } from "../hydrated";
import { PageArrival } from "../page-arrival";

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  // The stamp inside the group's own boundary: it lands when the screen is interactive, not when
  // the shell around the streaming placeholder is (app/hydrated.tsx).
  return (
    <PageArrival>
      {children}
      <Hydrated />
    </PageArrival>
  );
}
