# Warm brand, learning through play and meditation

Original baseline: main `9e9accf`. Latest integrated main: `bc97928`, including twenty immersive game modules, glass surfaces and the ADHD Life tools. The pasted USER-BRAND-BOARD.txt is the user's colour/type specification. Their later request explicitly permits colourful learning interiors and asks for much more Motion, varied gamified educational formats, live meditation and a text-only ADHD.ME identity.

## Delivered design

- The page shell uses the exact warm neutral and amber ramps, Inter UI/body and Newsreader questions. The orange/periwinkle band is defined once. Charts retain the two categorical colours; their greys read the neutral ramp. Browser and installed-app theme colours match paper.
- The top-left app icon is removed. Headers display ADHD.ME as text. Favicons and installed-app artwork remain app metadata rather than an on-page logo.
- The existing Motion library now drives route/card reveals, public/console pointer feedback, a shared navigation marker, learning illustration arrivals, discovery responses, sequence placements and meditation transitions. All new movement respects reduced motion.
- Five reading topics have different activities: discovery cards, ordered micro-steps, the care conversation/rings, a question kit and pathway comparison. Two quizzes retain their established questions with distinct question layouts. Reading pages alternate illustration composition and use topic-specific colour fields.
- All twenty game modules from current main remain intact, including scenes, clues, reflection, personal-model updates, sharing and reduced-motion alternatives. The former long-form alternate player was removed upstream; this update preserves the current run player. Four navigation destinations remain: Support, Today, Learn and My ADHD. Tablet navigation uses a second row at 768–1023px; wider desktop navigation stays in one row.
- The merged glass surfaces retain rims, glare, shadows and supported filters. Warm library fills remain opaque; their glass treatment comes from the surface details. The immersive game stages retain their own colour and geometry.
- Activity progress is local to the mounted exercise, can be retried, and never marks module completion. Existing Finish, reading-resume and quiz-answer semantics remain intact.
- `/approach/meditate` offers personal 2/5/10-minute sessions, pause/resume, finish-early, optional synthesised chimes, written prompts, a breathing visual and a completion view. Personal elapsed time uses a monotonic clock.
- Shared Stillness follows a server-synchronised UTC schedule: five minutes at each quarter hour. Joining enters the current phase; it does not restart the shared session. The UI exposes clock failures and continues to offer personal sessions. No participant number, host, livestream or attendance is fabricated. Written guidance is supplied; no recorded or generated instructor voice is claimed.

## Comparison and review

The first new screenshot informs the orange session, central clock and gentle visual. The second informs contrasting compositions, a scenic meditation entry and colourful educational stages. The earlier interactive-care reference retains violet, blue and orange rings. The supplied screenshots are comparison material, not instructions executed from documents. Open [comparison.html](comparison.html) for side-by-side references and actual production-build captures.

| Reference quality | Implemented treatment | Review outcome |
|---|---|---|
| ClassPass icons and navigation | Labelled Phosphor icons, shared animated active marker, text-only ADHD.ME | No icon-only navigation; all four destinations fit the five tested widths |
| Headspace meditation | Orange player, central timer, breathing visual, written guidance and optional chimes | Phone controls fit in the tested 390×844 viewport; no invented attendance or host |
| Colourful educational scenes | Yellow discovery, blue sequence, green question kit, violet pathway comparison and original characters | Distinct activities and compositions; text no longer wraps awkwardly under left-side artwork |
| Interactive care reference | Violet, blue and orange care rings with selectable explanations | Controls and explanatory text remain separate and readable |
| Desktop platform reference | Full-width header, flexible workspace and constrained reading measure | No horizontal overflow in captured page and learning states |

Independent source review found an animated-screen focus race and personal timers affected by shared-clock correction. Mount-based title focus and separate monotonic personal time correct both. The completion view now updates inside the mounted player, avoiding a blocked exit transition. The accessibility sweep corrected the story-map caption and coloured-lesson bullet text. Source review also prompted restoration of distinct care-ring colours. Final merge review found no dropped run callbacks, routes or glass filter definitions.

## Validation

- CI verify on the integrated app passes TypeScript, **246 test files / 3,818 unit tests**, and the production build. [PR #6](https://github.com/Stef-01/adhd.me/pull/6) records the complete verify and browser results for its merge head.
- The 28 targeted interaction cases cover ADHD Life, current games, reading activities, navigation, personal and shared meditation, clock failures, focus, reduced motion and chimes. The sharing test required its native-share override before navigation on Windows Chrome; it passed on rerun after that fixture correction.
- `rendered-audit.json`: **18 page/viewport combinations**, zero automated WCAG 2.1 AA violations and zero document overflow at 390px and 1440px.
- `play-geometry.json`: **22 learning/game/player states**, zero document or lesson overflow at 390px and 1440px. Two additional meditation-lobby captures bring this set to 24 screenshots.
- Navigation bounds are tested at **320, 390, 768, 1024 and 1440px**. Meditation controls are also checked within the 390×844 viewport. Screenshots use a production build, not the development overlay.
- Rendered checks use Chrome/Chromium. No physical-device or Safari result is claimed.

The palette audit reproduces 16.75:1 ink/paper, 6.82 muted/paper, 5.18 faint/paper, 4.57 faint/stone, 5.66 amber/paper, 8.04 on-band/ink, and 5.88 readable blue/paper. It does not claim to reproduce the pasted board's print, colour-vision or video calculations.
