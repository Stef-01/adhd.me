/**
 * ADHD.ME — Bond Transformer deck, Figma Slides continuation (slides 06–15).
 *
 * File: https://www.figma.com/slides/DkS0rta61zfawq8WZGcDEB
 * Slides 01–05 are already built in that file and match this design system exactly.
 *
 * WHY THIS EXISTS: the Figma MCP tool-call quota on the Starter plan was exhausted
 * partway through the build. Nothing here needs rework — paste this into `use_figma`
 * (fileKey DkS0rta61zfawq8WZGcDEB) once the quota resets or the plan is upgraded and
 * it appends slides 06–15 after the existing five.
 *
 * Run it in TWO calls (06–10, then 11–15) to stay inside the per-call complexity
 * guidance. The `SLIDES` array at the bottom marks the split.
 *
 * Fonts used — both confirmed available in Figma: Newsreader (Light/Regular), Inter
 * (Light/Regular/Medium). Icons are Lucide, recoloured on insert.
 */

// ─────────────────────────── preamble ───────────────────────────
const C = {
  paper:     { r: 0.9843, g: 0.9804, b: 0.9686 }, // --paper  #FBFAF7
  ink:       { r: 0.0980, g: 0.1020, b: 0.0902 }, // --ink    #191A17
  muted:     { r: 0.4314, g: 0.4392, b: 0.4157 }, // --muted  #6E706A
  faint:     { r: 0.4196, g: 0.4235, b: 0.4039 }, // --faint  #6B6C67
  sage:      { r: 0.4000, g: 0.4667, b: 0.2902 }, // --sage   #66774A
  sageSoft:  { r: 0.9333, g: 0.9451, b: 0.9098 }, // #EEF1E8
  stone:     { r: 0.9333, g: 0.9255, b: 0.8980 }, // #EEECE5
  line:      { r: 0.8745, g: 0.8667, b: 0.8392 }, // #DFDDD6
  deep:      { r: 0.1412, g: 0.1686, b: 0.1098 }, // #242B1C
  sageLight: { r: 0.6588, g: 0.7294, b: 0.5333 }, // #A8BA88
  paperDim:  { r: 0.7255, g: 0.7333, b: 0.6980 }, // #B9BBB2
};
const HEX = { sage: "#66774A", sageLight: "#A8BA88" };
const RAIL = 150;

await Promise.all([
  figma.loadFontAsync({ family: "Newsreader", style: "Regular" }),
  figma.loadFontAsync({ family: "Newsreader", style: "Light" }),
  figma.loadFontAsync({ family: "Inter", style: "Regular" }),
  figma.loadFontAsync({ family: "Inter", style: "Medium" }),
  figma.loadFontAsync({ family: "Inter", style: "Light" }),
]);

// appendChild BEFORE position, at every nesting level (Slides (-240,-240) trap).
function addRect(p, x, y, w, h, fill, radius) {
  const r = figma.createRectangle();
  p.appendChild(r); r.resize(w, h);
  r.fills = [{ type: "SOLID", color: fill }];
  if (radius !== undefined) r.cornerRadius = radius;
  r.x = x; r.y = y; return r;
}
function addFrame(p, x, y, w, h, fill, radius) {
  const f = figma.createFrame();
  p.appendChild(f); f.resize(w, h);
  f.fills = [{ type: "SOLID", color: fill }];
  if (radius !== undefined) f.cornerRadius = radius;
  f.x = x; f.y = y; return f;
}
function addText(p, fam, st, size, color, chars, x, y, w, o) {
  o = o || {};
  const t = figma.createText();
  p.appendChild(t);
  t.fontName = { family: fam, style: st };
  t.fontSize = size;
  if (o.ls !== undefined) t.letterSpacing = { unit: "PERCENT", value: o.ls };
  if (o.lh !== undefined) t.lineHeight = { unit: "PERCENT", value: o.lh };
  t.characters = chars;
  if (w) { t.textAutoResize = "HEIGHT"; t.resize(w, t.height); }
  else { t.textAutoResize = "WIDTH_AND_HEIGHT"; }
  if (o.align) t.textAlignHorizontal = o.align;
  t.fills = [{ type: "SOLID", color }];
  t.x = x; t.y = y; return t;
}
function addIcon(p, svg, x, y, size, hex, sw) {
  const s = svg.split("currentColor").join(hex)
               .split('stroke-width="2"').join('stroke-width="' + (sw || 1.4) + '"');
  const n = figma.createNodeFromSvg(s);
  p.appendChild(n); n.resize(size, size); n.x = x; n.y = y; n.name = "icon";
  return n;
}
const W = (d) => '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
const ICON = {
  quote:    W('<path d="M14 14a2 2 0 0 0 2-2V8h-2"/><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/><path d="M8 14a2 2 0 0 0 2-2V8H8"/>'),
  pin:      W('<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>'),
  cal:      W('<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="m9 15 2 2 4-4"/>'),
  search:   W('<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>'),
  split:    W('<path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3"/><path d="m15 9 6-6"/>'),
  shield:   W('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>'),
  check:    W('<path d="m5 12 5 5L20 7"/>'),
  network:  W('<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>'),
  wallet:   W('<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>'),
  building: W('<path d="M10 12h4"/><path d="M10 8h4"/><path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"/><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/>'),
  cap:      W('<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>'),
  steth:    W('<path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/>'),
  micro:    W('<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>'),
};

