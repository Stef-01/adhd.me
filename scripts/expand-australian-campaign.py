from pathlib import Path
import json,math
r=Path('design/marketing/static-2026');m=json.loads((r/'manifest.json').read_text(encoding='utf-8'));known={a['id'] for a in m['assets']}
for p in r.rglob('*'):
 if p.suffix in ['.html','.md','.json','.css','.csv']:
  s=p.read_text(encoding='utf-8');p.write_text(s.replace('adhdme.vercel.app','adhdme.au'),encoding='utf-8')
y='#F2CA16';ink='#1A1C1C';sage='#718577';sand='#D9AD7B';red='#E94D2D';paper='#F6F2E8'
def path(d,c=ink,w=9):return f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'
def circle(x,y0,rad,c):return f'<circle cx="{x}" cy="{y0}" r="{rad}" fill="{c}"/>'
icons={
'eucalyptus':path('M120 430Q240 290 370 65',sage,8)+''.join(f'<ellipse cx="{x}" cy="{z}" rx="25" ry="67" transform="rotate({rot} {x} {z})" fill="{sage}"/>' for x,z,rot in [(180,345,-48),(252,300,48),(244,233,-43),(317,177,42),(319,110,-30)]),
'wattle':path('M140 440Q210 270 352 80',sage,8)+''.join(circle(x,z,23,y) for x,z in [(160,330),(228,340),(218,255),(290,255),(275,178),(342,182),(327,106)])+path('M165 380L105 310M290 210L385 245',sage,7),
'gum-leaf':f'<path d="M125 430Q65 110 406 65Q395 380 125 430Z" fill="{sage}"/>'+path('M125 430Q180 210 406 65',paper,6),
'banksia':f'<rect x="205" y="120" width="102" height="220" rx="51" fill="{sand}"/>'+path('M256 340V450M255 395L140 330M257 370L365 290',sage,10)+''.join(path(f'M210 {z}l85 -20',y,10) for z in range(160,330,28)),
'coastal-sun':circle(256,185,77,y)+''.join(path(f'M70 {z}Q160 {z-40} 256 {z}T442 {z}',sage,10) for z in [310,355,400]),
'sandstone-ridge':f'<path d="M55 395L145 200L205 260L300 110L457 395Z" fill="{sand}"/>'+path('M85 395H435',ink,9)+path('M245 195L300 110L352 205',paper,9),
'seed-pod':path('M256 440V260',sage,10)+f'<path d="M175 145Q256 95 337 145L317 265Q256 305 195 265Z" fill="{sand}"/>'+f'<ellipse cx="256" cy="145" rx="81" ry="30" fill="{ink}"/>'+circle(245,140,12,paper)+circle(279,152,8,paper),
'coastal-walk':path('M70 430Q380 370 210 285T360 70',sand,44)+circle(365,85,34,y),
'notebook-cue':f'<rect x="125" y="80" width="270" height="350" rx="22" fill="{y}"/>'+path('M180 80V430',ink,8)+path('M225 180H345M225 235H315M225 290H330',ink,8),
'quiet-headphones':path('M125 280V230a131 131 0 0 1 262 0v50',ink,20)+f'<rect x="99" y="240" width="70" height="140" rx="32" fill="{y}"/><rect x="343" y="240" width="70" height="140" rx="32" fill="{y}"/>',
'breathing-space':''.join(f'<ellipse cx="256" cy="256" rx="{rad}" ry="{int(rad*.68)}" fill="none" stroke="{c}" stroke-width="12"/>' for rad,c in [(185,sage),(120,y),(53,sand)]),
'tea-pause':f'<path d="M130 220H330V340Q230 420 130 340Z" fill="{y}"/>'+path('M330 245Q425 225 400 310Q382 348 330 320',ink,12)+path('M160 430H365M195 170Q160 125 200 85M280 170Q245 125 285 85',sage,9)
}
assets=[]
def add(id,w,h,body,transparent=True,category='Australian-inspired icon'):
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}"><title>{id}</title>{body}</svg>'
 (r/'graphics'/f'{id}.svg').write_text(svg,encoding='utf-8')
 (r/'templates'/f'{id}.html').write_text(f'<!doctype html><html lang="en"><meta charset="utf-8"><title>{id}</title><style>html,body{{margin:0;background:transparent}}.canvas{{width:{w}px;height:{h}px}}svg{{width:100%;height:100%;display:block}}</style><main class="canvas">{svg}</main></html>',encoding='utf-8')
 if id not in known:m['assets'].append(dict(id=id,width=w,height=h,source=f'templates/{id}.html',export=f'exports/{id}.png',vector=f'graphics/{id}.svg',layout='utility',transparent=transparent,sizeBasis='house reusable design canvas',category=category))
 assets.append(id)
