# Can the matcher target at every level advertisers do? (O23)

**The question (founder, 2026-08-18):** audit whether the matching algorithm is capable of
matching people at psychographic level, and at all the levels on the targeting slide
(demographic · geographic · behavioural · psychographic · contextual · programmatic ·
remarketing).

**The honest headline:** the matcher already works at four of the seven levels — including a
bounded, defensible form of psychographic matching that is arguably its strongest suit — and
the other three are not gaps but refusals, each anchored to a boundary this product has put in
writing. Advertising targets people by what it can INFER about them; this matcher targets
care by what people STATE about the care they want. Every level below is judged against that
line, because it is the line the TGA/Q17 dossier and the privacy posture depend on.

## Level by level

### Demographic — PARTIAL BY DESIGN
It matches on the CLINICIAN'S demographics when the patient states a preference
(`pref:woman-gp` is a first-class facet, asked by a clarifier when the roster splits on it).
It holds no demographics of the PATIENT — no age, gender, income, or family status field
exists anywhere — so it cannot segment patients, and must not: a patient demographic profile
is health-adjacent data the privacy policy promises not to hold.
**Capability gap worth building:** none on the patient side. On the clinician side, languages
and gender are done; age-band or cultural-background preferences could be added as facets the
day a clinician declares them and a patient asks.

### Geographic — YES
Typed suburb or postcode, resolved against the covered map (`src/geo/suburbs.ts`),
distance-aware reordering within score ties (`rankCliniciansNear`), and honesty when a place
is outside coverage ("we do not cover that one yet"). Device geolocation is deliberately
refused — no permission prompt, no coordinate leaves the browser — which costs nothing in
practice because a person knows their own suburb.

### Behavioural — NO, AND REFUSED
Behavioural targeting is inference from history: pages visited, queries run, dwell time.
This product keeps no per-patient history at all — the only thing in localStorage is the
privacy acknowledgement, and the automated-decisions page states publicly that the ordering
uses nothing but the current request. Building this would break a published promise for a
technique whose value is engagement, not care fit.

### Psychographic — YES, IN THE ONLY DEFENSIBLE FORM
Psychographics is values, attitudes, and lifestyle. The manner vocabulary IS a psychographic
instrument: non-judgemental, unhurried, collaborative ("decide together rather than be
told"), sense-making ("understand what is happening to me"), culturally attuned ("family and
language part of the appointment"), structured, taken-seriously. These are values-level
statements about how somebody wants to be treated, they carry real weight in the ranking
(uniform 24, lifted 1.5× when clarifier-confirmed), and O13 widened their reach to plain
names ("kind", "non judgemental"). The bright line: all of it is **stated** psychographics —
read from the person's own sentence, quotable back to them ("from your words: …") — never
**inferred** psychographics (deducing values from behaviour or symptom language), which is
the move the Q17 boundary forbids because on a health surface inference about the person is
triage.
**Capability gaps that ARE buildable within the line** (now folded into the year plan):
values vocabulary the lexicon does not yet hear — faith- or community-sensitive care
preferences, neurodiversity-affirming framing, family-involvement preferences — each added as
a cue + declarable facet pair, grown by the O22 interview loop and the Q1 reach corpus.

### Contextual — YES, WITHIN THE PRODUCT
Contextual targeting means responding to the present context rather than a stored profile.
That is this matcher's whole architecture: clause-boundary reading of the current sentence,
clarifiers chosen from what THIS roster disagrees on for THIS request, capacity and distance
read at ask time. There is no cross-site context (no ad pixels in, no audience data out), and
that absence is a privacy feature, not a to-do.

### Programmatic — NOT APPLICABLE
Programmatic is an ad-buying mechanism (real-time auctions for impressions), not a matching
capability. Its nearest in-product analogue — clinicians bidding for position — is explicitly
banned copy on the FAQ ("No GP can pay to rank higher") and would destroy the product's one
asymmetric asset, which is that the order is earned.

### Remarketing / retargeting — NO, AND REFUSED
Requires persistent identifiers and off-site tracking of people who searched for ADHD care —
health-interest data under the Privacy Act's sensitive-information handling, and precisely
the audience-building the privacy policy rules out. The compliant substitute for "come back"
already exists: the finder is stateless and free, and a person who returns retypes one
sentence.

## Scorecard

| Level | Today | Ceiling | Bound by |
|---|---|---|---|
| Demographic | Clinician-side, stated | Same, more facets | No patient profile |
| Geographic | Full (typed place) | + more suburbs | Coverage honesty |
| Behavioural | None | None | Published promise, privacy |
| Psychographic | Stated values via manner facets | Wider values vocabulary | Stated, never inferred (Q17) |
| Contextual | Full, in-product | Better clarifier policy (year plan Q3) | No cross-site context |
| Programmatic | N/A | N/A | "No GP can pay to rank higher" |
| Remarketing | None | None | Sensitive-data handling |

**Net:** the matcher is not a weaker version of an ad-targeting stack; it is a different
instrument that reaches the two levels that matter for care fit (psychographic and
contextual) more precisely than advertising does, because the person tells it the truth in
their own words. The growth path is vocabulary breadth (year plan Q1, O22 loop), not new
targeting machinery.
