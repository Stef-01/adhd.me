"""Original, deterministic Lives v2 vector and PCM asset production. Python stdlib only."""
from pathlib import Path
import hashlib, html, json, math, random, struct, wave
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/games/v2'
ASSETS = []
INK = '#34302F'
def rect(x,y,w,h,fill,rx=8): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"/>'
def circle(x,y,r,fill): return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"/>'
def ellipse(x,y,rx,ry,fill): return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}"/>'
def path(d,fill='none',stroke=INK,width=4): return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"/>'
def group(id,body,transform=''): return f'<g id="{id}"'+(f' transform="{transform}"' if transform else '')+f'>{body}</g>'
def write_svg(key,body,w=128,h=128,**meta):
    dest=OUT/(key+'.svg'); dest.parent.mkdir(parents=True,exist_ok=True)
    title=html.escape(key.replace('/',' / ').replace('-',' '))
    dest.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img"><title>{title}</title>{body}</svg>\n',encoding='utf-8')
    ASSETS.append(dict(id=key,path=key+'.svg',kind=key.split('/')[0],width=w,height=h,viewBox=[0,0,w,h],sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),**meta))
SHAPES=[
'M60 8c30 0 48 24 48 58s-18 58-48 58S12 100 12 66 30 8 60 8Z',
'M60 10c34 0 50 20 50 54s-16 60-50 60S10 98 10 64 26 10 60 10Z',
'M60 4c26 0 44 30 44 66s-18 54-44 54S16 106 16 70 34 4 60 4Z',
'M60 6c28 0 52 30 52 64 0 30-22 54-52 54S8 100 8 70C8 36 32 6 60 6Z',
'M60 12c32 0 54 24 54 56s-22 56-54 56S6 100 6 68s22-56 54-56Z',
'M60 6c30 0 50 26 50 62 0 32-20 56-50 56S10 100 10 68 30 6 60 6Z',
'M60 10c36 0 52 26 52 56s-16 58-52 58S8 96 8 66 24 10 60 10Z',
'M60 4c24 0 46 28 46 66s-22 54-46 54S14 108 14 70 36 4 60 4Z']
CAST={
'maya':('#FF873C','#743518',0),'leo':('#B5D33D','#465A08',1),'arjun':('#6C8CFF','#1E3A8A',2),'zoe':('#FF7EB6','#7A2450',3),
 'theo':('#4FC3C9','#0F5559',4),'mia':('#C2A3E0','#61407C',5),'jax':('#FF5E57','#7A1F1B',6),'nina':('#FFD340','#7A5A00',7),
'alex':('#739DFF','#203D82',1),'jordan':('#C2A3E0','#61407C',3),'sam':('#7BC8A4','#1F5C42',4),'priya':('#FFD340','#7A5A00',2),
'ari':('#D89761','#68402A',2),'noor':('#8CBFAF','#244C43',5),'rae':('#DEAAA8','#744542',0)}
POSES=['neutral','thinking','overwhelmed','frustrated','sad','relieved','focused','reach','carry','walk-a','walk-b','resting']
def character(name,pose):
    body,ink,shape=CAST[name]
    mouth='M48 81q12 10 24 0'; eyes=path('M37 60q5-6 10 0 M73 60q5-6 10 0',stroke=ink,width=3.5)
    if pose in ('neutral','reach','carry','walk-a','walk-b'): eyes=circle(42,59,3,ink)+circle(78,59,3,ink)
    if pose=='thinking': eyes=path('M37 57h9 M74 60h9',stroke=ink,width=3); mouth='M56 83h12'
    if pose=='overwhelmed': eyes=path('M35 55l12 7-12 7 M85 55l-12 7 12 7',stroke=ink,width=3); mouth='M49 85q7-9 14 0t14 0'
    if pose=='frustrated': eyes=path('M34 49l15 6 M71 55l15-6',stroke=ink,width=3)+circle(42,64,3,ink)+circle(78,64,3,ink); mouth='M48 87q12-8 24 0'
    if pose=='sad': eyes=path('M35 54l12-5 M73 49l12 5',stroke=ink,width=3)+circle(42,64,3,ink)+circle(78,64,3,ink); mouth='M49 87q11-10 22 0'
    if pose=='focused': eyes=path('M35 57h13 M72 57h13',stroke=ink,width=3)+circle(42,63,2.5,ink)+circle(78,63,2.5,ink); mouth='M52 83h16'
    if pose=='resting': eyes=path('M35 61q7 7 14 0 M71 61q7 7 14 0',stroke=ink,width=3); mouth='M54 83q6 3 12 0'
    legs='M43 116v18 M77 116v18'
    if pose=='walk-a': legs='M43 115l-12 18 M77 115l11 13'
    if pose=='walk-b': legs='M43 115l11 13 M77 115l-12 18'
    arms='M15 77l-7 18 M105 77l7 18'; grip=[132,119]
    if pose=='reach': arms='M15 77l-7 18 M104 77q15-8 23-24'; grip=[147,77]
    if pose=='carry': arms='M15 77q12 20 35 18 M105 77q-12 20-35 18'; grip=[80,119]
    if pose=='thinking': arms='M15 77l-7 18 M105 77l-23 8-12-10'; grip=[90,99]
    if pose=='overwhelmed': arms='M15 77L7 47l12-10 M105 77l8-30-12-10'
    if pose=='relieved': arms='M15 77L3 64 M105 77l12-13'
    if pose=='resting': arms='M15 77q17 16 35 18 M105 77q-17 16-35 18'; legs='M43 116l-11 12 M77 116l11 12'
    art=group('legs',path(legs,stroke=ink,width=6))+group('body',path(SHAPES[shape],body,'none',0))+group('arms',path(arms,stroke=ink,width=6))+group('face',eyes+path(mouth,stroke=ink,width=3.5))
    write_svg(f'characters/{name}/{pose}',group('character',art,'translate(20 24)'),160,176,character=name,pose=pose,pivot=[80,158],grip=grip,bodyColor=body,inkColor=ink,groups=['character','body','face','arms','legs'])