for id,b in icons.items():add('au-'+id,512,512,b)
for id,b in [('coastal-ribbons',''.join(path(f'M-100 {400+i*90}Q650 {50+i*60} 980 {490+i*35}T2000 {250+i*65}',c,55) for i,c in enumerate([sage,sand,y]))),('sun-disc',circle(1450,800,440,y)+circle(1690,990,200,sand)),('folded-path',path('M1060 100L1600 380L1200 680L1780 960',y,120)),('sandstone-arches',''.join(f'<path d="M{x} 1080V520a180 180 0 0 1 360 0v560" fill="none" stroke="{c}" stroke-width="65"/>' for x,c in [(950,sand),(1170,y),(1390,sage)])),('focus-orbits',''.join(f'<ellipse cx="1470" cy="690" rx="{v}" ry="{v*.65}" fill="none" stroke="{c}" stroke-width="28" transform="rotate(-25 1470 690)"/>' for v,c in [(420,sage),(300,sand),(170,y)])),('paper-shapes',f'<path d="M1100 1080L1300 410L1800 1080Z" fill="{sage}"/>'+circle(1630,370,190,y)+f'<rect x="1030" y="740" width="420" height="290" rx="90" fill="{sand}"/>')]:
 add('abstract-'+id,1920,1080,b,True,'Abstract slide overlay')
 add('slide-'+id,1920,1080,f'<path d="M0 0H1920V1080H0Z" fill="{paper}"/>'+b,False,'Text-free slide background')
# Vertical decorative edges for pamphlets: central space deliberately empty.
add('pamphlet-wattle-edge',1240,1754,f'<g transform="translate(835 1090) scale(.85)">{icons["wattle"]}</g>'+path('M1100 0Q940 420 1150 800',y,45),True,'Pamphlet edge')
add('pamphlet-coastal-edge',1240,1754,''.join(path(f'M{100+i*75} 1900Q{-250+i*90} 1000 {80+i*55} -100',c,60) for i,c in enumerate([sage,sand,y])),True,'Pamphlet edge')
(r/'manifest.json').write_text(json.dumps(m,indent=2),encoding='utf-8')
(r/'AU-ASSETS.md').write_text('# Australian-inspired graphic library\n\n26 original editable SVG/PNG assets: 12 botanical, landscape and everyday wellbeing icons; 6 transparent abstract widescreen overlays; 6 opaque text-free slide backgrounds; 2 transparent pamphlet edges. Add editable text in your slide or page application, over the spacious left side of slide artwork.\n\nPalette extends the yellow, ink and ivory identity with eucalyptus green and sandstone. Botanical illustrations are stylised design motifs, not scientific identification plates. These are contemporary landscape-inspired designs, not Indigenous artworks or cultural symbols.\n\nAll published URLs must be adhdme.au. SVG sources are in graphics/, rendered PNGs in exports/, and reusable alpha exports in transparent-png/. All assets are static.\n',encoding='utf-8')
print(len(assets),'new editable assets')
