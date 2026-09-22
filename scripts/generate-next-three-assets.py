"""Original, editable production art for Zoe, Mia and Arjun; no new dependencies."""
from pathlib import Path
import json, hashlib, xml.etree.ElementTree as ET
from html import escape
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/games/next-three'; OUT.mkdir(parents=True,exist_ok=True)
INK='#34313D'; PAPER='#FFF8E9'
ASSETS=[]
def rect(x,y,w,h,fill,r=12): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"/>'
def path(d,c=INK,w=4,fill='none'): return f'<path d="{d}" fill="{fill}" stroke="{c}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'
def circle(x,y,r,c): return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}"/>'
def group(name,s): return f'<g id="{name}">{s}</g>'
def save(game,name,body,w=128,h=128,kind='prop',**meta):
    dest=OUT/game/(name+'.svg');dest.parent.mkdir(parents=True,exist_ok=True)
    source=f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img"><title>{escape(game+": "+name.replace("/"," · ").replace("-"," "))}</title>{body}</svg>'
    dest.write_text(source,encoding='utf-8',newline='\n')
    ASSETS.append(dict(id=game+'/'+name,src='/games/next-three/'+game+'/'+name+'.svg',kind=kind,viewBox=[0,0,w,h],sha256=hashlib.sha256(source.encode()).hexdigest(),**meta))
    return source

