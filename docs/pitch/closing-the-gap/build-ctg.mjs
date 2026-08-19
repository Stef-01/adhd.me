import fs from 'fs';
const S = '/private/tmp/claude-501/-Users-krishganesh-Documents-GitHub/3f14bce4-eb13-4f0d-9918-cc75ba74bb33/scratchpad';
const P = (n) => `calc(${n}*var(--px))`;

const IC = {
  activity:'<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
  scale:'<path d="M12 3v18"/><path d="m19 8 3 8a5 5 0 0 1-6 0zV7"/><path d="M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1"/><path d="m5 8 3 8a5 5 0 0 1-6 0zV7"/><path d="M7 21h10"/>',
  users:'<path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/>',
  down:'<path d="M16 17h6v-6"/><path d="m22 17-8.5-8.5-5 5L2 7"/>',
  clip:'<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  hands:'<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/>',
  db:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
  split:'<path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3"/><path d="m15 9 6-6"/>',
  cal:'<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="m9 15 2 2 4-4"/>',
  wallet:'<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  cap:'<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  steth:'<path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/>',
  micro:'<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>',
  seat:'<path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>',
};
const icon = (k,x,y,size,sw=1.5,cls='') =>
  `<svg class="ic a ${cls}" style="left:${P(x)};top:${P(y)};width:${P(size)};height:${P(size)}" viewBox="0 0 24 24" stroke-width="${sw}">${IC[k]}</svg>`;
const txt = (cls,x,y,size,extra,html) =>
  `<div class="a ${cls}" style="left:${P(x)};top:${P(y)};font-size:${P(size)}${extra?';'+extra:''}">${html}</div>`;
const hair = (x,y,w) => `<div class="a hair" style="left:${P(x)};top:${P(y)};width:${P(w)};height:1px"></div>`;
const vline = (x,y,h) => `<div class="a hair" style="left:${P(x)};top:${P(y)};width:1px;height:${P(h)}"></div>`;



// ── 02 the paradox (dark ground) ──
const PARADOX = [
  {v:'15.8%', l:'of Aboriginal children with clinically significant hyperactivity — against 9.7% of other children'},
  {v:'two-thirds', l:'less likely to receive stimulant treatment, where both parents are Aboriginal', hi:true},
  {v:'30%', l:'more likely than other children to be living with disability'},
  {v:'none', l:'validated ADHD symptom norms exist for most Aboriginal and Torres Strait Islander groups'},
].map((s,i)=>{
  const x = 150 + i*420;
  return (i?`<div class="a hair" style="left:${P(x-40)};top:${P(608)};width:1px;height:${P(210)}"></div>`:'')
    + txt('stat',x,604,s.v.length>6?46:62,`width:${P(360)};color:${s.hi?'var(--sage-light)':'var(--paper)'}`,s.v)
    + txt('body',x,700,18,`width:${P(340)};color:var(--paper-dim)`,s.l);
}).join('');

// ── 03 the barriers, all system-side ──
const BARRIERS = [
  {k:'The instruments', t:'There are no psychometric studies of ADHD questionnaires, and no symptom norms, for most Aboriginal and Torres Strait Islander groups. The tools were normed on somebody else.'},
  {k:'The history', t:'Fear tied to eugenics and the Stolen Generations — which the guideline notes is still in living memory.', hi:true},
  {k:'The reception', t:'Discrimination, racism and ignorance when seeking mental health support, which suppresses help-seeking before a clinician is ever involved.'},
  {k:'The record', t:'Under-identification of Aboriginal and Torres Strait Islander status in health settings, so the list of children to look at never forms.'},
  {k:'The label', t:'A cultural dislike of labelling and of diagnostic stigma, and reluctance to seek help until difficulties are extreme.'},
].map((r,i)=>{
  const y = 470 + i*86;
  return hair(150,y,1620)
    + txt('eyebrow',150,y+24,14,`letter-spacing:.13em;width:${P(300)}${r.hi?'':';color:var(--faint)'}`,r.k)
    + txt('sub',490,y+16,22,`width:${P(1280)};font-weight:300;color:${r.hi?'var(--ink)':'var(--muted)'}`,r.t);
}).join('') + hair(150,470+5*86,1620);

