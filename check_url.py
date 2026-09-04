import io, re

files = [
    'courses/spanish-bangla/a1/chapter1.html',
    'courses/spanish-bangla/a1/chapter2.html',
    'courses/spanish-bangla/a1/chapter3.html',
]

for fname in files:
    with io.open(fname, 'r', encoding='utf-8') as f:
        html = f.read()
    m = re.search(r'_MEDIA_BASE[^\n]{0,60}', html)
    if m:
        print(fname, ':', m.group(0))
    else:
        print(fname, ': _MEDIA_BASE not found')