# Every prop is authored explicitly; state variants retain a stable 128 x 128 frame.
P={}
def add(k,s): P[k]=s
paper=lambda: rect(24,12,80,104,'#FFFCED',6)+path('M39 35h49 M39 48h34',stroke='#C0B6A2',width=3)
phone=lambda screen: rect(34,8,60,112,INK,12)+rect(40,17,48,86,screen,6)+rect(53,110,22,3,'#EFE9DD',1)
add('phone-screen',phone('#F7CF63')+rect(48,36,32,22,'#FFFCED',5)+circle(75,34,6,'#E88A72'))
add('phone-off',phone('#45464C')+path('M58 55l12 12 M70 55L58 67',stroke='#96999E',width=2))
add('headphones',path('M26 77V55a38 38 0 0176 0v22',stroke='#4F5077',width=12)+rect(18,62,23,42,'#7779A3',10)+rect(87,62,23,42,'#7779A3',10))
add('earplugs',path('M28 36q28-10 29 12l-7 33q-9 19-23 0Z','#F1BC31','none')+path('M76 39q25-4 26 14l-4 33q-9 20-22 1Z','#95BCAF','none'))
add('book-open',path('M12 25q26-10 52 4 26-14 52-4v79q-26-10-52 4-26-14-52-4Z','#FFF9DD','#AB8460',3)+path('M64 29v79 M25 46h24 M25 57h24 M79 46h24 M79 57h24',stroke='#C8B69B',width=3))
add('book-closed',rect(27,14,76,100,'#BB7770',5)+rect(27,14,10,100,'#915D59',3)+rect(45,36,42,28,'#F6E7C8',3)+path('M39 104h58',stroke='#F6E7C8',width=5))
for state in ('open','closed'):
    base=rect(15,10,98,109,'#918DAE',10)+rect(24,19,80,90,'#343D70',4)+circle(83,37,12,'#FFF1B2')+circle(89,32,12,'#343D70')
    base+=path('M64 19v90 M24 65h80',stroke='#D6CEE2',width=5)
    if state=='open': base+=path('M24 19L7 8v100l17 1 M104 19l17-11v100l-17 1','#CCC5DD','#918DAE',3)
    else: base+=path('M33 29l19 26 M72 76l20 24',stroke='#7784B1',width=3)+rect(59,68,10,5,'#F7CF63',2)
    add('window-'+state,base)
for state in ('on','off'):
    light=path('M37 48L13 115h102L91 48Z','#F9D980','none') if state=='on' else ''
    add('lamp-'+state,light+path('M64 44v66 M40 111h48',stroke='#8B7461',width=7)+path('M43 14h42l18 42H25Z','#F2D69A' if state=='on' else '#BDB0AC','none'))
for state in ('approach','rest'):
    wings=ellipse(47,44,23,12,'#DCE7EF')+ellipse(81,44,23,12,'#EAF0F2') if state=='approach' else ellipse(52,62,12,24,'#DCE7EF')+ellipse(76,62,12,24,'#EAF0F2')
    add('mosquito-'+state,wings+ellipse(64,68,9,24,'#63545F')+circle(64,39,11,'#776372')+path('M64 29V12 M57 66L28 84 M71 66l29 18 M57 79l-24 26 M71 79l24 26',stroke='#63545F',width=3))
add('keys',path('M50 62l39 39 11-11-9-9 7-7-13-13-8 8-17-17','#E6B45B','#9A783E',3)+circle(43,43,23,'#E6B45B')+circle(43,43,12,'#FFF5D8'))
add('shoes',path('M12 57h28l10 25 18 6v19H9Z','#6E9C94','none')+path('M65 37h27l10 25 18 6v19H62Z','#90B5A4','none')+path('M14 101h47 M69 81h45',stroke='#F5ECD8',width=7)+path('M23 66h18 M78 47h18',stroke='#F5ECD8',width=3))
for state in ('empty','full'):
    bottle=rect(45,8,38,14,'#688E85',4)+path('M47 24v13L35 51v58q0 9 9 9h40q9 0 9-9V51L81 37V24Z','#D7E8DE','#688E85',3)
    if state=='full': bottle+=path('M41 63q22-7 46 0v44q0 5-5 5H46q-5 0-5-5Z','#91BBB9','none')
    add('bottle-'+state,bottle+path('M47 50v44',stroke='#F7FCED',width=4))
for state in ('empty','packed'):
    bag=path('M39 32V19q25-20 50 0v13',stroke='#7A6252',width=6)+rect(24,30,80,86,'#B68B61',15)+rect(38,72,52,32,'#CEA678',8)+path('M31 49h66',stroke='#7A6252',width=4)
    if state=='packed': bag+=path('M40 30V13h16v17 M67 30V7h16v23','#DDE6B8','#7A6252',2)+circle(94,99,15,'#709C87')+path('M87 99l5 5 8-11',stroke='#FFF8E5',width=3)
    add('bag-'+state,bag)
add('charger',rect(16,43,38,44,'#EBE3D4',7)+path('M26 43V28 M43 43V28 M54 65h23q32 0 29 27-2 17-22 17',stroke='#8F8E88',width=5)+rect(74,102,17,13,'#EBE3D4',3))
add('clock-cue',circle(64,64,47,'#FFF5D8')+path('M64 30v35l22 12 M64 20v5 M64 104v5 M20 64h5 M103 64h5',stroke='#8E754C',width=4)+circle(64,64,5,'#E5B029'))
add('umbrella',path('M14 63a50 49 0 01100 0q-14-15-26 0-12-15-24 0-13-15-25 0-12-15-25 0Z','#728AAF','none')+path('M64 63v37q0 22-19 12',stroke='#755E4B',width=5)+path('M64 15q-24 17-25 48 M64 15q24 17 24 48',stroke='#9CAFD0',width=2))
add('laundry-loose',path('M15 79l24-31 29 12 11-27 32 22-8 52H18Z','#E3B6A9','none')+path('M39 49l11 52 M78 40L65 99',stroke='#BB8E83',width=4))
add('laundry-folded',rect(20,75,89,22,'#B6C5A5',5)+rect(24,52,80,23,'#E3B6A9',5)+rect(29,29,71,23,'#F4D291',5)+path('M40 35h44 M35 58h52 M33 82h60',stroke='#FFF7E4',width=2))
for state in ('dry','watered'):
    add('plant-'+state,path('M64 83V33',stroke='#648773',width=5)+path('M63 59Q15 61 29 29q34 3 34 30 M65 47q0-36 36-29 0 32-36 29', '#83A48A' if state=='watered' else '#ABA76D','none')+path('M36 79h56l-9 37H45Z','#C98E68','none')+(circle(98,62,5,'#8EBABC') if state=='watered' else path('M49 91l12 9-7 9',stroke='#A77556',width=2)))