function newSlide(name, bg) {
  const s = figma.createSlide(); s.name = name;
  s.fills = [{ type: "SOLID", color: bg }]; return s;
}
function chrome(s, num, onDark) {
  const c = onDark ? C.paperDim : C.faint;
  addText(s, "Inter", "Medium", 15, c, "ADHD.ME", RAIL, s.height - 96, null, { ls: 12 });
  addText(s, "Inter", "Regular", 15, c, num, s.width - RAIL - 40, s.height - 96, null, { ls: 4 });
}
function eyebrow(s, label, onDark) {
  addRect(s, RAIL, 214, 56, 2, onDark ? C.sageLight : C.sage);
  addText(s, "Inter", "Medium", 14, onDark ? C.sageLight : C.sage,
          label.toUpperCase(), RAIL + 76, 206, null, { ls: 16 });
}

const made = [];

// ═══════════════ BATCH A — slides 06–10 ═══════════════

// 06 · Customer discovery — interview 01
// Paraphrased from the founder's interview note (docs/patient views.docx). NOT verbatim
// quotes and never set in quotation marks: the source is a summary written after the fact,
// and a fabricated quote beside a real person is worse than an honest paraphrase.
{
  const s = newSlide("06 \u00b7 Customer discovery", C.paper);
  eyebrow(s, "Customer discovery \u00b7 interview 01");
  addText(s, "Newsreader", "Light", 100, C.ink, "finding someone was the hard part.", RAIL, 306, 1500, { ls: -3.5, lh: 104 });
  [
    { k: "Missed at school",          t: "Went through school without the question ever being asked. Came to it as an adult, unprompted." },
    { k: "Wanted one GP",             t: "The stated priority was getting connected to a consistent GP who would not be judgemental." },
    { k: "Hard to raise at all",      t: "Reported that GPs are currently difficult to discuss mental health with in a non-judgemental way." },
    { k: "Could not find who does it",t: "Reported extreme difficulty finding which GP does ADHD prescribing, without already knowing someone.", hi: true },
    { k: "The goal is function",      t: "The motivation was to stop underachieving and use their potential \u2014 not to collect a label." },
  ].forEach((f, i) => {
    const y = 470 + i * 84;
    addRect(s, RAIL, y, 1620, 1, C.line);
    addText(s, "Inter", "Medium", 14, f.hi ? C.sage : C.faint, f.k.toUpperCase(), RAIL, y + 26, 300, { ls: 13, lh: 140 });
    addText(s, "Inter", "Light", 23, f.hi ? C.ink : C.muted, f.t, 490, y + 18, 1280, { lh: 160 });
  });
  addRect(s, RAIL, 470 + 5 * 84, 1620, 1, C.line);
  addText(s, "Inter", "Regular", 15, C.faint, "First patient interview, 16 August 2026. One participant \u2014 a signal to test, not evidence of demand. De-identified findings only, recorded with the participant's knowledge. The interview programme continues.", RAIL, 922, 1620, { lh: 155 });
  chrome(s, "06");
  made.push({ n: s.name, id: s.id });
}

