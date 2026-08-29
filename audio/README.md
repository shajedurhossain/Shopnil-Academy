# /audio/ — shared static audio

One folder per **target language**. The same file serves every course pair that
teaches that language: `/audio/es/` serves es-bn, es-en, bn-es, and so on.

    audio/
      es/  de/  bn/  fr/  ar/  zh/  ru/
      manifest.csv

## Filenames

FNV-1a 32-bit hash of the UTF-8 bytes of the spoken string, lowercase hex,
zero-padded to 8 characters, `.mp3` extension.

    Hola          -> audio/es/32f29db7.mp3
    Guten Morgen  -> audio/de/ceb4cd04.mp3

Generator (Python) and runtime (JS) implementations are verified byte-identical
and match canonical FNV-1a vectors: `a` -> e40c292c, `foobar` -> bf9cf968,
`""` -> 811c9dc5.

```python
def fnv1a(s):
    h = 2166136261
    for b in s.encode('utf-8'):
        h ^= b
        h = (h * 16777619) % (2**32)
    return format(h, '08x')
```

```js
function fnv1a(s){
  var enc=new TextEncoder();var bytes=enc.encode(s);var h=2166136261;
  for(var i=0;i<bytes.length;i++){h=h^bytes[i];h=Math.imul(h,16777619)>>>0;}
  var hex=h.toString(16);while(hex.length<8)hex='0'+hex;return hex;
}
```

Never change the hash function. Stable filenames are what allow the audio to be
re-generated later with better TTS without touching any HTML or JS.

## Paths

Always absolute, so they resolve at any folder depth:

    new Audio('/audio/es/' + fnv1a(text) + '.mp3')

Never `../audio/` or `audio/`.

## manifest.csv

    hash,language,text
    32f29db7,es,Hola
    ceb4cd04,de,Guten Morgen

Append-only. The `audio/<lang>/` folder is the source of truth — if the file
exists, it is valid and is skipped on the next generation pass.

## Language codes

| Folder | Language | Speech API fallback |
| ------ | -------- | ------------------- |
| es | Spanish | es-ES |
| de | German  | de-DE |
| bn | Bangla  | bn-BD |
| fr | French  | fr-FR |
| ar | Arabic  | ar-SA |
| zh | Chinese | zh-CN |
| ru | Russian | ru-RU |

## Status

Folders are in place and empty. Chapter files still use the existing live-TTS
hotlinks; they get migrated to the static `tts()` play function once the mp3s
are generated and uploaded.