add('spill',path('M12 75q-6-21 25-21 14-29 40-11 39-3 33 26 24 26-18 26-29 21-49 4-35 13-31-24Z','#B2CED0','none')+ellipse(54,72,22,5,'#D8E7E5'))
for state in ('blank','marked'):
    add('note-'+state,path('M22 18h85v76l-23 20H22Z','#F7D578','none')+path('M84 94h23l-23 20Z','#DCAF51','none')+(path('M39 45l9 10 22-22 M38 76h43',stroke='#826742',width=4) if state=='marked' else ''))
add('conversation-thread',rect(9,15,81,44,'#DAB5CF',12)+path('M28 59v14l18-14','#DAB5CF','none')+rect(38,73,81,39,'#B7C4D9',12)+path('M100 112v9l-13-9','#B7C4D9','none')+path('M24 34h47 M53 90h45',stroke='#FFF9F0',width=4))
add('draft-card',paper()+path('M41 69h43 M41 82h22 M76 104l27-29 9 9-27 29Z','#C5A0C3','#9E7D9D',2))
add('question-card',paper()+path('M50 61q0-23 24-16 20 11-4 25v10',stroke='#947DB4',width=6)+circle(70,93,3,'#947DB4'))
add('commitment-card',paper()+circle(48,75,16,'#A2BC9B')+path('M40 75l6 6 10-13 M76 70h15 M76 82h15',stroke='#FFF9E8',width=3))
add('pause-token',circle(64,64,47,'#E6C9CE')+rect(45,42,12,44,'#8F5E70',4)+rect(72,42,12,44,'#8F5E70',4))
add('calendar',rect(14,21,100,95,'#FFFAE9',9)+rect(14,21,100,25,'#C997A3',7)+path('M36 12v23 M92 12v23',stroke='#80616C',width=6)+''.join(rect(x,y,12,10,'#E8DECC',2) for x in (30,58,86) for y in (59,84))+circle(64,89,13,'#F1BC31'))
add('agenda',paper()+''.join(circle(39,y,3,'#8199C1')+path(f'M49 {y}h38',stroke='#9AACC4',width=3) for y in (62,79,96)))
add('idea-card',paper()+circle(65,68,19,'#F1BC31')+rect(57,87,16,7,'#B48A3D',2)+path('M64 40v-6 M40 47l-5-5 M88 47l5-5',stroke='#D5A94D',width=3))
add('decision-card',paper()+path('M39 67l15 15 33-34',stroke='#739783',width=7))
add('turn-token',circle(64,64,45,'#9BACD4')+path('M42 46l36 18-36 18Z','#F8F0DE','none')+circle(89,34,9,'#F1BC31'))
add('whiteboard',rect(9,16,110,78,'#FEFAEF',7)+path('M35 94l-10 23 M94 94l10 23',stroke='#968775',width=5)+rect(24,34,26,18,'#D6C0DD',3)+rect(77,58,26,18,'#B3C8A7',3)+path('M50 43h13v24h14',stroke='#ACAA9E',width=3))
add('parcel',path('M16 34l49-23 47 23v64l-47 22-49-22Z','#CFA777','#A97D50',3)+path('M16 34l49 23 47-23 M65 57v63 M43 21l48 24',stroke='#A97D50',width=3)+path('M53 43l16-7 17 8-16 8v23l-17-8Z','#F1DCB8','none'))
add('stamps',rect(25,20,78,88,'#DBC6DB',3)+rect(34,29,60,69,'#F7EDDE',2)+circle(64,57,17,'#BAA1C9')+path('M43 83h42',stroke='#BAA1C9',width=5))
add('milk',path('M37 12h44l13 20v84H24V32Z','#F5F1DC','#8DABA8',3)+path('M37 12v20h57 M24 32h70',stroke='#8DABA8',width=3)+rect(25,56,68,31,'#A8C7C2',0)+circle(58,72,10,'#FFF9E5'))
add('bread',path('M23 113V51q-14-9-10-22 3-19 23-16 12-14 28-4 20-10 31 4 20-2 22 17 1 14-12 21v62Z','#DCA15D','#B98043',3)+path('M34 104V45q-12-8-6-17 8-8 20 0 12-13 28 0 16-7 21 4 3 8-5 13v59Z','#F1D39A','none'))
add('eggs',rect(10,72,108,38,'#ACA787',9)+''.join(ellipse(x,59,16,27,'#F2E1C1') for x in (29,64,99))+path('M17 94h95',stroke='#89866D',width=3))
add('beans',rect(28,23,72,86,'#C4A074',8)+ellipse(64,24,36,9,'#D5D3C5')+rect(29,42,70,47,'#92AB87',0)+path('M52 53q25-8 24 12-20 3-15 15-23 5-22-10 0-10 13-17Z','#EEE1BF','none'))
add('rice',path('M29 15h70l11 100H18Z','#EDDFC2','#B9AC8C',3)+rect(33,39,62,49,'#D6B96E',5)+''.join(ellipse(x,y,3,7,'#FFF7E5') for x,y in ((47,54),(61,59),(79,53),(49,74),(76,75))))
add('apple',path('M64 35q-30-19-45 9-12 41 20 67 13 7 25-2 12 9 25 2 32-26 20-67-15-28-45-9Z','#D78770','none')+path('M64 36q-3-18 6-26',stroke='#705B3D',width=5)+path('M69 23q6-24 29-13-9 21-29 13Z','#7F9C70','none')+path('M32 52q-7 17-1 28',stroke='#ECA894',width=5))
add('kayak',path('M64 7Q12 51 64 121 116 51 64 7Z','#E2A164','#A27245',3)+ellipse(64,64,16,27,'#795D4C')+path('M19 110L109 20',stroke='#6A6657',width=5)+path('M5 111l12-16 15 15-15 13Z M98 17l16-12 9 12-13 16Z','#A9BDB5','none'))
add('wishlist',paper()+path('M64 82L43 63q-6-20 12-19 7 0 9 8 3-8 11-8 18 1 10 19Z','#D69A9A','none'))
add('receipt',path('M32 8h64v112l-8-6-8 6-8-6-8 6-8-6-8 6-8-6-8 6Z','#FFF9E8','#C9BC9D',2)+path('M43 32h42 M43 49h23 M77 49h8 M43 65h23 M77 65h8 M43 91h42',stroke='#9C927A',width=3))
add('coin',circle(64,64,45,'#E6B84A')+circle(64,64,33,'#F7D26D')+path('M64 39v50 M74 47q-25-13-25 4 0 11 19 11 20 0 11 17-9 12-27 1',stroke='#AB823A',width=4))
for state in ('empty','full'):
    content=(circle(44,40,17,'#D78770')+path('M66 50V17h22l10 33Z','#F5E3B7','none')) if state=='full' else ''
    add('basket-'+state,content+path('M15 46h98l-12 63H27Z','#A8BFA3','#6F8E70',4)+path('M32 46L49 16 M96 46L79 16 M38 62l5 30 M63 62v30 M89 62l-5 30',stroke='#6F8E70',width=5))
