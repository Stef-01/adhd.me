"""Build code-native outlined identity artwork; no embedded raster or font dependency."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from xml.etree import ElementTree
import json,shutil
ROOT=Path('design/marketing/static-2026')
def font(f,w):
 t=TTFont(f);return instantiateVariableFont(t,{'wght':w},inplace=False)
sans=font('node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2',800)
serif=font('node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2',750)
def word(t,text,size,x,y,tracking=0):
 gs=t.getGlyphSet();cmap=t.getBestCmap();scale=size/t['head'].unitsPerEm;parts=[];advance=0
 for c in text:
  name=cmap[ord(c)];pen=SVGPathPen(gs);gs[name].draw(pen)
  parts.append(f'<path d="{pen.getCommands()}" transform="translate({x+advance:.3f} {y}) scale({scale:.6f} {-scale:.6f})"/>')
  advance+=t['hmtx'][name][0]*scale+tracking
 return ''.join(parts),advance-tracking
body,width=word(sans,'me',520,0,535,-12)
# Centre the complete me + square lockup, not just the letters.
x=(1000-width-82)/2
body,_=word(sans,'me',520,x,535,-12)
letters=''
for c,px,py,angle in [('A',135,185,-16),('D',355,215,12),('H',585,173,-8),('D',795,208,17)]:
 p,_=word(serif,c,110,px,py);letters+=f'<g transform="rotate({angle} {px+36} {py-35})">{p}</g>'
variants=[('colour',None,'#1A1C1C','#E94D2D'),('reverse',None,'#FAFAF7','#E94D2D'),('mono-ink',None,'#1A1C1C','#1A1C1C'),('mono-white',None,'#FFFFFF','#FFFFFF'),('yellow','#F2CA16','#1A1C1C','#E94D2D'),('ivory','#F6F2E8','#1A1C1C','#E94D2D')]
records=[]
def save(name,content,box):
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{box}" role="img" aria-labelledby="title"><title id="title">ADHD.ME</title>{content}</svg>'
 ElementTree.fromstring(svg);(ROOT/'identity'/name).write_text(svg,encoding='utf-8');records.append(name)
for name,bg,ink,stop in variants:
 content=(f'<rect width="1000" height="650" fill="{bg}"/>' if bg else '')+f'<g fill="{ink}">{letters}{body}</g><rect x="{x+width+22:.3f}" y="475" width="60" height="60" fill="{stop}"/>'
 save('mark-'+name+'.svg',content,'0 0 1000 650')
for name,ink in [('ink','#1A1C1C'),('white','#FAFAF7')]:
 p,w=word(sans,'ADHD.ME',120,32,142,-3)
 save('wordmark-'+name+'.svg',f'<g fill="{ink}">{p}</g><rect x="{w+49:.3f}" y="125" width="17" height="17" fill="#E94D2D"/>',f'0 0 {w+98:.3f} 190')
shutil.copy2('node_modules/@fontsource-variable/newsreader/LICENSE',ROOT/'sources/fonts/NEWSREADER-LICENSE')
(ROOT/'identity/vector-manifest.json').write_text(json.dumps({'source':'scripts/build-campaign-identity.py','construction':'Optically arranged outlined typography, preserving the supplied me/ADHD/red-stop concept; a vector redraw, not an exact raster trace.','masters':records},indent=2),encoding='utf-8')
print('Generated',len(records),'outlined SVG masters')
