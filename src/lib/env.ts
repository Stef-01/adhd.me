// The process environment's posture keys, read in one place: the signing secret and the flags that
// open synthetic-phase surfaces, so the guards (`secret.ts`, `mock-guard.ts`, `demo-guard.ts`) and
// the console's cookie share one reading. It takes the source as a parameter so a test can hand it
// a fixture, and reads on every call rather than memoising, because the guards' own tests set
// `NODE_ENV` per test. Every other read in the tree stays where it is and is inventoried by
// `.env.example`, which `env.test.ts` holds to the tree in both directions.

export interface Env {
  /** `NODE_ENV === "production"`: a production build, whether served locally or deployed. */
  readonly production: boolean;
  /** `ADHDME_TOKEN_SECRET`, or undefined when unset or empty. */
  readonly tokenSecret: string | undefined;
  /** `ADHDME_ENABLE_MOCK_ROUTES=1`: the e2e suite's introspection routes are opted in. */
  readonly mockRoutesOptedIn: boolean;
  /** `ADHDME_ENABLE_DEMO=1`: the presenter's reset-and-sign-in surface is opted in. */
  readonly demoOptedIn: boolean;
}

export type EnvSource = Readonly<Record<string, string | undefined>>;

export function readEnv(source: EnvSource = process.env): Env {
  return {
    production: source.NODE_ENV === "production",
    tokenSecret: source.ADHDME_TOKEN_SECRET || undefined,
    mockRoutesOptedIn: source.ADHDME_ENABLE_MOCK_ROUTES === "1",
    demoOptedIn: source.ADHDME_ENABLE_DEMO === "1",
  };
}