def icon(name):
    # Each object has its own silhouette and purposeful state, rather than a recoloured tile.
    drawings={
    'draft-envelope': rect(12,26,104,76,'#E5A0B5',9)+path('M14 30 64 72 114 30','#854664')+rect(30,10,68,44,PAPER,5)+path('M42 24h44m-44 12h28','#AD718A',3),
    'fact-fragment': path('M18 16h74l18 18v76H18Z',w=0,fill='#DBE8D1')+circle(42,42,13,'#80A887')+path('m35 42 5 5 10-12',PAPER,3)+path('M34 73h62m-62 14h44','#52715B',4),
    'unknown-fragment': path('M18 16h74l18 18v76H18Z',w=0,fill='#EFE1F1')+path('M51 38q0-18 18-16 20 4 3 20l-8 7v6','#8A6299',5)+circle(64,68,3,'#8A6299')+path('M34 90h60','#BA9DC5'),
    'need-fragment': rect(20,15,88,98,'#F8D89C',8)+path('M64 68C26 48 35 25 51 35L64 46 77 35C95 25 105 48 64 68Z','#C28A46',3, '#F4B779')+path('M36 90h56','#AD793D'),
    'request-fragment': rect(20,15,88,98,'#C9DCE9',8)+path('M38 51h49m-15-15 15 15-15 15','#537A92',5)+path('M37 88h53','#759BB1'),
    'calendar-open': rect(14,22,100,91,PAPER,9)+rect(14,22,100,24,'#B65D7D',8)+path('M35 12v24m58-24v24','#6D3B53',6)+''.join(circle(x,y,5,'#D6B6C3') for x in [36,64,92] for y in [63,87]),
    'calendar-agreed': rect(14,22,100,91,PAPER,9)+rect(14,22,100,24,'#B65D7D',8)+path('M35 12v24m58-24v24','#6D3B53',6)+path('m38 77 17 17 33-37','#527D68',7),
    'boundary-ribbon': path('M15 22h98v68H75l-11 18-11-18H15Z',w=0,fill='#D9B6D5')+path('M46 66V39q0-9 7-3v17-24q6-9 10 0v24-26q8-6 9 2v24-19q8-6 9 3v27q-2 24-24 22L36 65q-4-13 7-6l9 9','#744F73',3,PAPER),
    'return-cue': circle(64,63,46,'#EBD3A8')+path('M84 42a28 28 0 1 0 4 38M85 24v20H65','#906C3D',5)+path('M64 43v22l14 9','#906C3D'),
    'agreement-link': path('M55 78H39a22 22 0 0 1 0-44h21m12 0h17a22 22 0 0 1 0 44H68M45 56h38','#678777',12),
    'charger-loose': path('M68 50q-46-5-46 28t37 22q24-5 21-24','#705784',6)+rect(51,28,44,42,'#EEE8F1',8)+path('M62 17v13m21-13v13','#705784',6)+rect(76,67,16,23,'#BDA7CE',4),
    'charger-docked': rect(8,88,112,25,'#B69DC9',7)+rect(38,47,52,43,PAPER,8)+path('M50 35v14m27-14v14','#705784',5)+path('m53 70 9 8 18-18','#69816D',4),
    'parcel-sealed': path('M14 38 64 15 114 38v57l-50 23-50-23Z','#A8794B',3,'#DBAE75')+path('m14 38 50 22 50-22M64 60v58M40 26l49 22v25','#AC815B',4)+rect(29,66,21,16,PAPER,2),
    'parcel-ready': path('M14 38 64 15 114 38v57l-50 23-50-23Z','#A8794B',3,'#DBAE75')+path('m14 38 50 22 50-22M64 60v58','#AC815B',4)+circle(88,87,24,'#759B85')+path('m75 86 9 10 17-20',PAPER,4),
    'portable-cue': path('M31 23q0-25 21-12l20 16','#6C527C',5)+rect(27,20,74,96,'#FFE4A4',10)+circle(43,35,5,'#AD884F')+path('M43 57h42m-42 15h30m-30 15h38','#A28354',4),
    'threshold-cue': rect(9,21,110,85,'#BEA5D4',8)+rect(23,34,82,59,PAPER,5)+path('M41 64h45m-14-13 14 13-14 13','#755888',5),
    'object-home': path('M10 80 31 57h67l20 23v32H10Z','#96729F',3,'#CDB5D6')+path('M10 80h108','#96729F',3)+path('M45 94h37',PAPER,5),
    'shared-board': rect(10,14,108,104,'#987797',8)+rect(17,21,94,90,'#EAE3D6',4)+path('M64 26v78','#B5A1B5',3)+rect(25,39,30,24,'#F3CF7B',2)+rect(74,75,28,25,'#97BAB0',2),
    'owner-token': circle(64,64,45,'#C6DCCC')+circle(64,49,14,'#5F806C')+path('M36 89q0-29 28-29t28 29',w=0,fill='#5F806C'),
    'intention-thread': path('M15 97C15 20 57 110 65 47s43-34 44 16','#9676B0',7)+circle(15,97,10,'#F1BC31')+path('m98 56 11 12 9-15','#9676B0',5),
    'agenda-anchor': path('M28 12h72v101L64 92l-36 21Z',w=0,fill='#B4C7E8')+circle(64,40,9,PAPER)+path('M64 49v31m-20-17q0 23 20 23t20-23M48 58h32','#526C9C',4),
    'fact-tile': path('M17 30 37 10h74v88l-20 20H17Z','#7199A6',3,'#C4E2DF')+path('M17 30h74v88M91 30l20-20','#91B7BF',3)+path('M33 54h41m-41 17h33m-33 17h40','#4D7885',4),
    'question-tile': path('M17 30 37 10h74v88l-20 20H17Z','#A28EBC',3,'#DDD0EF')+path('M17 30h74v88M91 30l20-20','#B7A5CC',3)+path('M42 54q1-16 15-12 15 5 3 17l-8 6v8','#755794',4)+circle(52,86,3,'#755794'),
    'idea-tile': path('M17 30 37 10h74v88l-20 20H17Z','#BE9B59',3,'#F6DFA0')+path('M17 30h74v88M91 30l20-20','#D4B777',3)+path('M45 78v-7q-21-23-1-31 27-12 24 14-1 8-11 17v7M44 85h15','#9D7838',4),
    'parking-pocket': path('M10 36h108v72H10Z',w=0,fill='#879ABD')+path('M10 36 64 75 118 36','#546B95',3)+rect(26,14,76,46,'#F9DE9C',4)+path('M44 29h41m-41 12h24','#AF8D4D',3),
    'turn-token': circle(64,64,48,'#B7C8E5')+circle(64,64,35,PAPER)+path('M43 53h31m-10-10 12 10-12 10M85 76H54m10-10L52 76l12 10','#5D739A',4),
    'repeat-token': circle(64,64,47,'#D0D9EA')+path('M38 50a30 30 0 1 1 0 29M38 31v21h22','#576E98',5)+path('M61 51h19m-19 13h24m-24 13h17','#576E98',3),
    'decision-bridge': path('M8 94V67q55-76 112 0v27H99V74q-36-47-70 0v20Z','#738EAD',3,'#BFD3E0')+path('M12 97h105','#738EAD',5),
    'action-card': rect(14,13,100,104,PAPER,7)+rect(14,13,100,22,'#7E98BC',7)+circle(36,61,10,'#8AB7A5')+path('M55 57h42m-42 11h29M30 91h66','#748799',4),
    'connection-pin': circle(64,35,20,'#EFCA6D')+path('M64 54v49','#89754B',7)+path('m55 97 9 18 8-18',w=0,fill='#89754B'),
    }
    return drawings[name]
