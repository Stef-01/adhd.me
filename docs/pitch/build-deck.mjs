import fs from 'fs';
const S = '/private/tmp/claude-501/-Users-krishganesh-Documents-GitHub/3f14bce4-eb13-4f0d-9918-cc75ba74bb33/scratchpad';
const P = (n) => `calc(${n}*var(--px))`;

// ---- Lucide icon inner-paths (stroke set via CSS) ----
const IC = {
  clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6h4"/>',
  wallet:'<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
  landmark:'<path d="M10 18v-7"/><path d="M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/>',
  quote:'<path d="M14 14a2 2 0 0 0 2-2V8h-2"/><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/><path d="M8 14a2 2 0 0 0 2-2V8H8"/>',
  pin:'<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  cal:'<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="m9 15 2 2 4-4"/>',
  shield:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  split:'<path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3"/><path d="m15 9 6-6"/>',
  network:'<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>',
  cap:'<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  steth:'<path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/>',
  micro:'<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>',
  building:'<path d="M10 12h4"/><path d="M10 8h4"/><path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"/><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/>',
};
const icon = (k, x, y, size, sw = 1.5) =>
  `<svg class="ic a" style="left:${P(x)};top:${P(y)};width:${P(size)};height:${P(size)}" viewBox="0 0 24 24" stroke-width="${sw}">${IC[k]}</svg>`;
const txt = (cls, x, y, size, extra, html) =>
  `<div class="a ${cls}" style="left:${P(x)};top:${P(y)};font-size:${P(size)}${extra ? ';' + extra : ''}">${html}</div>`;
const hair = (x, y, w) => `<div class="a hair" style="left:${P(x)};top:${P(y)};width:${P(w)};height:1px"></div>`;
const vline = (x, y, h) => `<div class="a hair" style="left:${P(x)};top:${P(y)};width:1px;height:${P(h)}"></div>`;

// ═══ 03 STATS ═══
const stats = [
  { ic:'clock',    v:'6–12 mo', l:'typical wait for an adult ADHD assessment appointment' },
  { ic:'wallet',   v:'$1k–$2k', l:'common out-of-pocket cost of a private adult assessment' },
  { ic:'users',    v:'1m+',     l:'Australians living with ADHD <span style="white-space:nowrap">(2023 Senate inquiry)</span>' },
  { ic:'landmark', v:'$20bn+',  l:'estimated annual cost of ADHD to Australia (2023 Senate inquiry)' },
];
const STATS = stats.map((s, i) => {
  const x = 150 + i * 420;
  return (i ? vline(x - 40, 668, 232) : '')
    + icon(s.ic, x, 668, 28, 1.6)
    + txt('stat', x, 722, 62, `width:${P(360)}`, s.v)
    + txt('body', x, 818, 17, `width:${P(340)}`, s.l);
}).join('');

// ═══ 04 WHY NOW ═══
const rows = [
  { d:'Dec 2025', t:'<b style="font-weight:500;color:var(--ink)">Queensland becomes the first state</b> to let GPs diagnose adult ADHD and initiate treatment — with no mandatory additional training gate.' },
  { d:'Mar 2026', t:'NSW opens Stage 2 GP training toward independent diagnosis. South Australia, Western Australia and the ACT follow.' },
  { d:'2023',     t:'The Senate inquiry’s chief recommendation: a National ADHD Framework built on shared and collaborative models of care that widen the GP’s role.' },
];
const ROWS = rows.map((r, i) => {
  const y = 520 + i * 156;
  return hair(150, y, 1620)
    + txt('eyebrow', 150, y + 38, 15, `letter-spacing:.14em;width:${P(240)}`, r.d)
    + txt('sub', 450, y + 28, 26, `width:${P(1180)};font-weight:300;color:var(--ink)`, r.t);
}).join('') + hair(150, 520 + 3 * 156, 1620);

// ═══ 06 CUSTOMER DISCOVERY ═══
// Paraphrased findings from the founder's interview note (docs/patient views.docx).
// NOT verbatim quotes — nothing here is set in quotation marks, because the source is a
// summary written after the fact, and a fabricated quote beside a real person is worse
// than an honest paraphrase. No identifying detail, no pronouns.
const findings = [
  { k:'Missed at school',        t:'Went through school without the question ever being asked. Came to it as an adult, unprompted.' },
  { k:'Wanted one GP',           t:'The stated priority was getting connected to a consistent GP who would not be judgemental.' },
  { k:'Hard to raise at all',    t:'Reported that GPs are currently difficult to discuss mental health with in a non-judgemental way.' },
  { k:'Could not find who does it', t:'Reported extreme difficulty finding which GP does ADHD prescribing, without already knowing someone.', hi:true },
  { k:'The goal is function',    t:'The motivation was to stop underachieving and use their potential &mdash; not to collect a label.' },
];
const FINDINGS = findings.map((f, i) => {
  const y = 470 + i * 84;
  return hair(150, y, 1620)
    + txt('eyebrow', 150, y + 26, 14, `letter-spacing:.13em;width:${P(300)};line-height:1.4${f.hi ? '' : ';color:var(--faint)'}`, f.k)
    + txt('sub', 490, y + 18, 23, `width:${P(1280)};font-weight:300;color:${f.hi ? 'var(--ink)' : 'var(--muted)'}`, f.t);
}).join('') + hair(150, 470 + 5 * 84, 1620);

