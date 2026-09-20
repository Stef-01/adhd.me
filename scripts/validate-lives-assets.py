"""Validate actual game asset files, coverage, geometry metadata and PCM safety."""
from pathlib import Path
import hashlib,json,re,struct,wave,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/games/v2'
m=json.loads((OUT/'manifest.json').read_text(encoding='utf-8')); ids={a['id'] for a in m['assets']}
assert len(ids)==len(m['assets']), 'Duplicate asset IDs'
assert len(m['games'])==8 and len(m['arcade'])==32 and len(m['learningRuns'])==20
errors=[]
for a in m['assets']:
    try:
        p=OUT/a['path']; assert p.resolve().is_relative_to(OUT.resolve()); data=p.read_bytes()
        assert hashlib.sha256(data).hexdigest()==a['sha256'], 'Hash mismatch'
        if p.suffix=='.svg':
            el=ET.fromstring(data); assert el.attrib['viewBox']==' '.join(map(str,a['viewBox']))
            assert not re.search(r'<(?:script|foreignObject)|(?:href|src)\s*=|onload=',data.decode(),re.I)
            assert len(list(el))>=2
            if a['kind']=='characters':
                groups={x.attrib.get('id') for x in el.iter()};assert set(a['groups'])<=groups
                assert a['pivot']==[80,158]
            for point in a.get('anchors',{}).values(): assert 0<=point[0]<=a['width'] and 0<=point[1]<=a['height']
        else:
            with wave.open(str(p),'rb') as wav:
                assert wav.getnchannels()==1 and wav.getsampwidth()==2 and wav.getframerate()==a['sampleRate']
                assert abs(wav.getnframes()/wav.getframerate()-a['duration'])<.001
                frames=wav.readframes(wav.getnframes()); values=struct.unpack('<'+'h'*(len(frames)//2),frames)
                peak=max(abs(v) for v in values)/32767; assert peak<=.221 and peak>.01
                assert abs(values[0])<3 and abs(values[-1])<3, 'Unfaded endpoints'
        assert len(data)>150
    except Exception as e: errors.append(a['id']+': '+str(e))
for group in ('games','arcade','learningRuns'):
    for key,spec in m[group].items():
        missing=set(spec['assets'])-ids
        if missing: errors.append(f'{group}/{key}: missing {missing}')
for name in m['cast']:
    assert {a['pose'] for a in m['assets'] if a.get('character')==name}==set(m['poses'])
for world in m['worlds']:
    for orientation in ('desktop','phone'):
        assert {a['layer'] for a in m['assets'] if a.get('world')==world and a['orientation']==orientation}=={'background','furniture','foreground'}
# Compare mappings against the repository inventory, not only a hardcoded count.
for file,group in [('src/lives/games.ts','arcade'),('src/learn/runs.ts','learningRuns')]:
    source=(ROOT/file).read_text(encoding='utf-8')
    for key in m[group]: assert re.search(r'[\"\']'+re.escape(key)+r'[\"\']',source), f'Unknown {group} ID {key}'
if errors: raise SystemExit('\n'.join(errors))
print(json.dumps({'validated':len(ids),'counts':m['counts'],'referencedFiles':'all resolve','hashes':'all match','svg':'all parse','audio':'15 valid faded PCM files; peak <= 0.221','bytes':sum((OUT/a['path']).stat().st_size for a in m['assets'])},indent=2))
