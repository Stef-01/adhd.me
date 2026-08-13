import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // Vitest's 5s default is a poor fit for this suite. Several tests build the full
    // 12k-patient sim, which takes 1–4s idle and more on a loaded box, so they sit right
    // on the line: three separate sessions have each chased the same false failure
    // (dna, fleet, weekly, dashboard-data) and pinned a per-test timeout after the gate
    // went red on an unchanged tree.
    //
    // A timeout is a hang guard, not a performance assertion — the tests that actually
    // budget time (W48's fleet run) assert their own numbers inside the test body, so
    // raising this removes no real check. 30s still catches a genuine hang quickly.
    testTimeout: 30_000,
  },
});