GAMES={
'zoe':dict(title='Before you send',genre='Conversation assembly',wall='#F0DFE3',floor='#D2A4B7',accent='#9A5D7A',partner='rae',props=['draft-envelope','fact-fragment','unknown-fragment','need-fragment','request-fragment','calendar-open','calendar-agreed','boundary-ribbon','return-cue','agreement-link'],tactics=['Clarify the unknown before proposing','Name uncertainty and propose a feasible alternative']),
'mia':dict(title='Remember why',genre='Spatial cue puzzle',wall='#E6DDF0',floor='#B5A6C9',accent='#887299',partner='sam',props=['charger-loose','charger-docked','parcel-sealed','parcel-ready','portable-cue','threshold-cue','object-home','shared-board','owner-token','intention-thread'],tactics=['Carry a portable intention cue','Place cues at the threshold and point of action']),
'arjun':dict(title='Hold the thread',genre='Collaborative information puzzle',wall='#E1E9F5',floor='#9FB5D0',accent='#607DA5',partner='noor',props=['agenda-anchor','fact-tile','question-tile','idea-tile','parking-pocket','turn-token','repeat-token','decision-bridge','action-card','connection-pin'],tactics=['Anchor the agenda and clarify missing information','Park an idea and retrieve it when the decision needs it'])}

