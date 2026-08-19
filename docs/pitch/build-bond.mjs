import fs from 'fs';
const S = '/private/tmp/claude-501/-Users-krishganesh-Documents-GitHub/3f14bce4-eb13-4f0d-9918-cc75ba74bb33/scratchpad';
const P = (n) => `calc(${n}*var(--px))`;
const IC = {
  quote:'<path d="M14 14a2 2 0 0 0 2-2V8h-2"/><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/><path d="M8 14a2 2 0 0 0 2-2V8H8"/>',
  pin:'<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  cal:'<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="m9 15 2 2 4-4"/>',
  check:'<path d="m5 12 5 5L20 7"/>',
  cap:'<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  steth:'<path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/>',
  micro:'<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>',
  wallet:'<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  shield:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  building:'<path d="M10 12h4"/><path d="M10 8h4"/><path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"/><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/>',
  network:'<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>',
};
const icon=(k,x,y,s,sw=1.5,cls='')=>`<svg class="ic a ${cls}" style="left:${P(x)};top:${P(y)};width:${P(s)};height:${P(s)}" viewBox="0 0 24 24" stroke-width="${sw}">${IC[k]}</svg>`;
const txt=(c,x,y,s,e,h)=>`<div class="a ${c}" style="left:${P(x)};top:${P(y)};font-size:${P(s)}${e?';'+e:''}">${h}</div>`;
const hair=(x,y,w)=>`<div class="a hair" style="left:${P(x)};top:${P(y)};width:${P(w)};height:1px"></div>`;
const vline=(x,y,h)=>`<div class="a hair" style="left:${P(x)};top:${P(y)};width:1px;height:${P(h)}"></div>`;
const box=(x,y,w,h,fill,r)=>`<div class="a" style="left:${P(x)};top:${P(y)};width:${P(w)};height:${P(h)};background:${fill}${r?';border-radius:'+P(r):''}"></div>`;

// 02 — the two halves of the problem
const PROB=[
 {v:'6–12 mo', l:'typical wait for an adult assessment appointment'},
 {v:'$1k–$2k', l:'common out-of-pocket cost of a private assessment'},
 {v:'1m+', l:'Australians living with ADHD (2023 Senate inquiry)'},
 {v:'0', l:'public ways to find which GP near you does this', hi:true},
].map((s,i)=>{const x=150+i*420;
 return (i?vline(x-40,824,120):'')
  +txt('stat',x,820,46,`width:${P(360)};color:${s.hi?'var(--sage-light)':'var(--paper)'}`,s.v)
  +txt('body',x,888,17,`width:${P(340)};color:var(--paper-dim)`,s.l);}).join('');

// 03 — why now
const ROWS=[
 {d:'Dec 2025',t:'<b style="font-weight:500;color:var(--ink)">Queensland becomes the first state</b> to let GPs diagnose adult ADHD and initiate treatment — with no mandatory additional training gate.'},
 {d:'Mar 2026',t:'NSW opens Stage 2 GP training toward independent diagnosis. South Australia, Western Australia and the ACT follow.'},
 {d:'2023',t:'The Senate inquiry’s chief recommendation: a National ADHD Framework built on shared and collaborative models of care that widen the GP’s role.'},
].map((r,i)=>{const y=520+i*156;
 return hair(150,y,1620)+txt('eyebrow',150,y+38,15,`letter-spacing:.14em;width:${P(240)}`,r.d)
  +txt('sub',450,y+28,26,`width:${P(1180)};font-weight:300;color:var(--ink)`,r.t);}).join('')+hair(150,520+3*156,1620);

// 04 — interview 01
const FINDINGS=[
 {k:'Missed at school',t:'Went through school without the question ever being asked. Came to it as an adult, unprompted.'},
 {k:'Wanted one GP',t:'The stated priority was getting connected to a consistent GP who would not be judgemental.'},
 {k:'Hard to raise at all',t:'Reported that GPs are currently difficult to discuss mental health with in a non-judgemental way.'},
 {k:'Could not find who does it',t:'Reported extreme difficulty finding which GP does ADHD prescribing, without already knowing someone.',hi:1},
 {k:'The goal is function',t:'The motivation was to stop underachieving and use their potential — not to collect a label.'},
].map((f,i)=>{const y=470+i*84;
 return hair(150,y,1620)+txt('eyebrow',150,y+26,14,`letter-spacing:.13em;width:${P(300)};line-height:1.4${f.hi?'':';color:var(--faint)'}`,f.k)
  +txt('sub',490,y+18,23,`width:${P(1280)};font-weight:300;color:${f.hi?'var(--ink)':'var(--muted)'}`,f.t);}).join('')+hair(150,470+5*84,1620);

