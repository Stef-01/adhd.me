"""Add channel-specific, natively rendered marketing deliverables without resizing photo masters."""
from pathlib import Path
import json
r=Path('design/marketing/static-2026');m=json.loads((r/'manifest.json').read_text(encoding='utf-8'));known={a['id'] for a in m['assets']}
linkedin='https://www.linkedin.com/help/linkedin/answer/a426534'
mail='https://mailchimp.com/help/image-requirements-for-templates/'
variants=[('linkedin-landscape-628','newsletter-header',1200,628,linkedin),('linkedin-landscape-627','newsletter-header',1200,627,'https://business.linkedin.com/advertise/ads/ads-guide'),('linkedin-square','social-square',1200,1200,linkedin),('linkedin-portrait','social-portrait',720,900,linkedin),('newsletter-header-1320','newsletter-header',1320,660,mail),('newsletter-feature-1320','newsletter-feature',1320,660,mail)]
for id,parent,w,h,url in variants:
 a=next(a for a in m['assets'] if a['id']==parent);s=(r/a['source']).read_text(encoding='utf-8').replace(f'--w:{a["width"]}px;--h:{a["height"]}px',f'--w:{w}px;--h:{h}px').replace(f'--pad:{round(a["width"]*.062)}px',f'--pad:{round(w*.062)}px')
 (r/'templates'/f'{id}.html').write_text(s,encoding='utf-8')
 if id not in known:m['assets'].append({**a,'id':id,'width':w,'height':h,'source':f'templates/{id}.html','export':f'exports/{id}.png','specification':url,'sizeBasis':'published channel dimensions','maxBytes':1000000 if id.startswith('newsletter') else 5000000})
# Transparent utility artwork is deliberately native SVG, not flattened white artwork.
graphics=[
 ('accent-arrow-ink',600,240,'<path d="M70 120H520m-75-75 75 75-75 75" stroke="#1A1C1C" stroke-width="18" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
 ('accent-arrow-white',600,240,'<path d="M70 120H520m-75-75 75 75-75 75" stroke="#FFFFFF" stroke-width="18" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
 ('accent-stop',256,256,'<rect x="40" y="40" width="176" height="176" fill="#E94D2D"/>'),
 ('quote-mark-yellow',512,384,'<path d="M70 290V165Q70 60 210 55v60q-65 5-65 60h65v115Zm230 0V165Q300 60 440 55v60q-65 5-65 60h65v115Z" fill="#F2CA16"/>'),
 ('editorial-rule',1600,96,'<path d="M40 48H1496" stroke="#1A1C1C" stroke-width="4"/><rect x="1520" y="28" width="40" height="40" fill="#E94D2D"/>'),
 ('slide-corner-frame',1920,1080,'<path d="M80 230V80h260M1580 1000h260V850" fill="none" stroke="#F2CA16" stroke-width="12"/><rect x="1816" y="80" width="24" height="24" fill="#E94D2D"/>'),
 ('photo-frame-portrait',1080,1350,'<rect x="30" y="30" width="1020" height="1290" rx="26" fill="none" stroke="#F2CA16" stroke-width="12"/><rect x="992" y="1258" width="32" height="32" fill="#E94D2D"/>')]
(r/'graphics').mkdir(exist_ok=True)
for id,w,h,body in graphics:
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img"><title>{id}</title>{body}</svg>'
 (r/'graphics'/f'{id}.svg').write_text(svg,encoding='utf-8')
 (r/'templates'/f'{id}.html').write_text(f'<!doctype html><html lang="en"><meta charset="utf-8"><title>{id}</title><style>html,body{{margin:0;background:transparent}}.canvas{{width:{w}px;height:{h}px}}svg{{display:block;width:100%;height:100%}}</style><main class="canvas">{svg}</main></html>',encoding='utf-8')
 if id not in known:m['assets'].append({'id':id,'width':w,'height':h,'source':f'templates/{id}.html','export':f'exports/{id}.png','vector':f'graphics/{id}.svg','layout':'utility','transparent':True,'sizeBasis':'house utility canvas; not a platform mandate'})
for id,dark in [('name-bar-light-1920',False),('name-bar-dark-1920',True)]:
 s=(r/'templates/name-bar.html').read_text(encoding='utf-8').replace('--w:1600px','--w:1920px')
 if dark:s+='<style>.name .copy{background:#1A1C1C;color:#FAFAF7}</style>'
 (r/'templates'/f'{id}.html').write_text(s,encoding='utf-8')
 if id not in known:m['assets'].append({'id':id,'width':1920,'height':360,'source':f'templates/{id}.html','export':f'exports/{id}.png','layout':'name','transparent':True,'editableName':True,'sizeBasis':'house overlay canvas for 1920-wide artwork'})
for parent in ['program-cover','reflection-worksheet','poster-a-series','info-sheet','pamphlet-outside','pamphlet-inside']:
 a=next(a for a in m['assets'] if a['id']==parent);id=parent+'-a4-300ppi';w=a['width']*2;h=a['height']*2
 s=(r/a['source']).read_text(encoding='utf-8')+'<style>.canvas{transform:scale(2);transform-origin:0 0}</style>'
 (r/'templates'/f'{id}.html').write_text(s,encoding='utf-8')
 if id not in known:m['assets'].append({**a,'id':id,'width':w,'height':h,'source':f'templates/{id}.html','export':f'exports/{id}.png','physicalSizeMm':[210,297] if h>w else [297,210],'nominalPpi':300,'sizeBasis':'A4 trim-size raster at nominal 300 pixels per inch; RGB, no bleed'})
for a in m['assets']:
 if a['id']=='name-bar':a['transparent']=True
 if a['id'].startswith('newsletter'):a['maxBytes']=1000000
 a.setdefault('transparent',False)
m['status']=f"{len(m['assets'])} editable layouts with PNG exports; platform-specific formats and reusable alpha graphics; see STANDARDS.md and inventory.csv."
(r/'manifest.json').write_text(json.dumps(m,indent=2),encoding='utf-8')
p=Path('scripts/export-static-campaign.mjs');s=p.read_text(encoding='utf-8').replace("a.layout==='name'","a.transparent===true");p.write_text(s,encoding='utf-8')
p=r/'review/index.html';p.write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><title>ADHD.ME static asset pack</title><style>body{font:16px Arial;margin:40px;background:#eeeae1}h1{font-size:40px}section{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}figure{margin:0}img{width:100%;height:300px;object-fit:contain;background:repeating-conic-gradient(#d2d2ce 0 25%,#f5f5f0 0 50%) 0/24px 24px}figcaption{padding:12px 0}a{color:inherit}</style><h1>ADHD.ME / Static assets</h1><p><a href="identity-sheet.png">Identity masters</a> · <a href="../STANDARDS.md">Sizing and use</a> · <a href="../inventory.csv">Exact asset inventory</a></p><section>'''+''.join(f'<figure><a href="../{a["source"]}"><img src="../{a["export"]}" alt="{a["id"]}"></a><figcaption>{a["id"]} · {a["width"]} × {a["height"]}'+(' · transparent' if a['transparent'] else '')+'</figcaption></figure>' for a in m['assets'])+'</section></html>',encoding='utf-8')
print(len(m['assets']),'layout records')