for state in ('blank','draft'):
    add('document-'+state,paper()+(path('M39 66h44 M39 80h44 M39 94h29',stroke='#9FA6A1',width=3) if state=='draft' else ''))
add('brief',paper()+rect(37,58,54,29,'#C4D3BA',3)+path('M45 68h37 M45 78h24',stroke='#719079',width=3))
add('bookmark',path('M40 12h48v106l-24-20-24 20Z','#D78E80','none')+circle(64,33,6,'#F9E4BA'))
add('timer',circle(64,73,41,'#E7DDBF')+rect(49,9,30,12,'#8F907C',4)+path('M64 21v10 M92 35l10-10',stroke='#8F907C',width=5)+path('M64 41v32l22 11',stroke='#8F907C',width=4)+path('M64 38a35 35 0 0132 47',stroke='#E6B54C',width=7))
add('bench',rect(11,35,106,17,'#C8A277',4)+rect(11,57,106,17,'#C8A277',4)+rect(7,81,114,12,'#AF875F',4)+path('M25 92v26 M103 92v26 M25 34v46 M103 34v46',stroke='#708B82',width=6))
add('bus',rect(12,22,104,82,'#97B8BC',15)+rect(22,32,39,36,'#E3EFE6',5)+rect(68,32,37,36,'#E3EFE6',5)+circle(35,104,13,INK)+circle(94,104,13,INK)+rect(22,82,14,8,'#F8E4A5',3)+rect(92,82,14,8,'#F8E4A5',3))
add('traffic-signal',path('M64 100v22',stroke='#797E76',width=9)+rect(38,6,52,98,'#555F5B',12)+circle(64,28,12,'#BE8274')+circle(64,55,12,'#D9C18C')+circle(64,82,12,'#87B391')+path('M57 82h14 M64 75v14',stroke='#EAF4DF',width=3))
add('signpost',path('M61 17v105',stroke='#908D74',width=7)+path('M19 19h77l17 17-17 17H19Z','#8CAFB6','none')+path('M103 63H30L14 79l16 16h73Z','#D6BB79','none')+path('M37 36h48 M86 79H41',stroke='#F9F3DF',width=4))
add('quiet-door',rect(23,9,82,110,'#C5C4AE',8)+rect(33,19,62,100,'#E2DFBD',4)+circle(82,74,4,'#948C69')+path('M49 45q15-18 30 0 M49 45q15 18 30 0',stroke='#8DA28F',width=3))
add('notification',rect(12,26,103,69,'#FFFAEA',14)+circle(32,49,9,'#D5A0A8')+path('M49 47h45 M26 71h65',stroke='#B1A9A0',width=4)+circle(107,27,13,'#D98670'))
add('sensory-dial',circle(64,64,47,'#D5E1D9')+circle(64,64,31,'#A0B9B0')+path('M64 64l21-23',stroke='#FFF8E4',width=5)+''.join(circle(64+40*math.cos(a),64+40*math.sin(a),2,'#758B84') for a in (0,1,2,3,4,5)))
add('pan',circle(49,75,36,'#696C67')+circle(49,75,26,'#878980')+path('M76 49l33-33',stroke='#696C67',width=14))
add('pancake',ellipse(64,89,47,19,'#B98248')+ellipse(64,78,47,19,'#DBA865')+ellipse(64,65,47,19,'#F0C17A')+path('M44 53q11-8 22-2 12 5 24 8-4 12-23 6-13-5-27 1Z','#BA824B','none')+rect(54,46,21,15,'#F8DE8C',3))
add('toaster',rect(13,38,102,72,'#9FAEAF',15)+rect(25,30,72,15,'#586462',7)+path('M108 54v30 M104 68h15',stroke='#596662',width=5)+rect(23,108,83,8,'#6F7A75',3))
for state,col in [('raw','#F5DFB2'),('ready','#DFAD63'),('burnt','#71513E')]:
    add('toast-'+state,path('M25 111V51q-15-7-12-22 2-17 25-13 26-16 52 0 23-4 25 13 3 15-12 22v60Z',col,'#AC7847',5)+''.join(circle(x,y,2,'#B38753' if state!='burnt' else '#4E392F') for x,y in ((40,56),(81,42),(70,82),(46,94),(92,96))))