// 05 — part-to-whole: treated against estimated prevalence. One measure, one hue, direct labels.
const TRACK=1620, TREATED=Math.round(TRACK*470/1500);   // 470k of ~1.5m
const CHART =
  txt('eyebrow',150,472,14,'letter-spacing:.14em;color:var(--faint)','Estimated Australians living with ADHD — 1.5 million')
  + box(150,510,TRACK,96,'var(--stone)',4)
  + box(150,510,TREATED,96,'var(--sage)',4)
  + txt('stat',186,522,42,`color:var(--paper);width:${P(440)}`,'470,000').replace('class="a stat"','data-onbar="1" class="a stat"')
  + txt('body',186,572,16,`width:${P(420)};color:var(--paper)`,'dispensed ADHD medication').replace('class="a body"','data-onbar="1" class="a body"')
  + txt('stat',150+TREATED+40,522,42,`color:var(--ink);width:${P(700)}`,'~1,030,000')
  + txt('body',150+TREATED+40,572,16,`width:${P(700)}`,'estimated, not receiving treatment')
  + hair(150,660,1620)
  + txt('h reg',150,690,32,`letter-spacing:-.02em;width:${P(1620)};color:var(--sage)`,'The market is not the people already diagnosed. It is the two in three who never got that far.')
  + txt('body',150,772,19,`width:${P(1620)}`,'Every one of them is a person who, at some point, tried to work out who to ask — and stopped. That is the moment ADHD.ME is built for, and it is the moment a practice never sees.');

// 06 — three steps beside the finder
const STEPS=[
 'Say what you need — in your own words, including how you want to be treated.',
 'See who is near you — by suburb, language, care area, and how that clinician works.',
 'Book once — assessment, baseline and follow-up with the same person.',
].map((t,i)=>icon('check',150,700+i*62,18,1.7)+txt('body',190,696+i*62,19,`width:${P(700)}`,t)).join('');

// 07 — the money, both sides
const GP=[
 {v:'$0',       l:'an empty mid-week slot'},
 {v:'$128.35',  l:'Item 44 — the prolonged consult ADHD assessment actually bills', hi:1},
 {v:'≈$29,500', l:'a year, from one prolonged slot a day', hi:1},
];
const PT=[
 {v:'$1k–$2k',   l:'private adult assessment, today'},
 {v:'$270–$600', l:'saved out-of-pocket on a GP-led pathway', hi:1},
 {v:'$9,600',    l:'our Standard tier — for the whole practice, per year'},
];
const col=(arr,x,w)=>arr.map((s,i)=>{const y=562+i*96;
 return txt('stat',x,y,44,`width:${P(w)};color:${s.hi?'var(--sage)':'var(--ink)'}`,s.v)
  +txt('body',x,y+56,17,`width:${P(w-40)}`,s.l);}).join('');
const REVENUE =
  txt('eyebrow',150,524,14,`letter-spacing:.14em;width:${P(700)}`,'What the GP earns')
  + col(GP,150,740)
  + vline(960,516,316)
  + txt('eyebrow',1046,524,14,`letter-spacing:.14em;width:${P(700)}`,'What the patient saves')
  + col(PT,1046,724)
  + hair(150,846,1620)
  + txt('h reg',150,868,31,`letter-spacing:-.02em;width:${P(1620)};color:var(--sage)`,'One GP, one prolonged slot a day, covers the whole practice fee three times over.');

