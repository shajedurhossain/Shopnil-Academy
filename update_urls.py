import io

files = [
    'courses/spanish-bangla/a1/chapter1.html',
    'courses/spanish-bangla/a1/chapter2.html',
    'courses/spanish-bangla/a1/chapter3.html',
]

for fname in files:
    with io.open(fname, 'r', encoding='utf-8') as f:
        html = f.read()
    updated = html.replace(
        "var _MEDIA_BASE=''",
        "var _MEDIA_BASE='https://media.shopnilacademy.com'"
    )
    if updated == html:
        print(fname, '— pattern not found')
    else:
        with io.open(fname, 'w', encoding='utf-8') as f:
            f.write(updated)
        print(fname, '— updated')