// ═══ 06 STEPS ═══
const steps = [
  { ic:'quote', n:'01', t:'Say what you need',          b:'In your words. Not a quiz, and not a score.' },
  { ic:'pin',   n:'02', t:'See who is near you',        b:'GPs who have done the training — by suburb, care area and language.' },
  { ic:'cal',   n:'03', t:'Book the first appointment', b:'Assessment, baseline checks and follow-up with one clinician.' },
];
const STEPS = steps.map((s, i) => {
  const x = 150 + i * 550;
  return `<div class="a hair" style="left:${P(x)};top:${P(660)};width:${P(510)};height:1px"></div>`
    + icon(s.ic, x, 706, 30, 1.5)
    + txt('eyebrow', x + 468, 712, 14, `letter-spacing:.14em`, s.n)
    + txt('h reg', x, 762, 38, `letter-spacing:-.02em;width:${P(470)};line-height:1.18`, s.t)
    + txt('body', x, 866, 19, `width:${P(470)}`, s.b);
}).join('');

// ═══ 09 TIERS ═══
const tiers = [
  ['Solo / small', '1–3 FTE GPs',   '$4,800'],
  ['Standard',     '4–7 FTE GPs',   '$9,600'],
  ['Group',        '8–12 FTE GPs',  '$14,400 – 18,000'],
  ['Multisite',    '3 or more sites','$25,000 – 100,000'],
];
const TIERS = tiers.map((t, i) => {
  const y = 640 + i * 70;
  return hair(150, y, 1620)
    + txt('sub', 150, y + 20, 24, `color:var(--ink);font-weight:400;width:${P(400)}`, t[0])
    + txt('body', 560, y + 23, 19, `width:${P(400)}`, t[1])
    + txt('stat', 1170, y + 14, 30, `width:${P(600)};text-align:right;letter-spacing:-.01em;white-space:nowrap`, t[2]);
}).join('') + hair(150, 640 + 4 * 70, 1620);

// ═══ 10 MOAT ═══
const moat = [
  { ic:'shield',  t:'Compliance is code',   b:'Copy linters block clinical claims, urgency, benefit claims and testimonials at build time. A non-compliant sentence fails the build — it does not wait for a reviewer to catch it.' },
  { ic:'split',   t:'Measured, not claimed',b:'A randomised holdout arm runs by default. We report incremental attended appointments against that control — never the raw count of bookings we happened to touch.' },
  { ic:'network', t:'The capability graph', b:'Which GP can do what, in which state, under which rule — kept current as each jurisdiction moves. That record is the thing a competitor cannot clone from the outside.' },
];
const MOAT = moat.map((m, i) => {
  const x = 150 + i * 550;
  return `<div class="a hair" style="left:${P(x)};top:${P(556)};width:${P(510)};height:1px"></div>`
    + icon(m.ic, x, 602, 30, 1.5)
    + txt('h reg', x, 662, 36, `letter-spacing:-.02em;width:${P(470)};line-height:1.18`, m.t)
    + txt('body', x, 736, 19, `width:${P(470)}`, m.b);
}).join('');

// ═══ 11 STATUS ═══
const done = [
  'First patient interview complete &mdash; discovery programme under way',
  'Patient finder and practice console running end to end on a synthetic engine',
  'Verify gate on every commit — typecheck, tests, build, dependency audit',
  'WCAG 2.1 AA sweep, zero violations, enforced across every public route',
  'Pilot playbook, pilot agreement template and pricing model drafted',
];
const notyet = [
  'No real patient data. No live messages. No pilot practice yet.',
  'Each sits behind a named founder gate (G1–G4) that the build stops at rather than crosses.',
  'The next gate to open is a design-partner practice — which is exactly what we are asking Bond for.',
];
const STATUS =
  txt('eyebrow', 150, 646, 14, '', 'Built and verified')
  + done.map((d, i) => icon('shield', 150, 700 + i * 60, 18, 1.7).replace(IC.shield, '<path d="m5 12 5 5L20 7"/>')
      + txt('body', 190, 696 + i * 60, 19, `width:${P(700)}`, d)).join('')
  + vline(960, 636, 310)
  + txt('eyebrow', 1046, 646, 14, '', 'Not yet, and we will say so')
  + notyet.map((d, i) => txt('body', 1046, 696 + i * 76, 19, `width:${P(724)}`, d)).join('');

