// AR4: regenerate `docs/AESTHETIC-COVERAGE.md` from the taste register — never edit that file
// by hand. Run with Node's native type stripping, same convention as `audit-gate.mts` (W53): the
// whole import graph below is extension-explicit so Node's ESM resolver can load it without a
// bundler. `generateCoverageDoc` (src/design/taste-coverage-doc.ts) does the actual rendering and
// is unit-tested there against a checked-in copy of this file's own output; this script only
// calls it and writes the result.

import { writeFileSync } from "node:fs";
import { generateCoverageDoc } from "../src/design/taste-coverage-doc.ts";

writeFileSync("docs/AESTHETIC-COVERAGE.md", generateCoverageDoc());
console.log("docs/AESTHETIC-COVERAGE.md regenerated from src/design/taste-register.ts");