add('pigeon',ellipse(65,76,36,30,'#9FA9BD')+circle(82,41,20,'#8998B1')+path('M99 40l20 7-20 7Z','#D5AE71','none')+path('M48 67q37-19 34 25-22 11-34-25Z','#78869B','none')+path('M22 77L8 93l31-3 M51 102v15 M81 102v15',stroke='#8E6F65',width=4)+circle(88,37,3,INK))
add('wasp',ellipse(40,41,25,14,'#DDEAE7')+ellipse(86,41,25,14,'#E9F0E7')+ellipse(64,73,23,34,'#E9BA4C')+path('M43 61h42 M41 80h46',stroke='#786B4D',width=8)+circle(64,39,16,'#8B7A4E')+path('M55 27l-9-13 M73 27l9-13',stroke='#786B4D',width=3))
add('spider',path('M45 53L20 30 8 46 M42 67L15 63 6 79 M45 81l-26 17 1 19 M83 53l25-23 12 16 M86 67l27-4 9 16 M83 81l26 17-1 19',stroke='#A399AF',width=5)+ellipse(64,70,29,32,'#A399AF')+circle(55,59,4,'#F8EFE5')+circle(73,59,4,'#F8EFE5')+circle(55,59,2,INK)+circle(73,59,2,INK))
add('blender',path('M32 14h57l-6 66H39Z','#CCDFD8','#80A097',3)+path('M90 25h15q15 30-17 31',stroke='#80A097',width=5)+rect(26,7,69,9,'#80A097',3)+path('M40 81h43l15 35H26Z','#DFB171','none')+circle(63,100,8,'#F7E6BE')+path('M43 56h38',stroke='#ABD0B9',width=12))
add('office-chair',rect(29,8,72,60,'#9AAB95',14)+rect(23,69,80,18,'#7F957C',8)+path('M64 87v21 M34 117l30-10 30 10 M23 69V52 M103 69V52',stroke='#6A7469',width=6)+circle(32,117,5,INK)+circle(96,117,5,INK))
add('tissue',path('M18 54h89v58H18Z','#B4C9CB','none')+ellipse(63,58,24,7,'#829CA0')+path('M48 61L30 23q23 5 37-14 5 22 27 27L76 61Z','#F9F7EC','#DCDCCE',2))
add('duck',ellipse(63,82,43,27,'#E6C562')+circle(85,45,23,'#EED276')+path('M102 43h22l-16 12h-8Z','#D99258','none')+path('M27 74L9 60l10 31 M47 79q27-15 32 5-11 19-32-5Z','#D4AF4E','none')+circle(90,40,3,INK))
add('bubble',circle(64,64,47,'#D4E7E5')+circle(64,64,39,'#E5EEEB')+path('M36 44q8-12 23-13 M88 85l5-9',stroke='#FFFFFF',width=7)+path('M32 90q15 17 37 15',stroke='#BED3D6',width=3))
add('water-cup',path('M29 23h70l-8 91H37Z','#DAE9E6','#96B5B3',3)+path('M34 66q30-7 60 0l-4 42H38Z','#AFCFCB','none')+path('M42 32l4 58',stroke='#F9FBEB',width=4))
add('shoe-cue',rect(10,9,108,110,'#F4DE9D',9)+P['shoes'].replace('<path','<path')+circle(99,28,14,'#94B499')+path('M93 28l5 5 8-11',stroke='#FFF8E5',width=3))
add('meal-bowl',ellipse(64,52,51,23,'#E2CBA5')+path('M13 52q1 58 51 60 50-2 51-60Z','#ADBC9B','none')+ellipse(64,51,44,16,'#EED6A0')+circle(45,49,10,'#D9936C')+circle(76,50,11,'#83A17A')+path('M39 82q24 16 49 0',stroke='#D5DFC5',width=4))
add('ball',circle(64,64,46,'#DDA383')+path('M22 43q50 17 84-1 M24 91q42-40 80-7 M47 21q-7 49 25 87',stroke='#B57B63',width=4))
add('support-card',paper()+circle(52,62,13,'#8EB5AE')+circle(80,62,13,'#C6AACD')+path('M35 95q0-22 17-22 17 0 17 22 M63 95q0-22 17-22 17 0 17 22','#AAC4B7','none'))
add('pen',path('M30 108l8-27 56-65 17 15-57 64Z','#859FAF','#506878',3)+path('M30 108l24-13-16-14Z','#E8D2A3','none'))
WORLDS={
'leo':dict(wall='#C8C5E1',floor='#9D9DBD',accent='#7776A4',label='The quiet room'),
 'theo':dict(wall='#F2DEAE',floor='#D5AF73',accent='#B28B5E',label='A morning in motion'),
 'zoe':dict(wall='#EBD3D7',floor='#CFABB5',accent='#A7778C',label='A shared evening'),
 'mia':dict(wall='#E4D9EB',floor='#BDAFCB',accent='#9D85B3',label='A place for the thought'),
 'arjun':dict(wall='#DBE2F1',floor='#AEBAD5',accent='#7B90BD',label='Room for a thought'),
 'jax':dict(wall='#DCE6D4',floor='#B7C5A1',accent='#7F9978',label='The little market'),
 'nina':dict(wall='#F3E7BB',floor='#D8C798',accent='#A99A6B',label='A small beginning'),
 'maya':dict(wall='#D6E8E7',floor='#AFC9C7',accent='#769D9F',label='A way through')}
def placed(s,x,y,scale=1): return f'<g transform="translate({x} {y}) scale({scale})">{s}</g>'
def prop(k,x,y,size=80): return placed(P[k],x,y,size/128)
def desk(x,y,w,c):
    return rect(x,y,w,20,c,6)+path(f'M{x+18} {y+20}v105 M{x+w-18} {y+20}v105',stroke=c,width=13)+rect(x+w-91,y+23,74,52,c,4)+circle(x+w-54,y+48,3,'#F7E8C8')
def shelf(x,y,w,c,books=True):
    return rect(x,y,12,200,c,3)+rect(x+w-12,y,12,200,c,3)+''.join(rect(x,y+v,w,10,c,3) for v in (0,65,130,195))+''.join(rect(x+20+i*19,y+76,13,54-5*(i%3),['#D1B9A1','#A5BAAD','#DCC6AB','#B4A2BA'][i%4],2) for i in range(max(2,int((w-40)/22)) if books else 0))
def sofa(x,y,w,c):
    return rect(x+12,y,w-24,83,c,22)+rect(x,y+58,w,77,c,20)+rect(x+18,y+83,w-36,31,'#F0DFCF',11)+path(f'M{x+24} {y+134}v15 M{x+w-24} {y+134}v15',stroke='#896B5A',width=7)