// ═══ 12 TEAM ═══
const team = [
  { n:'Vikram Ganeshalingam', r:'Co-founder', a:'Final-year MD candidate, Bond University', q:'What a person meets when they first look for help.', ic:'cap' },
  { n:'Dr Anubhav Saxena',    r:'Co-founder · MBBS, FRACGP', a:'Practising GP · University of Sydney', q:'A documented baseline before anything starts, then follow-up on a schedule.', ic:'steth' },
  { n:'Stefan Thottunkal',    r:'Co-founder', a:'NOURISH, Stanford Medicine · Health Systems Innovation Lab, Harvard T.H. Chan', q:'Physician-in-training and health-systems researcher.', ic:'micro' },
];
const TEAM = team.map((t, i) => {
  const x = 150 + i * 550;
  return `<div class="a hair" style="left:${P(x)};top:${P(520)};width:${P(510)};height:1px"></div>`
    + icon(t.ic, x, 566, 30, 1.5)
    + txt('h reg', x, 626, 36, `letter-spacing:-.02em;width:${P(480)};line-height:1.15`, t.n)
    + txt('eyebrow', x, 700, 13, `letter-spacing:.13em;width:${P(480)};line-height:1.5`, t.r)
    + txt('body', x, 752, 18, `width:${P(470)}`, t.a)
    + txt('sub', x, 856, 19, `width:${P(470)};font-style:italic;color:var(--faint);line-height:1.5`, '“' + t.q + '”');
}).join('');

// ═══ 13 ASK ═══
const ask = [
  { ic:'wallet',   t:'A Launchpad grant toward the pilot quarter — non-equity.' },
  { ic:'shield',   t:'Two mentors: clinical governance, and an Ahpra advertising review of the name.' },
  { ic:'building', t:'Introductions to three Gold Coast general practices as design partners.' },
  { ic:'network',  t:'Transformer Hub space and coaching through the pilot.' },
];
const ASK = ask.map((a, i) => {
  const y = 566 + i * 92;
  return icon(a.ic, 150, y, 26, 1.5)
    + txt('sub', 210, y - 8, 27, `width:${P(1100)};color:var(--paper);font-weight:300`, a.t);
}).join('')
  + `<div class="a hair" style="left:${P(150)};top:${P(896)};width:${P(1620)};height:1px"></div>`
  + txt('h reg', 150, 924, 34, `letter-spacing:-.02em;color:var(--sage-light);width:${P(1620)}`,
      'Queensland is the first state where a GP can carry this pathway. Bond is in Queensland.');

// ---- assemble ----
let html = fs.readFileSync(S + '/deck.src.html', 'utf8');
const fonts = fs.readFileSync(S + '/fonts-inline.css', 'utf8');
const b64 = (p) => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');

html = html
  .replace('/*__FONTS__*/', fonts)
  .replace('<!--STATS-->', STATS)
  .replace('<!--ROWS-->', ROWS)
  .replace('<!--FINDINGS-->', FINDINGS)
  .replace('<!--STEPS-->', STEPS)
  .replace('<!--TIERS-->', TIERS)
  .replace('<!--MOAT-->', MOAT)
  .replace('<!--STATUS-->', STATUS)
  .replace('<!--TEAM-->', TEAM)
  .replace('<!--ASK-->', ASK)
  .replace('__IMG_FINDER__', b64(S + '/crop-finder.png'))
  .replace('__IMG_CONSOLE__', b64(S + '/crop-console.png'))
  .replace('__CONTACT__', process.env.CONTACT || 'add contact email before sending');

// Renumber every slide from its actual position, so inserting a slide can never leave a
// stale hardcoded number behind. Slide 1 carries no number and simply passes through.
let slideIdx = 0;
html = html.replace(/<section class="slide[\s\S]*?<\/section>/g, (sec) => {
  slideIdx++;
  const n = String(slideIdx).padStart(2, '0');
  return sec.replace(/(<div class="a num"[^>]*>)[^<]*(<\/div>)/, `$1${n}$2`);
});
if (slideIdx === 0) throw new Error('renumber pass matched no slides — check the section markup');
console.log('slides renumbered:', slideIdx);

// Encoding-proof: escape every non-ASCII codepoint to a numeric entity so the page
// renders identically regardless of how the host serves/sniffs the charset.
html = html.replace(/[^\x00-\x7F]/gu, (c) => '&#' + c.codePointAt(0) + ';');

fs.writeFileSync(S + '/deck.html', html);
console.log('deck.html', (fs.statSync(S + '/deck.html').size / 1024 / 1024).toFixed(2), 'MB');
