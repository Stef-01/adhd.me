// U2 (O228): the process environment read in one place, and the production posture asserted at
// boot.
//
// Before this unit the tree read `process.env` in fourteen places and every read degraded
// silently: a production deployment with no signing secret found out on the first sign-in, a
// deployment with the mock routes left on found out never. The plan's §1 measured it (P2, "hard-
// coded origin and silent env"); this module answers the second half.
//
// `readEnv` is the one function that reads the posture keys — the signing secret and the three
// flags that open synthetic-phase surfaces — so the guards (`secret.ts`, `mock-guard.ts`,
// `demo-guard.ts`) share a single reading of each. It takes the source as a parameter so a test can
// hand it a fixture instead of mutating `process.env`, and it reads on every call rather than
// memoising, because the guards' own tests set `NODE_ENV` per test and a value cached at import
// would make every one of them vacuous. Every other read in the tree (a store path, a public GA
// id, Playwright's port) stays where it is and is inventoried by `.env.example`, which
// `env.test.ts` holds to the tree in both directions.
//
// THE POSTURE ASSERTION distinguishes a production BUILD from a production DEPLOYMENT, and the
// distinction is load-bearing. The e2e suite runs `next start` on a production build with
// `ADHDME_ENABLE_MOCK_ROUTES=1`, deliberately (`mock-guard.ts` says so); a rule that refused every
// production build with a flag on would refuse the gate. So: a production build without a signing
// secret is refused anywhere (it could only sign with the committed synthetic secret); the flags
// are refused where `VERCEL_ENV` says this process is the production deployment, which no local
// `next start` ever is. `next build` prerenders pages with `NODE_ENV=production` set and no secret
// configured, and `NEXT_PHASE` names that phase, so the assertion stands aside for it — the
// server that serves the build is what must be sound, not the process that wrote it.

export interface Env {
  /** `NODE_ENV === "production"`: a production build, whether served locally or deployed. */
  readonly production: boolean;
  /** `VERCEL_ENV === "production"`: THE deployment visitors reach. Never true under `next start`. */
  readonly deployedProduction: boolean;
  /** `next build` is running; nothing is being served. */
  readonly building: boolean;
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
    deployedProduction: source.VERCEL_ENV === "production",
    building: source.NEXT_PHASE === "phase-production-build",
    tokenSecret: source.ADHDME_TOKEN_SECRET || undefined,
    mockRoutesOptedIn: source.ADHDME_ENABLE_MOCK_ROUTES === "1",
    demoOptedIn: source.ADHDME_ENABLE_DEMO === "1",
  };
}

/** The reasons a production process may not serve, in the order a reader would want them. */
export function postureFaults(env: Env): string[] {
  if (!env.production || env.building) return [];
  const faults: string[] = [];
  if (!env.tokenSecret) faults.push("ADHDME_TOKEN_SECRET is not set: a production build may not sign with the synthetic-phase secret");
  if (env.deployedProduction && env.mockRoutesOptedIn) {
    faults.push("ADHDME_ENABLE_MOCK_ROUTES=1 on the production deployment: the mock routes disclose signed tokens and reset shared state");
  }
  if (env.deployedProduction && env.demoOptedIn) {
    faults.push("ADHDME_ENABLE_DEMO=1 on the production deployment: /demo is an unauthenticated owner-session endpoint");
  }
  return faults;
}

/**
 * Refuse to serve a production process whose environment is unsound. Called once from
 * `instrumentation.ts` when the server starts: Next fails the instrumentation hook, logs the
 * reasons at the top of the boot log and answers every request with a 500 until the environment
 * is repaired, so the failure is the boot, not the first sign-in.
 */
export function assertProductionPosture(env: Env = readEnv()): void {
  const faults = postureFaults(env);
  if (faults.length > 0) throw new Error(`production posture refused:\n  - ${faults.join("\n  - ")}`);
}
