# September 27 release evidence

Fresh clone baseline 87ad1dc4; integrated newer main through 3f3e7400 before final game checks. Preserved played-state tracking, related learning links and main's reduced duplicate instructions. Subsequently merged the isolated speech-bubble contrast fix 3fbf36e3.

- Production build compiled and TypeScript passed before and after the main integration.
- 118 model tests across nine suites passed after integration.
- 33 browser cases passed in Chromium, WebKit and Firefox before integration: Maya complete loop, all three scenarios, swipe/wait, sound, pause, reduced motion, accessibility, small/short screens, first-visit consent geometry, all eight character entries and all twenty quick-game starts.
- 11 corresponding Chromium cases passed again against the merged production build on port 3162.
- Text-budget CLI after integration measured 135 screens. All 120 app screens were within their assigned ceilings. Maya entry 17 words; arrived 10; setup 22; revisit 20; complete 22.
- Inspected actual desktop, small-phone and market screenshots. Corrected privacy-bar overlap and widened the desktop board. Added visible Wait label distinct from pause.

This evidence covers functional behaviour and presentation checks, not proof of enjoyable gameplay or clinical effectiveness. The all-games improvement roadmap remains active in SEPTEMBER-27-POLISH.md.
