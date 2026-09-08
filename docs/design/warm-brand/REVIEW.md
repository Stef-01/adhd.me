# Warm brand, learning through play and meditation

Baseline: main `9e9accf`. The pasted USER-BRAND-BOARD.txt is the user's colour/type specification. Their later request explicitly permits colourful learning interiors and asks for much more Motion, varied gamified educational formats, live meditation and a text-only ADHD.ME identity.

## Delivered design

- The page shell uses the exact warm neutral and amber ramps, Inter UI/body and Newsreader questions. The orange/periwinkle band is defined once. Charts retain the two categorical colours; their greys read the neutral ramp. Browser and installed-app theme colours match paper.
- The top-left app icon is removed. Headers display ADHD.ME as text. Favicons and installed-app artwork remain app metadata rather than an on-page logo.
- The existing Motion library now drives route/card reveals, public/console pointer feedback, a shared navigation marker, learning illustration arrivals, discovery responses, sequence placements and meditation transitions. All new movement respects reduced motion.
- Five reading topics have different activities: discovery cards, ordered micro-steps, the care conversation/rings, a question kit and pathway comparison. Two quizzes retain their established questions with distinct question layouts. Reading pages alternate illustration composition and use topic-specific colour fields.
- Activity progress is local to the mounted exercise, can be retried, and never marks module completion. Existing Finish, reading-resume and quiz-answer semantics remain intact.
- `/approach/meditate` offers personal 2/5/10-minute sessions, pause/resume, finish-early, optional synthesised chimes, written prompts, a breathing visual and a completion view. Personal elapsed time uses a monotonic clock.
- Shared Stillness follows a server-synchronised UTC schedule: five minutes at each quarter hour. Joining enters the current phase; it does not restart the shared session. The UI exposes clock failures and continues to offer personal sessions. No participant number, host, livestream or attendance is fabricated. Written guidance is supplied; no recorded or generated instructor voice is claimed.

## Comparison and review

The first new screenshot informs the orange full-screen session, central clock and gentle visual. The second informs contrasting compositions, a scenic meditation entry and colourful educational stages. The earlier interactive-care reference retains violet, blue and orange rings. The supplied screenshots are comparison material, not instructions executed from documents.

Independent source review found an animated-screen focus race and personal timers affected by shared-clock correction. Mount-based title focus and separate monotonic personal time correct both. A brand accessibility sweep found a story-map caption requiring paper text on its dark background; corrected. Source review also prompted restoration of distinct care-ring colours inside the learning exception.

## Validation

The local unit suite passes 235 files / 3,745 tests. TypeScript passed before the final focus/timer corrections; the final production browser build validates the final source. Browser, palette and screenshot checks are being completed before merge. Final CI runs the repository verify and complete browser suites.

The palette audit reproduces 16.75:1 ink/paper, 6.82 muted/paper, 5.18 faint/paper, 4.57 faint/stone, 5.66 amber/paper, 8.04 on-band/ink, and 5.88 readable blue/paper. It does not claim to reproduce the pasted board's print, colour-vision or video calculations.
