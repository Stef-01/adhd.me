import { clinicians, unheldDisplayClaims } from "./src/demo/clinicians";
import { tieQualityReport } from "./src/matching/tie-quality";
console.log("unconflicted clinicians:", clinicians.filter(c => !c.disclosedInterest).length, "/", clinicians.length);
console.log("unheld display claims:", clinicians.flatMap(c => unheldDisplayClaims(c).map(t => `${c.id}:${t.preference}`)));
const r = tieQualityReport();
console.log("tie-quality:", JSON.stringify(r));
console.log("realPerson all:", clinicians.every(c => c.realPerson));
