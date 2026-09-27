"""Original editable vector assets for the concourse game. Run from repository root."""
from pathlib import Path
import json, hashlib
from xml.etree import ElementTree
ROOT=Path('public/games/maya-journey')
ROOT.mkdir(parents=True,exist_ok=True)
manifest=[]
def save(name, body, box='0 0 100 100'):
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{box}" role="img"><title>{name.replace("-"," ")}</title>{body}</svg>'
    if name.endswith('-floor'): svg=svg.replace('role="img"','role="img" preserveAspectRatio="none"')
    ElementTree.fromstring(svg)
    (ROOT/(name+'.svg')).write_text(svg,encoding='utf-8')
    manifest.append({'id':name,'src':'/games/maya-journey/'+name+'.svg','sha256':hashlib.sha256(svg.encode()).hexdigest()})
palettes=[('station','#ecf4f6','#b6cdd5','#476f83'),('library','#f4ede1','#d0c4a8','#897045'),('market','#f7e7d6','#e7c6a6','#a66e47')]
for name,floor,edge,ink in palettes:
    lines=''.join(f'<path d="M{x} 0V700" stroke="{edge}" opacity=".35"/>' for x in range(0,501,100))
    lines+=''.join(f'<path d="M0 {y}H500" stroke="{edge}" opacity=".35"/>' for y in range(0,701,100))
    detail=''
    if name=='station':
        detail='<path d="M10 16H490M10 26H490" stroke="#6d98a5" stroke-width="5"/><rect x="35" y="42" width="100" height="26" rx="6" fill="#749cab"/>'
    elif name=='library':
        detail=''.join(f'<rect x="{x}" y="18" width="14" height="36" rx="3" fill="{["#8aa491","#d39d78","#a995b3"][x%3]}"/>' for x in range(16,141,18))
    else:
        detail=''.join(f'<path d="M{x} 0h36v35q-18 20-36 0Z" fill="{["#e99b77","#fff5dd"][i%2]}"/>' for i,x in enumerate(range(0,501,36)))
    save(name+'-floor',f'<rect width="500" height="700" rx="24" fill="{floor}"/>{lines}{detail}', '0 0 500 700')
    save(name+'-gate',f'<rect x="10" y="15" width="80" height="74" rx="17" fill="{ink}"/><rect x="20" y="27" width="60" height="49" rx="10" fill="{floor}"/><path d="M32 51h35m-12-12 12 12-12 12" stroke="{ink}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="85" r="3" fill="#f0c858"/><circle cx="76" cy="85" r="3" fill="#f0c858"/>')
    save(name+'-bench',f'<ellipse cx="50" cy="80" rx="43" ry="8" fill="#26384214"/><rect x="10" y="20" width="80" height="28" rx="9" fill="{ink}"/><rect x="8" y="51" width="84" height="13" rx="6" fill="#bc936c"/><path d="M20 64v16m60-16v16" stroke="{ink}" stroke-width="7"/><path d="M14 31h72" stroke="{floor}" opacity=".4" stroke-width="3"/>')
colours=['#d97463','#729fba','#d5ae4d','#79aa8e','#b29ac9','#da9971']
for seed in range(6):
    people=''
    for i in range(4):
        x=17+i*34;y=25+(i%2)*8;colour=colours[(seed+i)%6]
        accessory=f'<path d="M{x-12} {y-10}q12-12 24 0" stroke="#34485d" stroke-width="6" fill="none"/>' if (seed+i)%3==0 else f'<rect x="{x+9}" y="{y+5}" width="10" height="16" rx="4" fill="#62788d"/>'
        people+=f'<ellipse cx="{x}" cy="{y+21}" rx="15" ry="5" fill="#26384218"/><path d="M{x-5} {y+13}v7m10-7v7" stroke="#52606b" stroke-width="3"/><rect x="{x-13}" y="{y-16}" width="26" height="34" rx="13" fill="{colour}"/><path d="M{x-6} {y}h2m8 0h2" stroke="#34485d" stroke-width="2.5" stroke-linecap="round"/>{accessory}'
    save('crowd-'+str(seed),people,'0 0 140 70')
props={
 'clock':'<circle cx="50" cy="48" r="34" fill="#fff6db" stroke="#63808b" stroke-width="8"/><path d="M50 25v25l18 10" fill="none" stroke="#63808b" stroke-width="6" stroke-linecap="round"/><path d="M37 83v9m26-9v9" stroke="#63808b" stroke-width="6"/>',
 'phone-on':'<rect x="25" y="8" width="50" height="84" rx="12" fill="#54667b"/><rect x="31" y="18" width="38" height="58" rx="6" fill="#ffcf9b"/><circle cx="67" cy="20" r="12" fill="#d86459"/><path d="M10 32q-9 15 0 28m80-28q9 15 0 28" fill="none" stroke="#d86459" stroke-width="4"/>',
 'phone-quiet':'<rect x="25" y="8" width="50" height="84" rx="12" fill="#54667b"/><rect x="31" y="18" width="38" height="58" rx="6" fill="#b8d7c7"/><path d="M39 47l8 8 16-19" stroke="#3c705d" stroke-width="5" fill="none" stroke-linecap="round"/>',
 'headphones':'<path d="M20 60V45a30 30 0 0 1 60 0v15" stroke="#496a91" stroke-width="11" fill="none"/><rect x="11" y="48" width="20" height="35" rx="10" fill="#91acd1"/><rect x="69" y="48" width="20" height="35" rx="10" fill="#91acd1"/>',
 'quiet-route':'<path d="M22 86V62q0-18 25-18t25-25V12" fill="none" stroke="#70a48c" stroke-width="14" stroke-linecap="round"/><path d="M60 23l12-12 12 12" fill="none" stroke="#44735e" stroke-width="6" stroke-linejoin="round"/><circle cx="20" cy="84" r="10" fill="#f0c967"/>',
 'speaker':'<rect x="17" y="36" width="20" height="28" rx="6" fill="#567089"/><path d="M37 36l29-20v68L37 64Z" fill="#86a8bd"/><path d="M77 31q17 19 0 38" stroke="#e6b76e" stroke-width="6" fill="none" stroke-linecap="round"/>',
 'step-marker':'<ellipse cx="38" cy="44" rx="10" ry="18" fill="#568b78" transform="rotate(-20 38 44)"/><ellipse cx="65" cy="65" rx="10" ry="18" fill="#568b78" transform="rotate(20 65 65)"/>',
 'waiting':'<circle cx="50" cy="50" r="37" fill="#e9f2e9"/><path d="M50 26v26l16 9" fill="none" stroke="#5d897c" stroke-width="7" stroke-linecap="round"/>',
 'clear-passage':'<path d="M17 55l22 22 44-52" fill="none" stroke="#639b7f" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>'}
for name,body in props.items():save(name,body)
(ROOT/'manifest.json').write_text(json.dumps({'generator':'scripts/generate-maya-polish-assets.py','assets':manifest},indent=2)+'\n',encoding='utf-8')
print(f'{len(manifest)} SVG assets generated and parsed')