def plant(x,y,size=105): return prop('plant-watered',x,y,size)
def scene(name,orientation):
    w,h=(1200,760) if orientation=='desktop' else (600,900)
    world=WORLDS[name]; wall,floor,accent=world['wall'],world['floor'],world['accent']; fy=round(h*.66)
    bg=rect(0,0,w,h,wall,0)+rect(0,fy,w,h-fy,floor,0)+rect(0,fy-8,w,8,accent,0)
    bg+=path(f'M0 {h-85}H{w} M{int(w*.25)} {fy}L{int(w*.1)} {h} M{int(w*.75)} {fy}L{int(w*.9)} {h}',stroke=wall,width=2)
    anchors={}; f=''; fg=''; mobile=orientation=='phone'
    def anchor(k,x,y): anchors[k]=[round(x),round(y)]
    if name=='leo':
        bx,by,bw=(80,585,340) if mobile else (400,440,430)
        f+=rect(bx,by-90,bw,132,'#8C7690',22)+rect(bx+10,by-71,bw-20,82,'#F4E4C6',17)+rect(bx+25,by-54,bw-50,41,'#FAF1DE',18)+rect(bx-8,by,bw+16,111,'#E5BF83',17)+rect(bx-8,by+45,bw+16,67,'#D9B274',12)+path(f'M{bx+15} {by+107}v22 M{bx+bw-15} {by+107}v22',stroke='#8C7690',width=9)
        nx,ny=(445,617) if mobile else (920,487)
        f+=desk(nx,ny,100,'#9B8496')
        anchor('character',bx+bw*.5,by+18); anchor('window',w*.5,180 if mobile else 165); anchor('lamp',nx+50,ny-42); anchor('phone',nx+42,ny+16); anchor('book',bx+60,by+42); anchor('headphones',70,fy+110)
        bg+=ellipse(w*.5,fy+125,w*.32,30,wall)
    elif name=='theo':
        # A readable cutaway: two rooms above, hall and route below.
        f+=rect(w*.49,55,12,fy-35,accent,3)+rect(30,fy-25,w*.34,12,accent,3)+rect(w*.65,fy-25,w*.32,12,accent,3)
        f+=desk(35,fy-145,w*.32,accent)+shelf(w*.66,fy-227,w*.25,accent)
        f+=rect(w*.69,fy+30,w*.21,190,'#C39168',32)+rect(w*.72,fy+54,w*.15,46,'#EDD49B',18)+circle(w*.85,fy+143,5,'#F8EBC0')
        f+=rect(40,fy+80,w*.35,90,'#EAD5A4',16)
        for k,x,y in [('kitchen',w*.23,fy-44),('bedroom',w*.76,fy-44),('hall',w*.5,fy+77),('living',w*.23,fy+182),('door',w*.78,fy+194),('charger',w*.17,fy-183),('keys',w*.31,fy-158),('bag',w*.47,fy+154),('bottle',w*.09,fy-176)]: anchor(k,x,y)
    elif name=='zoe':
        sx,sy,sw=(40,555,340) if mobile else (100,405,455)
        f+=sofa(sx,sy,sw,accent)+desk(w*.63,fy+71,w*.3,'#B88E83')
        f+=rect(w*.66,100,w*.22,175,'#FFF4DE',12)+rect(w*.69,115,w*.16,143,'#D9B9C7',8)
        f+=ellipse(w*.5,fy+185,w*.4,36,'#DDC2C6')
        anchor('character',sx+sw*.3,sy+78); anchor('partner',sx+sw*.74,sy+78); anchor('phone',w*.79,fy+30); anchor('calendar',w*.77,185); anchor('draft',w*.52,fy+85); anchor('return-cue',w*.8,fy+112)
    elif name=='mia':
        f+=shelf(30,150,w*.27,accent)+desk(w*.59,fy-58,w*.33,'#AD93AE')
        f+=rect(w*.4,130,w*.17,fy-130,'#CBB8CE',19)+circle(w*.53,fy-88,5,'#F5E6CF')
        f+=rect(20,fy+75,w*.35,90,'#D8C7D9',12)+path(f'M{w*.46} {fy+45}h{w*.36}',stroke='#EDE0E6',width=6)
        for k,x,y in [('character',w*.44,fy+155),('cue',w*.43,fy-5),('charger',w*.7,fy-94),('parcel',w*.19,fy+99),('list',w*.85,fy-90),('partner',w*.74,fy+158),('door',w*.48,fy+14)]: anchor(k,x,y)
    elif name=='arjun':
        f+=rect(w*.12,72,w*.76,230,'#F8F4E8',16)+rect(w*.15,292,w*.7,11,accent,3)
        ty=fy+15
        f+=ellipse(w*.5,ty+65,w*.4,96,'#8799BB')+ellipse(w*.5,ty+49,w*.4,90,'#D3BA96')+path(f'M{w*.24} {ty+90}v76 M{w*.76} {ty+90}v76',stroke='#8B795E',width=14)
        anchor('character',w*.25,ty+113); anchor('partner',w*.78,ty+2); anchor('agenda',w*.25,170); anchor('board',w*.61,186); anchor('parked-idea',w*.13,fy+100); anchor('decision',w*.53,ty+40)
    elif name=='jax':
        f+=shelf(25,110,w*.39,accent,False)+shelf(w*.58,110,w*.36,accent,False)
        # Produce bins intentionally hold neutral shelving; all purchasable items stay separate.
        f+=rect(23,fy+45,w*.41,95,'#BBA882',9)+rect(w*.59,fy+45,w*.35,95,'#BBA882',9)
        f+=path(f'M{w*.09} {fy+160}h{w*.78}',stroke='#DBE1C7',width=5)
        for k,x,y in [('character',w*.49,fy+162),('shelf-a',w*.22,194),('shelf-b',w*.76,194),('basket',w*.23,fy+36),('checkout',w*.77,fy+39),('wishlist',w*.85,fy+142)]: anchor(k,x,y)
    elif name=='nina':
        f+=rect(w*.1,80,w*.36,200,'#DFDAB1',12)+rect(w*.12,95,w*.32,169,'#EDF0D7',8)+path(f'M{w*.28} 95v169',stroke='#D0C99D',width=8)
        f+=shelf(w*.72,118,w*.23,accent)+desk(w*.1,fy+15,w*.8,'#BEA77C')
        f+=rect(w*.39,fy+104,w*.23,90,'#B5B899',18)+path(f'M{w*.42} {fy+194}v28 M{w*.59} {fy+194}v28',stroke='#8E8C6C',width=8)
        anchor('character',w*.5,fy+145); anchor('document',w*.47,fy-38); anchor('brief',w*.26,fy-48); anchor('bookmark',w*.66,fy-38); anchor('timer',w*.78,fy-44); anchor('question',w*.85,235)
    elif name=='maya':
        f+=rect(35,115,w*.34,fy-115,'#B3CECD',28)+rect(49,135,w*.3,fy-135,'#EDF0DE',20)
        f+=rect(w*.6,95,w*.31,fy-95,'#8AAEAE',25)+rect(w*.64,121,w*.23,fy-121,'#BEDAD3',17)
        f+=path(f'M{w*.2} {fy+55}h{w*.53}v{h-fy-85}',stroke='#E2E7D5',width=18)
        f+=placed(P['bench'],w*.03,fy+12,1.6 if mobile else 2.1)
        for k,x,y in [('character',w*.47,fy+124),('quiet-route',w*.21,fy-3),('main-route',w*.76,fy-3),('signpost',w*.47,fy-160),('companion',w*.63,fy+118),('cue',w*.47,fy-58),('bench',w*.17,fy+150)]: anchor(k,x,y)
    fg+=plant(w-115,h-157,105)+path(f'M0 {h-16}H{w}',stroke=accent,width=4)
    previews={
        'leo':[('window-open','window',145),('lamp-on','lamp',80),('phone-screen','phone',42),('book-open','book',90),('headphones','headphones',80)],
        'theo':[('charger','charger',72),('keys','keys',55),('bag-empty','bag',80),('bottle-empty','bottle',55)],
        'zoe':[('calendar','calendar',110),('phone-screen','phone',55),('draft-card','draft',80),('water-cup','return-cue',65)],
        'mia':[('note-marked','cue',60),('charger','charger',70),('parcel','parcel',95),('commitment-card','list',75)],
        'arjun':[('agenda','agenda',100),('question-card','board',90),('idea-card','parked-idea',75),('decision-card','decision',80)],
        'jax':[('milk','shelf-a',85),('bread','shelf-b',85),('basket-full','basket',110),('receipt','checkout',85),('wishlist','wishlist',65)],
        'nina':[('document-draft','document',100),('brief','brief',90),('bookmark','bookmark',65),('timer','timer',75),('question-card','question',75)],
        'maya':[('signpost','signpost',120),('note-marked','cue',60)]
    }[name]
    preview_props=[dict(id='props/'+key,anchor=at,size=size) for key,at,size in previews]
    for layer,body in [('background',bg),('furniture',f),('foreground',fg)]:
        write_svg(f'scenes/{name}/{orientation}/{layer}',group(layer,body),w,h,world=name,orientation=orientation,layer=layer,anchors=anchors,previewProps=preview_props,safeArea=[24,24,w-48,h-48])

