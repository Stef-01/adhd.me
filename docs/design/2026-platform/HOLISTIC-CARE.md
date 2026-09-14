# Holistic and culturally responsive care matching

Implemented 14 September 2026. Care preferences are patient choices, not diagnoses. Identity, Country and clinical scope are independent declarations; none is inferred from name, portrait, language, practice address or an Acknowledgement of Country.

## Experience

- The compact saved-preferences disclosure includes clinician identity, optional Country/Nation and a selectable set of 24 care topics.
- A request such as “Aboriginal clinician who understands spiritual health and ADHD” requires both the public identity declaration and spiritual-wellbeing care declaration. Undeclared is not a match.
- Clinicians can identify as Aboriginal, Torres Strait Islander, or both. Country uses their own shared wording, not consulting location.
- University accommodations are a care focus across occupations. An OT, EP or university service is only included when the profile declares the corresponding work. Matching does not imply that an EP issues university access plans or diagnoses conditions.
- Source links accompany real care declarations. The empty state offers NACCHO's community-controlled service directory without promising a specific appointment or clinician identity.

## Real provider data required

No new real providers were fabricated or added. A fourfold expansion applies to the example roster only: 35 to 140 fictional profiles, with 16 additional scenario combinations across the existing professions. New examples self-label in their names, have no portraits, claim no appointment availability, and have no booking URL. They are excluded when examples are switched off. Demonstration Country is explicitly fictional.

For a real provider, obtain their approved public profile record and booking handoff, plus:

- Exact self-described Aboriginal and/or Torres Strait Islander identity, if voluntarily shared for publication.
- Optional Country/Nation wording they wish displayed. Never derive it from address or language.
- Declared care topics, scope, age group and any eligibility/referral conditions.
- Public source URL and date checked, plus permission or authority for publication.
- A current practice booking URL. Availability is chosen on the practice system, never generated here.

`Clinician.careProfile` stores `needs`, `source`, `declaredAt`, and optional `identity` (`identities`, `country`, `publish`). Only public, approved declarations belong in the client roster; private onboarding answers must stay server-side and must be removed before publishing. Publication flags are a UI safeguard, not an access-control boundary. Existing identity and Country records are not altered.

## Source grounding

- RACGP: social and emotional wellbeing encompasses cultural and spiritual wellbeing and connection with family, community, land and culture: https://www.racgp.org.au/clinical-resources/clinical-guidelines/key-racgp-guidelines/national-guide/the-health-of-young-people/social-and-emotional-wellbeing
- NACCHO community-controlled service directory: https://www.naccho.org.au/location/
- AADPA Aboriginal and Torres Strait Islander ADHD factsheet: https://adhdguideline.aadpa.com.au/wp-content/uploads/2022/12/ADHD-Factsheet-ADHD-in-Aboriginal-and-Torres-Strait-Islander-Peoples.pdf
- ADCET student support: https://www.adcet.edu.au/students-with-disability/current-students/supporting-your-studies

These sources inform preference design. They do not substantiate an individual provider's identity, expertise or availability, and no community co-design approval is claimed.