// ── 04 the pipeline, four stages ──
const PIPELINE = [
  {k:'In school',    v:'8.6% → 25%', l:'share of enrolments, against share of students suspended'},
  {k:'By Year 7',    v:'98%',        l:'increase in disciplinary absences between Year 6 and Year 7'},
  {k:'In detention', v:'89%',        l:'of children assessed had a severe neurodevelopmental impairment, most never diagnosed'},
  {k:'In prison',    v:'31% v 10%',  l:'adult ADHD among Aboriginal prisoners, against non-Aboriginal prisoners', hi:true},
].map((s,i)=>{
  const x = 150 + i*420;
  return (i?vline(x-40,596,212):'')
    + txt('eyebrow',x,592,13,`letter-spacing:.13em;width:${P(340)}${s.hi?'':';color:var(--faint)'}`,s.k)
    + txt('stat',x,632,s.v.length>7?44:56,`width:${P(360)};color:${s.hi?'var(--sage)':'var(--ink)'}`,s.v)
    + txt('body',x,714,17,`width:${P(340)}`,s.l);
}).join('')
 + hair(150,832,1620)
 + txt('h reg',150,860,31,`letter-spacing:-.02em;width:${P(1620)};color:var(--sage)`,'The behaviour a child is suspended for — disruption, disengagement — is the diagnostic criteria for the condition nobody assessed.');

// ── 05 Closing the Gap, one slide ──
const CTG = [
  {ic:'scale', v:'4 / 19', l:'Closing the Gap targets on track, halfway to the 2031 deadline'},
  {ic:'users', v:'3% → 37%', l:'share of the adult population, against share of people in custody'},
  {ic:'down',  v:'2,500', l:'Aboriginal and Torres Strait Islander adults imprisoned per 100,000 — up from 1,925 in 2019'},
  {ic:'activity', v:'No change', l:'Target 11, youth detention, against a 30% reduction by 2031'},
].map((s,i)=>{
  const x = 150 + i*420;
  return (i?vline(x-40,668,236):'')
    + icon(s.ic,x,668,28,1.6)
    + txt('stat',x,722,52,`width:${P(360)}`,s.v)
    + txt('body',x,802,17,`width:${P(340)}`,s.l);
}).join('');

// ── 07 what this does not claim ──
const NOTCLAIM = [
  {k:'What drives it', t:'Colonisation and dispossession, poverty, housing, over-policing, bail laws, and the age of criminal responsibility. Nothing in this proposal touches any of them.'},
  {k:'What is also true', t:'Among children already in contact with the system, severe neurodevelopmental impairment is close to universal, and mostly undiagnosed until a court asks.'},
  {k:'What we propose', t:'Treating a treatable condition in children who are not currently offered treatment. That is health care, not a theory of crime.', hi:true},
].map((r,i)=>{
  const y = 480 + i*112;
  return hair(150,y,1620)
    + txt('eyebrow',150,y+30,14,`letter-spacing:.13em;width:${P(320)}${r.hi?'':';color:var(--faint)'}`,r.k)
    + txt('sub',510,y+22,24,`width:${P(1260)};font-weight:300;color:${r.hi?'var(--ink)':'var(--muted)'}`,r.t);
}).join('') + hair(150,480+3*112,1620);

// ── 08 the model, three steps beside the finder screenshot ──
const MODEL = [
  'Say what you need — in your own words, including how you want to be treated.',
  'See who is near you — by suburb, language, care area, and how that clinician works.',
  'Book once — assessment, baseline and follow-up with the same person.',
].map((t,i)=> icon('split',150,700+i*62,18,1.7).replace(IC.split,'<path d="m5 12 5 5L20 7"/>')
  + txt('body',190,696+i*62,19,`width:${P(700)}`,t)).join('');

