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

// ── 03 scoreboard ──
const SCORE = [
  {ic:'scale', v:'4 / 19', l:'Closing the Gap targets on track (Annual Data Compilation, July 2026)'},
  {ic:'activity', v:'8.8 yrs', l:'life expectancy gap for men; 8.1 years for women. Target 1 not on track'},
  {ic:'users', v:'89.2%', l:'of babies at a healthy birthweight, against a 91% target. Not on track'},
  {ic:'down', v:'2024', l:'Productivity Commission review: fundamental change is required'},
].map((s,i)=>{
  const x = 150 + i*420;
  return (i?vline(x-40,668,232):'')
    + icon(s.ic,x,668,28,1.6)
    + txt('stat',x,722,58,`width:${P(360)}`,s.v)
    + txt('body',x,812,17,`width:${P(340)}`,s.l);
}).join('');

// ── 04 what this is not ──
const NOT = [
  {k:'Who decides', t:'Priority Reform One settles that: formal partnership and shared decision-making with Aboriginal and Torres Strait Islander people. That is not us.'},
  {k:'Who delivers', t:'Priority Reform Two settles that: the community-controlled sector. ACCHOs already outperform mainstream general practice for the people this concerns. That is not us either.'},
  {k:'What we offer', t:'Infrastructure and measurement &mdash; for a community-controlled organisation to use, adapt, or refuse.', hi:true},
].map((r,i)=>{
  const y = 480 + i*112;
  return hair(150,y,1620)
    + txt('eyebrow',150,y+30,14,`letter-spacing:.13em;width:${P(300)}${r.hi?'':';color:var(--faint)'}`,r.k)
    + txt('sub',490,y+22,24,`width:${P(1280)};font-weight:300;color:${r.hi?'var(--ink)':'var(--muted)'}`,r.t);
}).join('') + hair(150,480+3*112,1620);

// ── 05 the 715 number ──
const S715 =
  hair(1010,470,760)
  + txt('stat',1010,506,132,`width:${P(760)}`,'27.9%')
  + txt('body',1010,672,19,`width:${P(700)}`,'of Aboriginal and Torres Strait Islander people received a 715 health assessment in 2023&ndash;24')
  + hair(1010,782,760)
  + txt('stat',1010,818,50,`width:${P(340)}`,'17%')
  + txt('body',1010,884,16,`width:${P(320)}`,'in the lowest Primary Health Network areas')
  + vline(1390,808,120)
  + txt('stat',1440,818,50,`width:${P(340)}`,'48%')
  + txt('body',1440,884,16,`width:${P(330)}`,'of regular ACCHO clients aged 15 and over');

// ── 06 barriers ──
const BARRIERS = [
  {k:'Identification', t:'Indigenous status is not recorded, so the list of eligible patients does not exist to begin with.'},
  {k:'Item knowledge', t:'Practice staff do not know which MBS item applies, or who in the practice is entitled to claim it.'},
  {k:'Ownership', t:'Nobody owns the recall, so the health assessment is nobody&rsquo;s job in particular.', hi:true},
  {k:'Billing avoidance', t:'Practices avoid claiming an item they are not confident they have satisfied the requirements for.'},
].map((r,i)=>{
  const y = 470 + i*100;
  return hair(150,y,1620)
    + txt('eyebrow',150,y+28,14,`letter-spacing:.13em;width:${P(300)}${r.hi?'':';color:var(--faint)'}`,r.k)
    + txt('sub',490,y+20,24,`width:${P(1280)};font-weight:300;color:${r.hi?'var(--ink)':'var(--muted)'}`,r.t);
}).join('') + hair(150,470+4*100,1620);

// ── 07 the engine ──
const ENGINE = [
  {ic:'clip', n:'01', t:'Identify', b:'A register of eligible patients built from the service&rsquo;s own records, inside rules it sets. Nothing leaves the service to build it.'},
  {ic:'cal', n:'02', t:'Invite', b:'A plain, availability-only message. The patient books with their own clinician, at their own service.'},
  {ic:'split', n:'03', t:'Count', b:'Attended assessments only, against a randomised holdout. No-shows never count, and neither do bookings we merely touched.'},
].map((s,i)=>{
  const x = 150 + i*550;
  return hair(x,640,510)
    + icon(s.ic,x,686,30,1.5)
    + txt('eyebrow',x+468,692,14,'letter-spacing:.14em',s.n)
    + txt('h reg',x,742,38,`letter-spacing:-.02em;width:${P(470)};line-height:1.18`,s.t)
    + txt('body',x,822,19,`width:${P(470)}`,s.b);
}).join('');

// ── 09 contrast ──
const CONTRAST =
  hair(150,470,1620)
  + txt('eyebrow',150,510,14,'letter-spacing:.14em;color:var(--faint)','What programs usually report')
  + txt('sub',150,562,24,`width:${P(700)};font-weight:300`,'Activity. Messages sent, checks performed, dollars spent, people reached. Every one of those numbers counts something the program did &mdash; and not one of them answers whether it changed anything.')
  + vline(940,500,262)
  + txt('eyebrow',1010,510,14,'letter-spacing:.14em','What this reports')
  + txt('sub',1010,562,24,`width:${P(760)};font-weight:300;color:var(--ink)`,'Incremental attended assessments per 1,000 eligible patients, against a randomised control arm running continuously. If the program did nothing, the number is zero, and the report says zero.')
  + hair(150,806,1620)
  + txt('h reg',150,838,34,`letter-spacing:-.02em;width:${P(1620)};color:var(--sage)`,'The 2024 Review found that governments cannot show what is working. This is a literal answer to that: a number that is allowed to come back negative.');