// 07 · What ADHD.ME is
{
  const s = newSlide("07 · What it is", C.paper);
  eyebrow(s, "What ADHD.ME is");
  addText(s, "Newsreader", "Light", 108, C.ink, "one route, end to end.", RAIL, 318, 1400, { ls: -3.5, lh: 104 });
  addText(s, "Inter", "Light", 27, C.muted, "A patient-facing finder and a practice-facing console on one engine. Scheduling language throughout — availability, never advice.", RAIL, 494, 900, { lh: 158 });
  [
    { ic: ICON.quote, n: "01", t: "Say what you need",          b: "In your words. Not a quiz, and not a score." },
    { ic: ICON.pin,   n: "02", t: "See who is near you",        b: "GPs who have done the training — by suburb, care area and language." },
    { ic: ICON.cal,   n: "03", t: "Book the first appointment", b: "Assessment, baseline checks and follow-up with one clinician." },
  ].forEach((st, i) => {
    const x = RAIL + i * 550;
    addRect(s, x, 660, 510, 1, C.line);
    addIcon(s, st.ic, x, 706, 30, HEX.sage, 1.5);
    addText(s, "Inter", "Medium", 14, C.sage, st.n, x + 468, 712, null, { ls: 14 });
    addText(s, "Newsreader", "Regular", 38, C.ink, st.t, x, 768, 470, { ls: -2, lh: 118 });
    addText(s, "Inter", "Regular", 19, C.muted, st.b, x, 868, 470, { lh: 158 });
  });
  chrome(s, "07");
  made.push({ n: s.name, id: s.id });
}

// 08 · Product · the patient finder
// IMAGE: docs/pitch/ has the source screenshot. Place it into the SHOT_FINDER frame
// via the `upload_assets` MCP tool (figma.createImageAsync is not available here).
{
  const s = newSlide("08 · Product · Finder", C.stone);
  eyebrow(s, "Product · the patient finder");
  addText(s, "Newsreader", "Light", 92, C.ink, "built, and running.", RAIL, 300, 900, { ls: -3.5, lh: 104 });
  addText(s, "Inter", "Light", 24, C.muted, "The finder carries a person from “what do I need” to a booked first appointment inside one calm shell. No clinical language on the surface — the compliance linter fails the build if it appears.", RAIL, 452, 740, { lh: 160 });
  addIcon(s, ICON.search, RAIL, 790, 26, HEX.sage, 1.6);
  addText(s, "Inter", "Regular", 18, C.muted, "Search-first and plain-language. Matching is keyed to clinician\nattributes — never to a patient's symptoms.", RAIL + 46, 782, 700, { lh: 158 });
  const shot = addFrame(s, 1010, 180, 760, 720, C.paper, 10);
  shot.name = "SHOT_FINDER";
  shot.strokes = [{ type: "SOLID", color: C.line }]; shot.strokeWeight = 1; shot.clipsContent = true;
  chrome(s, "08");
  made.push({ n: s.name, id: s.id, imageFrame: shot.id });
}

// 09 · Product · the practice side
{
  const s = newSlide("09 · Product · Practice", C.stone);
  eyebrow(s, "Product · the practice side");
  addText(s, "Newsreader", "Light", 88, C.ink, "supply is the other\nhalf of the problem.", RAIL, 292, 860, { ls: -3.5, lh: 104 });
  addText(s, "Inter", "Light", 23, C.muted, "Practices get demand matching inside their own rules, a record of which GP can do what, and a measurement layer that separates additional visits from the ones that would have happened anyway.", RAIL, 520, 740, { lh: 160 });
  addIcon(s, ICON.split, RAIL, 790, 26, HEX.sage, 1.6);
  addText(s, "Inter", "Regular", 18, C.muted, "A randomised holdout arm runs by default, so the lift is measured rather than asserted. Every message, booking and opt-out sits on an immutable audit log.", RAIL + 46, 782, 700, { lh: 158 });
  const shot = addFrame(s, 1010, 180, 760, 660, C.paper, 10);
  shot.name = "SHOT_PRACTICE";
  shot.strokes = [{ type: "SOLID", color: C.line }]; shot.strokeWeight = 1; shot.clipsContent = true;
  addText(s, "Inter", "Regular", 15, C.faint, "Synthetic practice engine — 26 simulated weeks, 4,000 synthetic patients. No real patient data exists in this build.", 1010, 856, 760, { lh: 155 });
  chrome(s, "09");
  made.push({ n: s.name, id: s.id, imageFrame: shot.id });
}