// ── 09 barrier → product mapping. The core slide of the deck. ──
const MAPPING = [
  {k:'The instruments', t:'ADHD.ME never screens and never scores. It carries no questionnaire, so it cannot inherit a questionnaire normed on the wrong population. It routes to a clinician who assesses.', hi:true},
  {k:'The reception', t:'A person says what they want from care — including not being judged — and is matched on those clinician attributes, by suburb and language. Matching is on the clinician, never on the patient’s symptoms.'},
  {k:'The record', t:'The register is built inside the service, from its own records, under its own rules. Identification improves without data leaving the building.'},
  {k:'The label', t:'Scheduling language only. No diagnosis talk, no urgency, no clinical claims on any patient-facing surface — enforced by linters that fail the build, not by a style guide.'},
  {k:'The evidence gap', t:'Every invitation runs against a randomised holdout, so the pilot produces the Australian evidence the guideline says does not exist.'},
].map((r,i)=>{
  const y = 470 + i*86;
  return hair(150,y,1620)
    + txt('eyebrow',150,y+24,14,`letter-spacing:.13em;width:${P(300)}${r.hi?'':';color:var(--faint)'}`,r.k)
    + txt('sub',490,y+16,22,`width:${P(1280)};font-weight:300;color:${r.hi?'var(--ink)':'var(--muted)'}`,r.t);
}).join('') + hair(150,470+5*86,1620);

// ── 11 community control ──
const CONTROL = [
  {k:'Priority Reform Two', t:'Deployed as the partner organisation’s own infrastructure. We never hold the patient relationship, the clinical record, or the Medicare claim.'},
  {k:'Priority Reform Four', t:'The partner organisation is the data custodian. Nothing is disclosed, published or shared without its decision.', hi:true},
  {k:'Priority Reform One', t:'The partner sets eligibility, message content, and whether the pilot proceeds at all — written into the agreement rather than left to goodwill.'},
  {k:'No partner yet', t:'We have no Aboriginal or Torres Strait Islander partner organisation today. Securing one is Phase 0, before any build.'},
].map((r,i)=>{
  const y = 480 + i*104;
  return hair(150,y,1620)
    + txt('eyebrow',150,y+28,14,`letter-spacing:.12em;width:${P(320)}${r.hi?'':';color:var(--faint)'}`,r.k)
    + txt('sub',510,y+20,23,`width:${P(1260)};font-weight:300;color:${r.hi?'var(--ink)':'var(--muted)'}`,r.t);
}).join('') + hair(150,480+4*104,1620);

// ── 12 the arithmetic ──
const COST = [
  {v:'$3,600', l:'one child, one day, in youth detention'},
  {v:'$1.3m', l:'one child, one year', hi:true},
  {v:'~900', l:'ADHD assessments the same year would fund', hi:true},
  {v:'$159,510', l:'one adult, one year, in prison'},
].map((s,i)=>{
  const x = 150 + i*420;
  return (i?vline(x-40,668,200):'')
    + txt('stat',x,664,62,`width:${P(360)};color:${s.hi?'var(--sage)':'var(--ink)'}`,s.v)
    + txt('body',x,754,18,`width:${P(340)}`,s.l);
}).join('')
 + hair(150,834,1620)
 + txt('h reg',150,862,32,`letter-spacing:-.02em;width:${P(1620)};color:var(--sage)`,'Detention is the most expensive thing this system does, and the least effective. Assessment is among the cheapest.');

// ── 13 the pilot ──
const PILOT = [
  {k:'Phase 0 · months 1–3', t:'Partnership first. No build, no data and no deployment until an Aboriginal Community Controlled Health Organisation has agreed scope, governance and data terms in writing.', hi:true},
  {k:'Phase 1 · months 4–9', t:'Identification and assessment pathway inside partner services, under the partner’s rules, with the randomised holdout running from the first day.'},
  {k:'Phase 2 · months 10–12', t:'Read-out: assessments completed, treatment initiated, treatment retained at three months — and a plain account of what did not work.'},
  {k:'Publication', t:'Published whether positive or null, with the partner as co-author, and the underlying data remaining theirs.'},
].map((r,i)=>{
  const y = 520 + i*96;
  return hair(150,y,1620)
    + txt('eyebrow',150,y+28,14,`letter-spacing:.12em;width:${P(320)}${r.hi?'':';color:var(--faint)'}`,r.k)
    + txt('sub',510,y+20,23,`width:${P(1260)};font-weight:300;color:${r.hi?'var(--ink)':'var(--muted)'}`,r.t);
}).join('') + hair(150,520+4*96,1620);

