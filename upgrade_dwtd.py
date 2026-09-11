import re

with open('app/lives/scenes.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

def replace_stroke(m):
    tag = m.group(0)
    # Never touch SVGs that are just lines/strokes, only fills.
    if 'fill=' in tag and 'fill="none"' not in tag:
        tag = re.sub(r'\s*stroke=\{I\}', '', tag)
        tag = re.sub(r'\s*strokeWidth="[\d.]+"', '', tag)
    return tag

content = re.sub(r'<(path|circle|ellipse|rect|polygon)[^>]+>', replace_stroke, content)

with open('app/lives/scenes.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