# The scene topology differs, not just its palette. Portrait coordinates are authored separately.
for game,g in GAMES.items():
    for name in g['props']:
        save(game,'props/'+name,group('object',icon(name)),pivot=[64,112],minimumTarget=48)
    for orientation,w,h in [('desktop',1200,760),('phone',390,700)]:
        bg=rect(0,0,w,h,g['wall'],0)
        if game=='zoe':
            bg+=rect(0,h*.66,w,h*.34,g['floor'],0)
            # A side-on two-person scene, with a large uncluttered private draft space.
            window=rect(w*.08,38,w*.24,180,'#B4BFCF',70)+circle(w*.22,90,26,'#FFF0C7')+path(f'M{w*.2} 40v176',g['wall'],9)
            sofa=rect(w*.05,h*.50,w*.33,150,'#B47791',32)+rect(w*.07,h*.57,w*.29,100,'#CD95AC',18)
            table=rect(w*.42,h*.74,w*.49,25,'#9B6B61',15)+path(f'M{w*.47} {h*.77}v105M{w*.86} {h*.77}v105','#9B6B61',12)
            furniture=window+sofa+table
            furniture+=path(f'M{w*.09} {h*.70}v20M{w*.34} {h*.70}v20','#8D5D73',8)
            furniture+=rect(w*.07,h*.525,w*.115,45,'#DCAEBF',12)+rect(w*.22,h*.525,w*.12,45,'#ECC4B0',12)
            furniture+=path(f'M{w*.39} {h*.58}V{h*.28}', '#916B5D',5)+path(f'M{w*.34} {h*.30}l{w*.025} {-h*.09}h{w*.06}l{w*.025} {h*.09}Z',w=0,fill='#F2CE8F')
            furniture+=rect(w*.72,h*.07,w*.12,h*.13,'#FFF5DF',5)+path(f'M{w*.74} {h*.16}l{w*.035} {-h*.05} {w*.03} {h*.03} {w*.02} {-h*.015}', '#B5949F',3)
            furniture+=path(f'M{w*.96} {h*.72}v{-h*.18}', '#6A8A76',4)+path(f'M{w*.96} {h*.60}q{-w*.06} {-h*.01} {-w*.035} {-h*.08}q{w*.04} {h*.025} {w*.035} {h*.08}',w=0,fill='#91AE91')
            furniture+=path(f'M{w*.92} {h*.71}h{w*.075}l{-w*.01} {h*.08}h{-w*.055}Z',w=0,fill='#AD816B')
            anchors={'self':[.22,.65],'partner':[.78,.66],'draft':[.62,.35],'calendar':[.90,.23],'commitment':[.68,.80]}
            setup=rect(w*.43,h*.77,w*.46,h*.15,PAPER,10)+path(f'M{w*.65} {h*.79}v{h*.10}',g['accent'],3)
            complication=path(f'M{w*.35} {h*.39}q{w*.13} {-h*.09} {w*.20} 0',g['accent'],4)
        elif game=='mia':
            # Three discrete rooms; corridor supports semantic travel, not a flat backdrop.
            rooms=[(.035,.07,.43,.36),(.53,.07,.435,.36),(.035,.56,.93,.40)]
            furniture=''.join(rect(w*x,h*y,w*rw,h*rh,c,18) for (x,y,rw,rh),c in zip(rooms,['#D3DAC3','#F1D5B8','#DAC1D5']))
            furniture+=rect(w*.065,h*.29,w*.28,65,'#A2B294',8)+rect(w*.67,h*.25,w*.25,62,'#CF9E77',10)+rect(w*.1,h*.70,w*.29,100,'#A8869F',22)
            furniture+=path(f'M{w*.095} {h*.29+65}v20M{w*.32} {h*.29+65}v20','#758D6C',5)
            furniture+=rect(w*.11,h*.18,w*.18,h*.105,'#687C75',7)+rect(w*.123,h*.193,w*.154,h*.077,'#DCE5D3',3)
            furniture+=rect(w*.685,h*.265,w*.075,35,'#FFF1D0',8)+path(f'M{w*.78} {h*.255}v50','#B2805E',3)
            furniture+=rect(w*.12,h*.72,w*.105,35,'#D4B4C6',8)+rect(w*.245,h*.72,w*.12,35,'#E4CCA7',8)
            furniture+=path(f'M{w*.13} {h*.70+100}v18M{w*.36} {h*.70+100}v18','#8B6D86',5)
            furniture+=rect(w*.62,h*.10,w*.22,h*.10,'#FAF3DA',25)+path(f'M{w*.73} {h*.10}v{h*.10}', '#D3B9CA',4)
            furniture+=path(f'M{w*.50} 0v{h*.45}M0 {h*.49}h{w}',g['accent'],5)
            furniture+=rect(w*.75,h*.60,w*.15,h*.31,'#B78C73',30)+circle(w*.86,h*.78,6,PAPER)
            anchors={'self':[.46,.52],'partner':[.23,.84],'charger':[.20,.27],'parcel':[.74,.38],'portable':[.50,.53],'threshold':[.50,.47],'board':[.57,.76],'door':[.83,.85]}
            setup=rect(w*.52,h*.64,w*.17,h*.22,'#937996',9)+rect(w*.54,h*.66,w*.13,h*.18,PAPER,5)
            complication=path(f'M{w*.46} {h*.40}q{-w*.08} {-h*.08} {-w*.16} 0',g['accent'],4)
        else:
            # Top-down meeting surface: no room-traversal or insect-catching interaction.
            furniture=rect(w*.08,h*.19,w*.84,h*.63,'#B9C9DC',min(w*.15,110))+rect(w*.11,h*.22,w*.78,h*.56,'#D3DFE9',min(w*.13,95))
            furniture+=rect(w*.24,h*.09,w*.17,h*.08,'#7790B4',20)+rect(w*.61,h*.09,w*.17,h*.08,'#A9B89E',20)+rect(w*.43,h*.83,w*.17,h*.10,'#7790B4',20)
            furniture+=rect(w*.08,h*.035,w*.055,h*.10,'#FAF8E9',9)+circle(w*.107,h*.074,w*.012,'#AC9988')
            furniture+=path(f'M{w*.89} {h*.25}l{-w*.035} {h*.08}', '#718AA8',6)
            furniture+=rect(w*.38,h*.27,w*.23,h*.025,'#BBCBD8',6)
            # Three open working spaces are genuine limited board slots.
            for x in [.22,.43,.64]: furniture+=rect(w*x,h*.37,w*.14,h*.20,'#ECF0F2',9)
            anchors={'self':[.51,.90],'partner':[.32,.19],'colleague':[.70,.19],'agenda':[.28,.29],'slot1':[.29,.47],'slot2':[.50,.47],'slot3':[.71,.47],'parking':[.82,.68],'decision':[.45,.70]}
            setup=rect(w*.19,h*.61,w*.43,h*.13,PAPER,8)
            complication=path(f'M{w*.71} {h*.24}q{w*.12} {-h*.08} {w*.17} {h*.02}',g['accent'],4)
        prefix='scenes/'+orientation+'/'
        save(game,prefix+'background',group('background',bg),w,h,'scene',orientation=orientation,layer=0)
        save(game,prefix+'furniture',group('furniture',furniture),w,h,'scene',orientation=orientation,layer=1,anchors={k:[round(x*w),round(y*h)] for k,(x,y) in anchors.items()})
        save(game,prefix+'complication',group('complication',complication),w,h,'overlay',orientation=orientation,layer=2)
        save(game,prefix+'strategy-setup',group('strategy-setup',setup),w,h,'overlay',orientation=orientation,layer=2)
        # Saved strategy is visible during a new encounter, never a score or a win stamp.
        saved=setup+circle(w*.92,h*.90,13,'#E7C575')+path(f'M{w*.915} {h*.887}v{h*.022}',g['accent'],3)
        save(game,prefix+'revisit',group('revisit',saved),w,h,'overlay',orientation=orientation,layer=2)
        cast=''
        for who,anchor in ([(game,'self'),(g['partner'],'partner'),('rae','colleague')] if game=='arjun' else [(game,'self'),(g['partner'],'partner')]):
            raw=ET.parse(ROOT/f'public/games/v2/characters/{who}/thinking.svg').getroot()
            inner=''.join(ET.tostring(e,encoding='unicode') for e in list(raw)[1:])
            x,y=anchors[anchor]; size=100 if orientation=='phone' else 160
            cast+=f'<g transform="translate({w*x-size/2} {h*y-size}) scale({size/160})">{inner}</g>'
        save(game,prefix+'composition-preview',bg+furniture+setup+cast,w,h,'preview',orientation=orientation)
    # New acting poses keep the canonical rig's body and face; no character identity drift.
    arms={'zoe':{'hold-draft':'M15 77l20 16 19-6M105 77 86 94 70 87','set-boundary':'M15 77 1 63V44M105 77l10 14','offer-plan':'M15 77 32 91M105 77l19-8 10-13'},'mia':{'place-cue':'M15 77 33 92M105 77l16-20 10-2','recall':'M15 77 7 56 15 43M105 77l12 16','share-task':'M15 77 0 68M105 77l18-9'},'arjun':{'offer-turn':'M15 77 0 63-7 0M105 77l9 16','pin-anchor':'M15 77 30 90M105 77l19-27','retrieve-idea':'M15 77-2 88-6-9M105 77l-22 12'}}[game]
    for pose,d in arms.items():
        root=ET.parse(ROOT/f'public/games/v2/characters/{game}/thinking.svg').getroot()
        for e in root.iter():
            if e.attrib.get('id')=='arms':
                for child in list(e): e.remove(child)
                e.append(ET.fromstring(path(d, {'zoe':'#7A2450','mia':'#61407C','arjun':'#1E3A8A'}[game],6)))
        body=''.join(ET.tostring(e,encoding='unicode') for e in list(root)[1:])
        save(game,'characters/'+pose,body,160,176,'character',pivot=[80,158])

