# Product

<!-- impeccable:product-schema 1 -->

> Working product record inferred from the repository's README, compliance rules, route copy,
> and founder-authored build law. Founder review remains required for the open decisions below.

## Platform

web

## Users

- People in Australia looking for an accessible GP pathway for ADHD assessment, often on a phone
  and often while tired, uncertain, or overwhelmed. Their primary job is to describe what matters
  to them and find a reachable practice without decoding clinical or directory language.
- Practice teams use the console on desktop during a working day to understand referral demand,
  shared-care workflows, registers, responses, and reporting.

## Product Purpose

ADHD.ME helps a person describe the kind of care they are looking for and orders an available GP
roster around those words, including care area, language, and physical reach. The practice-facing
side supports the demand-matching and shared-care work behind that pathway. Success means a person
can understand the offer, complete the finder, and leave with a clear next action without the
product presenting medical advice or unsupported claims.

## Positioning

The product is a guided finder rather than a public ratings directory: it translates a person's
own words into an explainable roster order, and describes clinicians through their declarations
rather than through platform-authored characterisations.

## Operating Context

- Patient surfaces are primarily mobile and may be used at night or under cognitive load.
- The finder is a staged, single-idea flow with voice and typed-input paths and a narrow shared
  shell across welcome, listening, review, preference, comparison, result, and booking stages.
- Practice-console surfaces are primarily desktop workflows used mid-shift and favour scanning,
  clear state, and reliable controls over expression.
- Public pages explain the product, founder story, practice offer, examples, FAQs, privacy, and
  terms; the finder and practice console must remain visibly part of the same product.

## Capabilities and Constraints

- Preserve the existing Next.js 15 / React 19 stack, matching engine, route structure, server
  actions, synthetic fixtures, tests, Vercel deployment configuration, and production gate.
- Synthetic patient and referral data only. Do not add production credentials, live SMS, symptom-
  based triage, medical advice, testimonials, ratings, or unsupported clinical/commercial claims.
- Patient copy may discuss scheduling, preferences, and declared scope but may not imply urgency,
  deterioration, diagnosis, guaranteed benefit, or a platform endorsement.
- The fixed finder shell is a cross-stage constraint; responsive changes must work across every
  stage and use container-aware rules where internal width matters.
- Every touch target is at least 44px, focus remains visible, reduced motion is honoured, and the
  existing WCAG 2.1 AA sweep remains green.
- Open founder decisions: Ahpra review of the product name; confirmation of Dr Saxena's listing and
  founder disclosure; source confirmation for indicative public figures; verification of external
  learning links; provision/approval of real founder portraits; and whether `/clinicians` should
  publish clinical guidance to GPs at all. All six are indexed with their in-tree anchors in
  README.md §"What needs a founder decision before this goes live", which is the single list.
  None is resolved, and none may be resolved here.

## Brand Commitments

- Keep the name ADHD.ME and its direct, calm Australian English voice unless the founder changes it.
- Keep the existing real founder and partner assets; never generate a face for a real person.
- Language stays specific, plain, sentence-case, and free of hype. The product should feel useful
  before it feels promotional.
- ADHD.ME is finder-first. Do not reintroduce the removed public clinician-network experience or
  the old cross-repository launcher.

## Evidence on Hand

- Real product and compliance copy in `app/` and `src/compliance/`.
- A synthetic clinician roster and worked examples in `src/demo/`.
- Existing founder and partner imagery in `public/`, plus explicit provenance and disclosure flags.
- Historical design captures and QA records in `design/` and `qa/` (`docs/DESIGN-QA.md` was deleted
  on 2026-09-03; `AESTHETIC.md` is the live design checklist).
- No approved founder portrait set, patient testimonials, ratings, verified customer claims, or
  independently confirmed outcome figures may be fabricated for the redesign.

## Product Principles

1. Start with the person's words, then show how those words affected the order.
2. Reduce cognitive load by presenting one consequential decision at a time.
3. Make provenance, uncertainty, and conflicts visible instead of manufacturing confidence.
4. Keep patient choice and a clear way out available at every step.
5. Let the practice console be calm, dense where useful, and operationally explicit.

## Accessibility & Inclusion

Design for tired, older, low-vision, keyboard, touch, voice, and reduced-motion users. Maintain
WCAG 2.1 AA contrast, semantic landmarks, a skip link, plain-language errors, and resilient layouts
at mobile and desktop widths. Language and reach preferences are product data, not decoration.