FX={
'pickup-ring':path('M64 17a47 47 0 1146 57',stroke='#D4AC4E',width=5),
'place-ripple':ellipse(64,94,46,15,'#E4D6AE')+ellipse(64,94,29,8,'#F4EACA'),
'success-spark':path('M64 15l10 35 35 14-35 10-10 35-14-35-35-10 35-14Z','#F1BC31','none'),
'pause-halo':circle(64,64,48,'#E9E2D4')+circle(64,64,38,'#F9F4E7'),
'breath-guide':circle(64,64,45,'#CADAD1')+circle(64,64,29,'#EBF1E4'),
'noise-wave':path('M23 48q17 16 0 32 M40 31q36 33 0 66 M62 17q53 47 0 94',stroke='#A394B8',width=5),
'quiet-wave':path('M19 71q16-18 30 0t30 0 30 0',stroke='#9BACAB',width=4),
'attention-return':path('M102 52a41 41 0 10-2 40 M102 52V25 M102 52H75',stroke='#9CAFC9',width=5),
'route-footsteps':ellipse(44,42,10,20,'#B7A384')+ellipse(80,82,10,20,'#B7A384'),
'load-cloud':path('M21 87Q1 60 27 44q1-31 28-23 24-24 39 7 35 0 29 31 13 30-23 34Z','#C5B8CF','none'),
'repair-link':path('M53 47l-16 16a18 18 0 0026 26l14-14 M74 79l17-17a18 18 0 00-26-26L51 50 M48 80l32-32',stroke='#B58B9B',width=8),
'bookmark-pulse':path('M39 18h50v91L64 90l-25 19Z','#DDA790','none')+path('M20 41v39 M108 41v39',stroke='#E6C8A3',width=3),
'rain':path('M28 20l-9 24 M65 32l-9 24 M101 15l-9 24 M40 77l-9 24 M88 79l-9 24',stroke='#ABC6D4',width=4),
'question-spark':path('M46 40q2-26 27-15 24 12-4 30v14',stroke='#A18BB5',width=7)+circle(69,88,4,'#A18BB5'),
'gentle-confetti':rect(23,27,8,21,'#E3B759',3)+rect(91,42,8,21,'#ACA5CC',3)+circle(42,92,6,'#A7C4AF')+path('M76 79l10 20',stroke='#DFA19A',width=6),
'focus-brackets':path('M39 21H21v24 M89 21h18v24 M21 83v24h18 M107 83v24H89',stroke='#869AA7',width=4)}
AUDIO={
'pickup':(.18,[660,880],False,'An object is picked up.'),'place':(.22,[330,440],False,'An object is placed.'),
'soft-error':(.26,[220,196],False,'That action is unavailable; a visible reason accompanies it.'),
'door':(.4,[130,86],False,'A door closes.'),'train':(1.1,[330,440,523],False,'A train cue; the departure is also shown.'),
'notify':(.3,[520,650],False,'A message arrives.'),'breath-in':(1.5,[174,220],False,'The breathing guide expands.'),
'breath-out':(2,[220,146],False,'The breathing guide settles.'),'complete':(.7,[392,494,587],False,'The encounter is complete.'),
'rain':(5,[],True,'Soft rain; optional ambience.'),'buzz':(3,[152,156],True,'A nearby insect; its location is also visible.'),
'brown-noise':(5,[],True,'Optional low noise; silence is an equal option.'),'page-turn':(.32,[],False,'A page turns.'),
'clock':(.12,[850,650],False,'A quiet time cue; time is also displayed.'),'footstep':(.14,[110,75],False,'A footstep.')}
def audio_asset(key,spec):
    duration,freqs,loop,caption=spec; rate=22050; count=int(rate*duration); rng=random.Random(key); values=[]; brown=0
    for i in range(count):
        t=i/rate; white=rng.uniform(-1,1); brown=.985*brown+.015*white
        if key=='brown-noise': value=brown*2.8
        elif key=='rain': value=white*.12+brown*.4
        elif key=='page-turn': value=white*.15*(.4+.6*math.sin(math.pi*i/count)**2)
        elif key=='buzz': value=.065*math.sin(2*math.pi*152*t+1.8*math.sin(2*math.pi*4*t))+.025*math.sin(2*math.pi*304*t)
        else:
            j=min(len(freqs)-1,int(i/count*len(freqs))); freq=freqs[j]
            # Integrated piecewise phase avoids discontinuity at note boundaries.
            phase=sum(freqs[:j])*duration/len(freqs)+freq*(t-j*duration/len(freqs))
            value=.13*math.sin(2*math.pi*phase)+.025*math.sin(4*math.pi*phase)
        fade=min(1,i/(rate*.025),(count-1-i)/(rate*.07)); env=fade if loop else fade*math.sin(math.pi*(i+.5)/count)**.35
        values.append(round(max(-.22,min(.22,value*env))*32767))
    dest=OUT/'audio'/f'{key}.wav'; dest.parent.mkdir(parents=True,exist_ok=True)
    with wave.open(str(dest),'wb') as wav:
        wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(rate); wav.writeframes(struct.pack('<'+'h'*len(values),*values))
    ASSETS.append(dict(id='audio/'+key,path='audio/'+key+'.wav',kind='audio',duration=duration,sampleRate=rate,channels=1,peak=max(abs(v) for v in values)/32767,loop=loop,loopCrossfadeMs=120 if loop else 0,caption=caption,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))

