from pathlib import Path
import json,csv,hashlib,shutil
from PIL import Image
r=Path('design/marketing/static-2026');m=json.loads((r/'manifest.json').read_text(encoding='utf-8'));checks=[];copies=[]
def inspect(p,expected=None,alpha=False,cap=None):
 with Image.open(p) as im:
  im.load(); size=im.size; extrema=im.convert('RGBA').getchannel('A').getextrema(); hist=im.convert('RGBA').getchannel('A').histogram()
  assert not expected or size==expected,(p,size,expected)
  assert not alpha or (extrema==(0,255) and im.getbbox()),(p,extrema)
  assert not cap or p.stat().st_size<cap,(p,p.stat().st_size,cap)
  return dict(file=p.relative_to(r).as_posix(),width=size[0],height=size[1],mode=im.mode,alphaMin=extrema[0],alphaMax=extrema[1],transparentPercent=round(hist[0]/(size[0]*size[1])*100,2),bytes=p.stat().st_size)
for a in m['assets']:
 p=r/a['export'];checks.append(inspect(p,(a['width'],a['height']),a['transparent'],a.get('maxBytes')))
 if a['transparent']:copies.append(p)
for name in json.loads((r/'identity/vector-manifest.json').read_text(encoding='utf-8'))['masters']:
 p=r/'identity'/name;s=p.read_text(encoding='utf-8');assert '<text' not in s and '<image' not in s
 p=p.with_name(p.stem+'-2x.png');alpha=name not in ['mark-yellow.svg','mark-ivory.svg'];checks.append(inspect(p,alpha=alpha))
 if alpha:copies.append(p)
out=r/'transparent-png';out.mkdir(exist_ok=True)
for p in copies:shutil.copy2(p,out/p.name)
(out/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><title>Transparent assets</title><style>body{font:16px Arial;margin:32px;background:#eee}section{display:grid;grid-template-columns:1fr 1fr;gap:24px}figure{margin:0}img{width:100%;height:160px;object-fit:contain}div{background:white;padding:16px}div.dark{background:#252629}figcaption{padding:12px}</style><h1>Transparent PNGs</h1><p>Each asset shown on light and dark backgrounds. Click to open the original transparent PNG.</p><section>'+''.join(f'<figure><a href="{p.name}"><div><img alt="{p.stem}" src="{p.name}"></div><div class="dark"><img alt="{p.stem} on dark" src="{p.name}"></div></a><figcaption>{p.name}</figcaption></figure>' for p in copies)+'</section></html>',encoding='utf-8')
rows=[]
for folder in ['identity','photography','exports','graphics']:
 for p in sorted((r/folder).glob('*')):
  if p.suffix not in ['.png','.svg']:continue
  info=inspect(p) if p.suffix=='.png' else {}
  rows.append(dict(file=p.relative_to(r).as_posix(),width=info.get('width','vector'),height=info.get('height','vector'),transparent=info.get('alphaMin',255)<255 if info else 'SVG; see artboard',bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),purpose=folder))
with (r/'inventory.csv').open('w',newline='',encoding='utf-8') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
(r/'review/standards-validation.json').write_text(json.dumps(dict(passed=True,layoutCount=len(m['assets']),transparentProductionCount=len(copies),inventoryCount=len(rows),checks=checks),indent=2),encoding='utf-8')
print(f"PASS: {len(m['assets'])} layouts, {len(copies)} transparent reusable PNGs, {len(rows)} canonical PNG/SVG files")
