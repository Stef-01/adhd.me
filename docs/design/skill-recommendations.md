# Skill recommendations: review record

The recommendation card shows one declared skill and one practitioner, with a compact portrait pop-out and a stable `/practitioner/[id]` profile route. The full profile uses the existing booking handoff. Synthetic demo entries retain their synthetic data and booking boundaries; the repeated Example badge has been removed from finder result names.

## Data flow

`readModel` joins the device's Lives profile at read time. It never copies that profile into the model record. Explicit game/character recognition and selected goals now feed `deriveNeeds`, alongside existing module resonance, personalisation answers, confirmed interpretations and completed self-report surveys. The latest response wins; a withdrawn recognition disappears on the next read. Same-tab changes notify mounted recommendation surfaces, and storage events synchronize other tabs.

Gameplay scores, timing, missed targets, fictional choices, knowledge-quiz accuracy and module completion are not diagnostic evidence and cannot create a personal deficit. Recognition has no invented severity value. Strategy completion means trying; only the person's useful/not useful response supplies an outcome. Module choices are now stored by block index so later choices do not overwrite earlier ones. Configurations and reflections stay device-local; no new analytics payload or patient-text URL is introduced.

## Matching

Saved access, language, profession, location and cultural-care filters narrow the roster before matching. A card requires a primary declared expertise tag; contributor matches can strengthen an existing primary fit but cannot substitute an unrelated specialty. The returned result retains the subdomain, evidence sources and whether the suggestion follows personal answers or only the current practice topic. No match produces no named recommendation. Ties use contextual fit, accountability preference, real-roster status, an available portrait and stable identifier order. Missing portraits use initials; likenesses are not fabricated.

## Review limits

This is a device-local demonstration of skill navigation, not a clinical assessment or a verified provider-availability service. Existing directory declarations remain the source for expertise. Clinical review, real provider onboarding and patient play testing remain necessary before making claims about accuracy, efficacy or production care delivery. No new diagnostic thresholds or treatment claims were added.

## Validation

274 model/support/Lives tests passed. Production compilation and type checking passed. The initial text audit measured 81 screens, with all 67 app screens within their ceilings; populated Support used 47 words. Browser checks cover phone and desktop, dialog accessibility, Escape/focus restoration, exact-profile navigation/reload and retraction of learning evidence. All nine recommendation browser tests passed across Chromium, Firefox and WebKit after removing backdrop click dismissal that could close the opening dialog on mobile WebKit. Close and Escape remain available. Phone and desktop screenshots were inspected.