GAME_PROPS={
'leo':'phone-screen phone-off headphones book-open book-closed bookmark window-open window-closed lamp-on lamp-off mosquito-approach mosquito-rest note-blank note-marked',
 'theo':'keys shoes bottle-empty bottle-full bag-empty bag-packed charger phone-screen phone-off clock-cue umbrella laundry-loose laundry-folded plant-dry plant-watered spill note-blank note-marked shoe-cue',
 'zoe':'phone-screen phone-off conversation-thread draft-card question-card commitment-card pause-token calendar water-cup support-card',
 'mia':'charger parcel stamps note-blank note-marked calendar bag-empty bag-packed phone-screen commitment-card quiet-door support-card',
 'arjun':'agenda idea-card decision-card turn-token whiteboard question-card note-blank note-marked timer water-cup',
 'jax':'milk bread eggs beans rice apple kayak wishlist receipt coin basket-empty basket-full meal-bowl support-card',
 'nina':'document-blank document-draft brief bookmark timer pen note-blank note-marked book-open book-closed question-card',
 'maya':'bench earplugs headphones bus traffic-signal signpost quiet-door notification sensory-dial note-marked water-cup ball'}
ARCADE_PARENT={
'leo_mosquito':'leo','leo_lights_out':'leo','leo_one_more':'leo','theo_get_out':'theo','theo_backwards':'theo','theo_shower':'theo',
'zoe_dont_send':'zoe','zoe_keyword':'zoe','zoe_drafts':'zoe','mia_why_here':'mia','mia_list':'mia','mia_the_list':'mia',
'arjun_lock_in':'arjun','arjun_parking':'arjun','arjun_hold_thread':'arjun','maya_crossing':'maya','maya_layers':'maya','maya_turn_it_down':'maya',
'jax_just_milk':'jax','jax_checkout':'jax','nina_start_small':'nina','nina_first_line':'nina'}
ARCADE_EXTRA={'wasps':['wasp'],'pigeons':['pigeon'],'pancake':['pan','pancake'],'toast':['toaster','toast-raw','toast-ready','toast-burnt'],
'bubbles':['bubble'],'spider':['spider'],'rogue_blender':['blender'],'office_chair':['office-chair'],'sneeze':['tissue'],'ducks':['duck']}
RUNS={'context':['nina','arjun','maya'],'starting':['nina'],'working-memory':['mia'],'more-than-attention':list(WORLDS),'deadlines':['theo','nina'],
'hyperfocus':['arjun','nina'],'ambiguity':['nina'],'interruption':['arjun','zoe'],'perfectionism':['nina'],'not-listening':['arjun'],
'forgotten-commitments':['mia'],'conflict':['zoe'],'household':['mia'],'sleep':['leo'],'exercise':['maya'],'eating':['jax'],'gut':['maya'],
'money':['jax'],'mornings':['theo'],'screens':['leo','zoe']}

def generate():
    OUT.mkdir(parents=True,exist_ok=True)
    for name in CAST:
        for pose in POSES: character(name,pose)
    for key,body in P.items(): write_svg('props/'+key,group('object',body),pivot=[64,116],interactionBounds=[8,8,112,112])
    for name in WORLDS:
        for orientation in ('desktop','phone'): scene(name,orientation)
    for key,body in FX.items(): write_svg('effects/'+key,group('effect',body),decorative=True)
    for key,spec in AUDIO.items(): audio_asset(key,spec)
    common=['effects/'+k for k in FX]+['audio/'+k for k in AUDIO]
    games={}
    partners={'theo':['ari'],'zoe':['rae','sam'],'mia':['sam'],'arjun':['noor'],'jax':['sam'],'nina':['priya'],'maya':['alex'],'leo':[]}
    for name in WORLDS:
        cast=[name]+partners[name]
        games[name]=dict(status='assets-generated; runtime integration pending',characters=cast,assets=[a['id'] for a in ASSETS if a.get('world')==name or a.get('character') in cast]+['props/'+k for k in GAME_PROPS[name].split()]+common)
    arcade={k:dict(parent=v,assets=games[v]['assets']) for k,v in ARCADE_PARENT.items()}
    arcade.update({k:dict(parent=None,assets=['props/'+p for p in props]+common) for k,props in ARCADE_EXTRA.items()})
    learning={k:dict(worlds=v,assets=sorted(set(a for g in v for a in games[g]['assets'])),contentReviewRequired=k=='gut') for k,v in RUNS.items()}
    manifest=dict(version='2.0.0',generatedBy='scripts/generate-lives-assets.py',provenance='Original project-authored vector geometry and synthesised PCM. Principal and legacy character silhouettes/colours extend the existing ADHD.ME cast. No third-party raster, music, fonts or copied character art.',
        status='Asset production baseline; gameplay implementation and player validation are separate.',worlds=WORLDS,poses=POSES,cast={k:dict(body=v[0],ink=v[1],role='principal' if k in WORLDS else 'supporting') for k,v in CAST.items()},
        assets=ASSETS,games=games,arcade=arcade,learningRuns=learning,counts={k:sum(a['kind']==k for a in ASSETS) for k in ['characters','scenes','props','effects','audio']})
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    motion={
        'version':'2.0.0','contract':'Animate from accepted model events. Hit regions never inherit squash, shake or decorative translation. Pause/hidden/unmount suspend all tracks.',
        'tracks':{
            'pickup':{'durationMs':180,'scale':[1,1.06,1],'pivot':'grip','still':'Show carried object and update inventory immediately.'},
            'place':{'durationMs':220,'translateY':[-6,0],'still':'Show object at destination.'},
            'walk':{'poses':['walk-a','walk-b'],'cadenceMs':240,'pivot':'feet','still':'Move between graph nodes on action; preserve route cost.'},
            'recover':{'durationMs':600,'poses':['overwhelmed','thinking','relieved'],'still':'Use current expression and a static recovery indicator.'},
            'breath':{'durationMs':6000,'scale':[.9,1.06,.9],'still':'Step-based expand/settle text and static guide, optional.'},
            'noise':{'durationMs':900,'opacity':[.3,.7,.3],'still':'Static source mark; do not shake the screen.'},
            'completion':{'durationMs':700,'opacity':[0,1,0],'still':'Static success spark; focus the next action.'}},
        'audio':{'autoplay':False,'masterPeakCeiling':.22,'maxConcurrentVoices':4,'loopCrossfadeMs':120,'pause':'Stop/fade nodes and retain logical play state; never resume without user consent.', 'warning':'Individual WAV peaks are bounded; runtime mixing still needs a master limiter and volume control.'}}
    (OUT/'motion.json').write_text(json.dumps(motion,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(total=len(ASSETS),counts=manifest['counts'],games=len(games),arcade=len(arcade),learningRuns=len(learning))))

if __name__=='__main__': generate()
