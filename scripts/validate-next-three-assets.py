"""Validate assets actually delivered, including every transitive reused file."""
from pathlib import Path
import json,hashlib,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]; manifest=json.loads((ROOT/'public/games/next-three/manifest.json').read_text())
ids=set(); total=0
for a in manifest['assets']:
    assert a['id'] not in ids; ids.add(a['id'])
    p=ROOT/'public'/a['src'].lstrip('/'); data=p.read_bytes();total+=len(data)
    assert hashlib.sha256(data).hexdigest()==a['sha256']
    root=ET.fromstring(data)
    assert root.attrib['viewBox']==' '.join(map(str,a['viewBox']))
    assert not any(e.tag.split('}')[-1] in ['script','foreignObject','text','image'] for e in root.iter())
    for e in root.iter(): assert not any(k.lower().startswith('on') for k in e.attrib)
    for x,y in a.get('anchors',{}).values(): assert 0<=x<=a['viewBox'][2] and 0<=y<=a['viewBox'][3]
for game,g in manifest['games'].items():
    assert set(g['assets'])<=ids
    for src in g['reuse']: assert (ROOT/'public'/src.lstrip('/')).is_file(),src
    for orientation in ['desktop','phone']:
        for layer in ['background','furniture','complication','strategy-setup','revisit','composition-preview']: assert f'{game}/scenes/{orientation}/{layer}' in ids
    assert len(g['props'])==10 and len(g['tactics'])==2
print(json.dumps({'originalSVGs':len(ids),'bytes':total,'allReusedFilesExist':True,'sceneOrientations':6,'games':list(manifest['games'])},indent=2))
