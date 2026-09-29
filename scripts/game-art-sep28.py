from pathlib import Path
r=Path('public/games/settle');r.mkdir(parents=True,exist_ok=True)
paper='#fff9e8';ink='#39392e';gold='#edc548';sage='#8eac90';blue='#93acc1'
scenes={
'quiet-tabs':f'<rect x="20" y="18" width="98" height="58" rx="8" fill="{blue}"/><rect x="28" y="30" width="80" height="36" rx="3" fill="{paper}"/><path d="M42 82H102M70 76V82" stroke="{ink}" stroke-width="5"/><path d="M91 37l10 10m0-10L91 47" stroke="{ink}" stroke-width="3"/>',
'rough-line':f'<rect x="29" y="10" width="75" height="76" rx="5" fill="{paper}"/><path d="M41 33q12-9 21 0t24 0M41 46h43M41 58h27" fill="none" stroke="{ink}" stroke-width="3" stroke-linecap="round"/><path d="M99 25l9 5-28 48-12 5 1-13Z" fill="{gold}"/>',
'shopping-list':f'<rect x="36" y="10" width="65" height="77" rx="7" fill="{paper}"/><rect x="51" y="6" width="34" height="13" rx="4" fill="{gold}"/><path d="M47 34l4 4 7-10m-11 24 4 4 7-10m-11 24 4 4 7-10M65 33h23M65 51h23M65 69h15" stroke="{ink}" stroke-width="3" fill="none"/>',
'shopping-space':f'<path d="M22 27h13l11 40h57l11-32H39" fill="{sage}" stroke="{ink}" stroke-width="3" stroke-linejoin="round"/><circle cx="52" cy="79" r="6" fill="{ink}"/><circle cx="98" cy="79" r="6" fill="{ink}"/><path d="M64 47h8v15h-8m15-15h8v15h-8" fill="{paper}"/>',
'meeting-pin':f'<rect x="24" y="14" width="94" height="70" rx="8" fill="{paper}"/><path d="M39 42h43M39 55h63M39 67h48" stroke="{blue}" stroke-width="4" stroke-linecap="round"/><path d="M92 13l16 6-5 14 4 8-26-10 8-4Z" fill="{gold}"/><path d="M93 35l-5 14" stroke="{ink}" stroke-width="3"/>',
'meeting-space':f'<path d="M22 23q0-9 9-9h62q9 0 9 9v34q0 9-9 9H56L37 80V66h-6q-9 0-9-9Z" fill="{blue}"/><circle cx="104" cy="66" r="23" fill="{gold}"/><path d="M104 50v17l10 6M37 33h47M37 47h29" fill="none" stroke="{ink}" stroke-width="4" stroke-linecap="round"/>'}
for name,body in scenes.items():
 for ready in [False,True]:
  badge='<circle cx="119" cy="77" r="13" fill="#386347"/><path d="m112 77 5 5 9-11" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"/>' if ready else ''
  (r/(name+('-ready' if ready else '')+'.svg')).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 96"><title>{name}</title>{body}{badge}</svg>',encoding='utf-8')