// ── 14 team, fourth seat left open ──
const TEAM = [
  {ic:'cap', n:'Vikram Ganeshalingam', r:'CO-FOUNDER', b:'Final-year MD candidate, Bond University'},
  {ic:'steth', n:'Dr Anubhav Saxena', r:'CO-FOUNDER · MBBS, FRACGP', b:'Practising GP · University of Sydney'},
  {ic:'micro', n:'Stefan Thottunkal', r:'CO-FOUNDER', b:'NOURISH, Stanford Medicine · Health Systems Innovation Lab, Harvard T.H. Chan'},
  {ic:'seat', n:'Vacant, deliberately', r:'ABORIGINAL AND TORRES STRAIT ISLANDER GOVERNANCE', b:'A condition of this work proceeding — not an advisory seat added after funding.', hi:true},
].map((t,i)=>{
  const x = 150 + i*420;
  return hair(x,520,360)
    + icon(t.ic,x,566,28,1.5)
    + txt('h reg',x,616,30,`letter-spacing:-.02em;width:${P(360)};line-height:1.16;color:${t.hi?'var(--sage)':'var(--ink)'}`,t.n)
    + txt('eyebrow',x,700,12,`letter-spacing:.11em;width:${P(360)};line-height:1.5${t.hi?'':';color:var(--faint)'}`,t.r)
    + txt('body',x,762,17,`width:${P(350)}`,t.b);
}).join('');

// ── 15 the ask ──
const ASK = [
  {ic:'hands', t:'An introduction to NACCHO or a state affiliate, so that partnership begins with the sector rather than with us.'},
  {ic:'wallet', t:'Scoped pilot funding, released in two tranches — partnership first, build second.'},
  {ic:'db', t:'Access to linked health, education and justice data at regional level, on Priority Reform Four terms set by the partner.'},
  {ic:'users', t:'A named contact in Health and one in the Attorney-General’s portfolio, because this sits across both.'},
].map((a,i)=>{
  const y = 500 + i*92;
  return icon(a.ic,150,y,26,1.5) + txt('sub',210,y-8,26,`width:${P(1200)};color:var(--paper);font-weight:300`,a.t);
}).join('')
 + `<div class="a hair" style="left:${P(150)};top:${P(876)};width:${P(1620)};height:1px"></div>`
 + txt('h reg',150,906,34,`letter-spacing:-.02em;color:var(--sage-light);width:${P(1620)}`,'If the holdout shows no effect, that is the finding, and we will publish it.');

// ── assemble ──
let html = fs.readFileSync(S + '/ctg.src.html','utf8');
html = html
  .replace('/*__FONTS__*/', fs.readFileSync(S + '/fonts-inline.css','utf8'))
  .replace('<!--PARADOX-->', PARADOX)
  .replace('<!--BARRIERS-->', BARRIERS)
  .replace('<!--PIPELINE-->', PIPELINE)
  .replace('<!--CTG-->', CTG)
  .replace('<!--NOTCLAIM-->', NOTCLAIM)
  .replace('<!--MODEL-->', MODEL)
  .replace('<!--MAPPING-->', MAPPING)
  .replace('<!--CONTROL-->', CONTROL)
  .replace('<!--COST-->', COST)
  .replace('<!--PILOT-->', PILOT)
  .replace('<!--TEAM-->', TEAM)
  .replace('<!--ASK-->', ASK)
  .replace('__IMG_FINDER__', 'data:image/png;base64,' + fs.readFileSync(S + '/crop-finder.png').toString('base64'))
  .replace('__IMG_CONSOLE__', 'data:image/png;base64,' + fs.readFileSync(S + '/crop-console.png').toString('base64'))
  .replace('__CONTACT__', process.env.CONTACT || 'add contact email before sending');

let n = 0;
html = html.replace(/<section class="slide[\s\S]*?<\/section>/g, (sec) => {
  n++;
  return sec.replace(/(<div class="a num"[^>]*>)[^<]*(<\/div>)/, `$1${String(n).padStart(2,'0')}$2`);
});
if (!n) throw new Error('renumber matched no slides');
html = html.replace(/[^\x00-\x7F]/gu, (c) => '&#' + c.codePointAt(0) + ';');
fs.writeFileSync(S + '/ctg.html', html);
console.log('ctg.html', n, 'slides,', (fs.statSync(S+'/ctg.html').size/1024/1024).toFixed(2), 'MB');