// 10 · Business model
{
  const s = newSlide("10 · Business model", C.paper);
  eyebrow(s, "Business model");
  addText(s, "Newsreader", "Light", 104, C.ink, "flat fees. never a cut of care.", RAIL, 310, 1500, { ls: -3.5, lh: 104 });
  addText(s, "Inter", "Light", 24, C.muted, "No percentage of clinical revenue and no per-referral payment, ever. That is a compliance posture — fee-splitting and inducement rules — not a pricing preference.", RAIL, 492, 1000, { lh: 158 });
  [
    ["Solo / small", "1–3 FTE GPs",    "$4,800"],
    ["Standard",     "4–7 FTE GPs",    "$9,600"],
    ["Group",        "8–12 FTE GPs",   "$14,400 – 18,000"],
    ["Multisite",    "3 or more sites","$25,000 – 100,000"],
  ].forEach((t, i) => {
    const y = 640 + i * 70;
    addRect(s, RAIL, y, 1620, 1, C.line);
    addText(s, "Inter", "Regular", 24, C.ink,   t[0], RAIL, y + 20, 400);
    addText(s, "Inter", "Regular", 19, C.muted, t[1], 560,  y + 23, 400, { lh: 155 });
    addText(s, "Newsreader", "Regular", 30, C.ink, t[2], 1170, y + 14, 600, { ls: -1, align: "RIGHT" });
  });
  addRect(s, RAIL, 640 + 4 * 70, 1620, 1, C.line);
  addText(s, "Inter", "Regular", 15, C.faint, "AUD, annual, ex GST. 12-week pilot at $2,400, credited in full against year one on conversion. Buyer breakeven sits at roughly four incremental attended visits per week, practice-wide.", RAIL, 930, 1620, { lh: 155 });
  chrome(s, "10");
  made.push({ n: s.name, id: s.id });
}

// ═══════════════ BATCH B — slides 11–15 (split the call here) ═══════════════

// 11 · Why this is hard to copy
{
  const s = newSlide("11 · Moat", C.paper);
  eyebrow(s, "Why this is hard to copy");
  addText(s, "Newsreader", "Light", 108, C.ink, "the constraints are the product.", RAIL, 310, 1500, { ls: -3.5, lh: 104 });
  [
    { ic: ICON.shield,  t: "Compliance is code",    b: "Copy linters block clinical claims, urgency, benefit claims and testimonials at build time. A non-compliant sentence fails the build — it does not wait for a reviewer to catch it." },
    { ic: ICON.split,   t: "Measured, not claimed", b: "A randomised holdout arm runs by default. We report incremental attended appointments against that control — never the raw count of bookings we happened to touch." },
    { ic: ICON.network, t: "The capability graph",  b: "Which GP can do what, in which state, under which rule — kept current as each jurisdiction moves. That record is the thing a competitor cannot clone from the outside." },
  ].forEach((m, i) => {
    const x = RAIL + i * 550;
    addRect(s, x, 556, 510, 1, C.line);
    addIcon(s, m.ic, x, 602, 30, HEX.sage, 1.5);
    addText(s, "Newsreader", "Regular", 36, C.ink, m.t, x, 662, 470, { ls: -2, lh: 118 });
    addText(s, "Inter", "Regular", 19, C.muted, m.b, x, 736, 470, { lh: 158 });
  });
  chrome(s, "11");
  made.push({ n: s.name, id: s.id });
}

// 12 · Status
{
  const s = newSlide("12 · Status", C.paper);
  eyebrow(s, "Status");
  addText(s, "Newsreader", "Light", 100, C.ink, "built and verified.\npre-pilot, and saying so.", RAIL, 302, 1500, { ls: -3.5, lh: 104 });
  addRect(s, RAIL, 604, 1620, 1, C.line);
  addText(s, "Inter", "Medium", 14, C.sage, "BUILT AND VERIFIED", RAIL, 646, null, { ls: 16 });
  [
    "First patient interview complete \u2014 discovery programme under way",
    "Patient finder and practice console running end to end on a synthetic engine",
    "Verify gate on every commit — typecheck, tests, build, dependency audit",
    "WCAG 2.1 AA sweep, zero violations, enforced across every public route",
    "Pilot playbook, pilot agreement template and pricing model drafted",
  ].forEach((d, i) => {
    addIcon(s, ICON.check, RAIL, 700 + i * 60, 18, HEX.sage, 1.7);
    addText(s, "Inter", "Regular", 19, C.muted, d, RAIL + 40, 696 + i * 60, 700, { lh: 158 });
  });
  addRect(s, 960, 636, 1, 310, C.line);
  addText(s, "Inter", "Medium", 14, C.sage, "NOT YET, AND WE WILL SAY SO", 1046, 646, null, { ls: 16 });
  [
    "No real patient data. No live messages. No pilot practice yet.",
    "Each sits behind a named founder gate (G1–G4) that the build stops at rather than crosses.",
    "The next gate to open is a design-partner practice — which is exactly what we are asking Bond for.",
  ].forEach((d, i) => addText(s, "Inter", "Regular", 19, C.muted, d, 1046, 696 + i * 76, 724, { lh: 158 }));
  chrome(s, "12");
  made.push({ n: s.name, id: s.id });
}