// ── 10 priority reforms ──
const REFORMS = [
  {n:'Priority Reform One', t:'Shared decision-making', b:'The partner organisation sets eligibility, message content, and whether the pilot proceeds at all. Written into the agreement rather than left to goodwill.'},
  {n:'Priority Reform Two', t:'Community-controlled sector', b:'Deployed as the partner&rsquo;s own infrastructure. We never hold the patient relationship, the clinical record, or the Medicare claim.'},
  {n:'Priority Reform Three', t:'Transforming government', b:'The same measurement is offered to mainstream practices &mdash; where Aboriginal and Torres Strait Islander patients most often are not identified at all.'},
  {n:'Priority Reform Four', t:'Shared access to data', b:'The partner organisation is the data custodian. Nothing is disclosed, published or shared without its decision.', hi:true},
].map((r,i)=>{
  const x = 150 + i*420;
  return hair(x,500,360)
    + txt('eyebrow',x,538,13,`letter-spacing:.12em;width:${P(360)}${r.hi?'':';color:var(--faint)'}`,r.n)
    + txt('h reg',x,584,29,`letter-spacing:-.02em;width:${P(350)};line-height:1.2;color:${r.hi?'var(--sage)':'var(--ink)'}`,r.t)
    + txt('body',x,668,18,`width:${P(350)}`,r.b);
}).join('');

// ── 11 pilot ──
const PILOT = [
  {k:'Phase 0 &middot; months 1&ndash;3', t:'Partnership first. No build, no data and no deployment until an Aboriginal Community Controlled Health Organisation has agreed scope, governance and data terms in writing.', hi:true},
  {k:'Phase 1 &middot; months 4&ndash;9', t:'Deployment inside partner services. Register, invitation and booking under the partner&rsquo;s rules, with the randomised holdout running from the first day.'},
  {k:'Phase 2 &middot; months 10&ndash;12', t:'Independent read-out: incremental attended 715 assessments per 1,000 eligible patients, and a plain account of what did not work.'},
  {k:'Publication', t:'The result is published whether positive or null, with the partner as co-author, and the underlying data remains theirs.'},
].map((r,i)=>{
  const y = 520 + i*96;
  return hair(150,y,1620)
    + txt('eyebrow',150,y+28,14,`letter-spacing:.12em;width:${P(320)}${r.hi?'':';color:var(--faint)'}`,r.k)
    + txt('sub',510,y+20,23,`width:${P(1260)};font-weight:300;color:${r.hi?'var(--ink)':'var(--muted)'}`,r.t);
}).join('') + hair(150,520+4*96,1620);

// ── 12 team, with the fourth seat left open ──
const TEAM = [
  {ic:'cap', n:'Vikram Ganeshalingam', r:'CO-FOUNDER', b:'Final-year MD candidate, Bond University'},
  {ic:'steth', n:'Dr Anubhav Saxena', r:'CO-FOUNDER &middot; MBBS, FRACGP', b:'Practising GP &middot; University of Sydney'},
  {ic:'micro', n:'Stefan Thottunkal', r:'CO-FOUNDER', b:'NOURISH, Stanford Medicine &middot; Health Systems Innovation Lab, Harvard T.H. Chan'},
  {ic:'seat', n:'Vacant, deliberately', r:'ABORIGINAL AND TORRES STRAIT ISLANDER GOVERNANCE', b:'A condition of this work proceeding &mdash; not an advisory seat added after funding.', hi:true},
].map((t,i)=>{
  const x = 150 + i*420;
  return hair(x,520,360)
    + icon(t.ic,x,566,28,1.5)
    + txt('h reg',x,616,30,`letter-spacing:-.02em;width:${P(360)};line-height:1.16;color:${t.hi?'var(--sage)':'var(--ink)'}`,t.n)
    + txt('eyebrow',x,700,12,`letter-spacing:.11em;width:${P(360)};line-height:1.5${t.hi?'':';color:var(--faint)'}`,t.r)
    + txt('body',x,762,17,`width:${P(350)}`,t.b);
}).join('');

// ── 13 the ask ──
const ASK = [
  {ic:'hands', t:'An introduction to NACCHO or a state affiliate, so that partnership begins with the sector rather than with us.'},
  {ic:'wallet', t:'Scoped pilot funding, released in two tranches &mdash; partnership first, build second.'},
  {ic:'db', t:'Access to regional MBS 715 claim data, on Priority Reform Four terms set by the partner.'},
  {ic:'users', t:'A named contact in the Department to hold us to the measurement standard we are proposing.'},
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
  .replace('<!--SCORE-->', SCORE)
  .replace('<!--NOT-->', NOT)
  .replace('<!--S715-->', S715)
  .replace('<!--BARRIERS-->', BARRIERS)
  .replace('<!--ENGINE-->', ENGINE)
  .replace('<!--CONTRAST-->', CONTRAST)
  .replace('<!--REFORMS-->', REFORMS)
  .replace('<!--PILOT-->', PILOT)
  .replace('<!--TEAM-->', TEAM)
  .replace('<!--ASK-->', ASK)
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