manifest={'version':'1.0.0','status':'Art and integration contracts ready for prototype implementation; not shipped gameplay.','provenance':'Original project-authored SVG geometry, extending the existing canonical vector cast. No external images or copied artwork.','assets':ASSETS,'games':{}}
for game,g in GAMES.items():
    reuse=[f'/games/v2/characters/{who}/{pose}.svg' for who in ([game,g['partner'],'rae'] if game=='arjun' else [game,g['partner']]) for pose in ['neutral','thinking','overwhelmed','frustrated','sad','relieved','focused','reach','carry','resting','walk-a','walk-b']]
    sounds={'zoe':['page-turn','notify','place','breath-out'],'mia':['footstep','pickup','place','door'],'arjun':['page-turn','place','pickup','complete']}[game]
    manifest['games'][game]={**g,'assets':[a['id'] for a in ASSETS if a['id'].startswith(game+'/')],'reuse':reuse+[f'/games/v2/audio/{s}.wav' for s in sounds]+[f'/games/v2/props/{p}.svg' for p in {'zoe':['phone-screen','phone-off','water-cup'], 'mia':['keys','bag-empty','bag-packed'], 'arjun':['agenda','water-cup']}[game]], 'renderOrder':['background','furniture','state overlay','interactive props','characters','DOM controls'],'minimumTarget':48,'motion':{'acceptedActionMs':140,'placementMs':220,'transitionMs':320,'reducedMotion':'Use static poses, instantaneous placements and persistent status text; no automatic camera motion.'},'audio':'Off until explicit consent. Semantic visible feedback accompanies every sound. Stop and release on exit.'}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f'Created {len(ASSETS)} original SVG assets and '+str(sum(len(g['reuse']) for g in manifest['games'].values()))+' reusable asset references.')