// 08 — honest status
const STATUS =
 txt('eyebrow',150,646,14,'','Built and verified')
 + ['First patient interview complete — discovery under way',
    'Finder and practice console running end to end on a synthetic engine',
    'Verify gate on every commit — typecheck, tests, build, dependency audit',
    'WCAG 2.1 AA sweep, zero violations, across every public route',
   ].map((d,i)=>icon('check',150,700+i*60,18,1.7)+txt('body',190,696+i*60,19,`width:${P(700)}`,d)).join('')
 + vline(960,636,290)
 + txt('eyebrow',1046,646,14,'','Not yet, and we will say so')
 + ['No real patient data. No live messages. No pilot practice yet.',
    'Each sits behind a named founder gate the build stops at rather than crosses.',
    'The next gate to open is a design-partner practice — which is what we are asking Bond for.',
   ].map((d,i)=>txt('body',1046,696+i*76,19,`width:${P(724)}`,d)).join('');

// 09 — team
const TEAM=[
 {ic:'cap',n:'Vikram Ganeshalingam',r:'CO-FOUNDER',a:'Final-year MD candidate, Bond University',q:'What a person meets when they first look for help.'},
 {ic:'steth',n:'Dr Anubhav Saxena',r:'CO-FOUNDER · MBBS, FRACGP',a:'Practising GP · University of Sydney',q:'A documented baseline before anything starts, then follow-up on a schedule.'},
 {ic:'micro',n:'Stefan Thottunkal',r:'CO-FOUNDER',a:'NOURISH, Stanford Medicine · Health Systems Innovation Lab, Harvard T.H. Chan',q:'Physician-in-training and health-systems researcher.'},
].map((t,i)=>{const x=150+i*550;
 return hair(x,520,510)+icon(t.ic,x,566,30,1.5)
  +txt('h reg',x,626,36,`letter-spacing:-.02em;width:${P(480)};line-height:1.15`,t.n)
  +txt('eyebrow',x,700,13,`letter-spacing:.13em;width:${P(480)};line-height:1.5`,t.r)
  +txt('body',x,752,18,`width:${P(470)}`,t.a)
  +txt('sub',x,856,19,`width:${P(470)};font-style:italic;color:var(--faint);line-height:1.5`,'“'+t.q+'”');}).join('');

// 10 — the ask
const ASK=[
 {ic:'wallet',t:'A Launchpad grant toward the pilot quarter — non-equity.'},
 {ic:'shield',t:'Two mentors: clinical governance, and an Ahpra advertising review of the name.'},
 {ic:'building',t:'Introductions to three Gold Coast general practices as design partners.'},
 {ic:'network',t:'Transformer Hub space and coaching through the pilot.'},
].map((a,i)=>{const y=530+i*92;
 return icon(a.ic,150,y,26,1.5)+txt('sub',210,y-8,27,`width:${P(1200)};color:var(--paper);font-weight:300`,a.t);}).join('')
 + `<div class="a hair" style="left:${P(150)};top:${P(896)};width:${P(1620)};height:1px"></div>`
 + txt('h reg',150,924,34,`letter-spacing:-.02em;color:var(--sage-light);width:${P(1620)}`,'Queensland is the first state where a GP can carry this pathway. Bond is in Queensland.');

let html = fs.readFileSync(S+'/bond.src.html','utf8');
html = html
 .replace('/*__FONTS__*/', fs.readFileSync(S+'/fonts-inline.css','utf8'))
 .replace('<!--PROB-->',PROB).replace('<!--ROWS-->',ROWS).replace('<!--FINDINGS-->',FINDINGS)
 .replace('<!--CHART-->',CHART).replace('<!--STEPS-->',STEPS).replace('<!--REVENUE-->',REVENUE)
 .replace('<!--STATUS-->',STATUS).replace('<!--TEAM-->',TEAM).replace('<!--ASK-->',ASK)
 .replace('__IMG_FINDER__','data:image/png;base64,'+fs.readFileSync(S+'/crop-finder.png').toString('base64'))
 .replace('__CONTACT__', process.env.CONTACT || 'add contact email before sending');
let n=0;
html = html.replace(/<section class="slide[\s\S]*?<\/section>/g,(sec)=>{n++;return sec.replace(/(<div class="a num"[^>]*>)[^<]*(<\/div>)/,`$1${String(n).padStart(2,'0')}$2`);});
if(!n) throw new Error('renumber matched no slides');
html = html.replace(/[^\x00-\x7F]/gu,(c)=>'&#'+c.codePointAt(0)+';');
fs.writeFileSync(S+'/deck.html',html);
console.log('deck.html',n,'slides,',(fs.statSync(S+'/deck.html').size/1024/1024).toFixed(2),'MB');