// 13 · Team
{
  const s = newSlide("13 · Team", C.paper);
  eyebrow(s, "Team");
  addText(s, "Newsreader", "Light", 104, C.ink, "three founders. one of them yours.", RAIL, 310, 1620, { ls: -3.5, lh: 104 });
  [
    { ic: ICON.cap,   n: "Vikram Ganeshalingam", r: "CO-FOUNDER",                  a: "Final-year MD candidate, Bond University", q: "What a person meets when they first look for help." },
    { ic: ICON.steth, n: "Dr Anubhav Saxena",    r: "CO-FOUNDER · MBBS, FRACGP",   a: "Practising GP · University of Sydney",     q: "A documented baseline before anything starts, then follow-up on a schedule." },
    { ic: ICON.micro, n: "Stefan Thottunkal",    r: "CO-FOUNDER",                  a: "NOURISH, Stanford Medicine · Health Systems Innovation Lab, Harvard T.H. Chan", q: "Physician-in-training and health-systems researcher." },
  ].forEach((t, i) => {
    const x = RAIL + i * 550;
    addRect(s, x, 520, 510, 1, C.line);
    addIcon(s, t.ic, x, 566, 30, HEX.sage, 1.5);
    addText(s, "Newsreader", "Regular", 36, C.ink, t.n, x, 626, 480, { ls: -2, lh: 115 });
    addText(s, "Inter", "Medium", 13, C.sage, t.r, x, 700, 480, { ls: 13, lh: 150 });
    addText(s, "Inter", "Regular", 18, C.muted, t.a, x, 752, 470, { lh: 158 });
    addText(s, "Inter", "Light", 19, C.faint, "“" + t.q + "”", x, 856, 470, { lh: 150 });
  });
  chrome(s, "13");
  made.push({ n: s.name, id: s.id });
}

// 14 · The ask
{
  const s = newSlide("14 · The ask", C.deep);
  eyebrow(s, "The ask", true);
  addText(s, "Newsreader", "Light", 104, C.paper, "what we're asking\nTransformer for.", RAIL, 300, 1400, { ls: -3.5, lh: 104 });
  [
    { ic: ICON.wallet,   t: "A Launchpad grant toward the pilot quarter — non-equity." },
    { ic: ICON.shield,   t: "Two mentors: clinical governance, and an Ahpra advertising review of the name." },
    { ic: ICON.building, t: "Introductions to three Gold Coast general practices as design partners." },
    { ic: ICON.network,  t: "Transformer Hub space and coaching through the pilot." },
  ].forEach((a, i) => {
    const y = 566 + i * 92;
    addIcon(s, a.ic, RAIL, y, 26, HEX.sageLight, 1.5);
    addText(s, "Inter", "Light", 27, C.paper, a.t, RAIL + 60, y - 8, 1100, { lh: 150 });
  });
  addRect(s, RAIL, 896, 1620, 1, { r: 0.2275, g: 0.2627, b: 0.1843 });
  addText(s, "Newsreader", "Regular", 34, C.sageLight, "Queensland is the first state where a GP can carry this pathway. Bond is in Queensland.", RAIL, 924, 1620, { ls: -2, lh: 130 });
  chrome(s, "14", true);
  made.push({ n: s.name, id: s.id });
}

// 15 · thanks
{
  const s = newSlide("15 · Thanks", C.paper);
  addText(s, "Newsreader", "Regular", 120, C.ink, "thanks", RAIL, 292, null, { ls: -4, lh: 100 });
  addText(s, "Inter", "Light", 32, C.muted, "Vikram Ganeshalingam\nDr Anubhav Saxena\nStefan Thottunkal", RAIL, 494, 900, { lh: 162 });
  // FOUNDER ACTION: replace with the real contact address before this deck is sent.
  addText(s, "Inter", "Medium", 28, C.ink, "add contact email before sending", RAIL, 752, 900, { lh: 150 });
  addRect(s, RAIL, 862, 1620, 1, C.line);
  addText(s, "Inter", "Regular", 17, C.faint, "Bond University Transformer  ·  Launchpad 2026", RAIL, 898, 900, { lh: 150 });
  addText(s, "Inter", "Regular", 17, C.faint, "ADHD.ME", 1690, 898, 80, { lh: 150 });
  made.push({ n: s.name, id: s.id });
}

return { made, createdNodeIds: made.map((m) => m.id) };
