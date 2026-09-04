#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Shopnil Academy — Audio Generator
Chirp 3: HD (Google Cloud TTS) -> Cloudflare R2

Usage:
  python generate_audio.py --lang es --chapters courses/spanish-bangla/a1/
  python generate_audio.py --lang bn --chapters courses/bangla-english/a1/
  python generate_audio.py --lang es --file courses/spanish-bangla/a1/chapter3.html

Options:
  --lang      Target language code: es, en, de, fr, ar, bn, zh, ru
  --chapters  Path to folder containing chapter HTML files
  --file      Single chapter HTML file (alternative to --chapters)
  --dry-run   Extract and count strings only, no generation
  --force     Regenerate files even if they already exist in R2
"""

import os, re, sys, csv, html as html_mod, argparse, tempfile, time
import boto3
from dotenv import load_dotenv
from google.cloud import texttospeech

load_dotenv()

# ── Voice config — PINNED, never change without updating manifest ──────────
VOICES = {
    'ar': {'code': 'ar-XA',  'f': 'ar-XA-Chirp3-HD-Kore',  'm': 'ar-XA-Chirp3-HD-Charon'},
    'bn': {'code': 'bn-IN',  'f': 'bn-IN-Chirp3-HD-Kore',  'm': 'bn-IN-Chirp3-HD-Charon'},
    'zh': {'code': 'cmn-CN', 'f': 'cmn-CN-Chirp3-HD-Kore', 'm': 'cmn-CN-Chirp3-HD-Charon'},
    'en': {'code': 'en-GB',  'f': 'en-GB-Chirp3-HD-Kore',  'm': 'en-GB-Chirp3-HD-Charon'},
    'fr': {'code': 'fr-FR',  'f': 'fr-FR-Chirp3-HD-Kore',  'm': 'fr-FR-Chirp3-HD-Charon'},
    'de': {'code': 'de-DE',  'f': 'de-DE-Chirp3-HD-Kore',  'm': 'de-DE-Chirp3-HD-Charon'},
    'ru': {'code': 'ru-RU',  'f': 'ru-RU-Chirp3-HD-Kore',  'm': 'ru-RU-Chirp3-HD-Charon'},
    'es': {'code': 'es-ES',  'f': 'es-ES-Chirp3-HD-Kore',  'm': 'es-ES-Chirp3-HD-Charon'},
}

MANIFEST_KEY = 'audio/manifest.csv'
BUCKET       = os.getenv('R2_BUCKET', 'shopnil-media')
MEDIA_BASE   = 'https://media.shopnilacademy.com'

# ── FNV-1a 32-bit hash ─────────────────────────────────────────────────────
def fnv1a(s):
    h = 2166136261
    for b in s.encode('utf-8'):
        h ^= b
        h = (h * 16777619) % (2**32)
    return format(h, '08x')

# ── R2 client ──────────────────────────────────────────────────────────────
def make_r2():
    return boto3.client('s3',
        endpoint_url=os.getenv('R2_ENDPOINT'),
        aws_access_key_id=os.getenv('R2_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('R2_SECRET_ACCESS_KEY'))

# ── Check file exists in R2 ────────────────────────────────────────────────
def r2_exists(r2, key):
    try:
        r2.head_object(Bucket=BUCKET, Key=key)
        return True
    except Exception:
        return False

# ── Load existing manifest from R2 ────────────────────────────────────────
def load_manifest(r2):
    rows = []
    try:
        obj = r2.get_object(Bucket=BUCKET, Key=MANIFEST_KEY)
        content = obj['Body'].read().decode('utf-8')
        reader = csv.DictReader(content.splitlines())
        rows = list(reader)
    except Exception:
        pass
    return rows

# ── Save manifest back to R2 ──────────────────────────────────────────────
def save_manifest(r2, rows):
    import io
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=['hash','language','voice','course','text'])
    writer.writeheader()
    for row in sorted(rows, key=lambda r: (r['language'], r['hash'])):
        writer.writerow(row)
    r2.put_object(
        Bucket=BUCKET,
        Key=MANIFEST_KEY,
        Body=buf.getvalue().encode('utf-8'),
        ContentType='text/csv',
        CacheControl='no-cache')
    print('  Manifest updated ({0} rows)'.format(len(rows)))

# ── Extract all unique TTS strings from a chapter HTML file ───────────────
def extract_strings(fname):
    with open(fname, 'r', encoding='utf-8') as f:
        content = f.read()

    strings = set()

    # 1. onclick="tts('...')" in HTML
    for m in re.finditer(r"""tts\(\s*['"]([^'"]+)['"]\s*\)""", content):
        strings.add(html_mod.unescape(m.group(1)))

    # 2. Target-language fields in JS data objects
    script_m = re.search(r'<script>(.*?)</script>', content, re.S)
    if script_m:
        js = script_m.group(1)
        # es:/de:/bn:/fr: etc fields in spData
        for m in re.finditer(r"""(?:es|de|bn|fr|ar|zh|ru|en)\s*:\s*'((?:[^'\\]|\\.)*)'""", js):
            val = m.group(1).replace("\\'", "'")
            if val.strip():
                strings.add(val)
        # makeListenPlayer dialogue strings
        for m in re.finditer(
                r"""makeListenPlayer\s*\(\s*'[^']+'\s*,\s*'((?:[^'\\]|\\.)*)'\s*\)""", js):
            val = m.group(1).replace("\\'", "'")
            if val.strip():
                strings.add(val)

    # Remove empty / whitespace-only
    strings = {s for s in strings if s.strip()}
    return strings

# ── Synthesise one string with Chirp 3: HD ────────────────────────────────
def synthesise(text, lang, speaker='f'):
    voice_cfg = VOICES[lang]
    client = texttospeech.TextToSpeechClient()
    resp = client.synthesize_speech(
        input=texttospeech.SynthesisInput(text=text),
        voice=texttospeech.VoiceSelectionParams(
            language_code=voice_cfg['code'],
            name=voice_cfg[speaker]),
        audio_config=texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=0.9),   # slightly slower for A1 learners
    )
    return resp.audio_content

# ── Upload mp3 bytes to R2 ────────────────────────────────────────────────
def upload(r2, mp3_bytes, key):
    r2.put_object(
        Bucket=BUCKET,
        Key=key,
        Body=mp3_bytes,
        ContentType='audio/mpeg',
        CacheControl='public, max-age=31536000, immutable')

# ── Verify FNV-1a matches JS ──────────────────────────────────────────────
def verify_hash():
    import subprocess
    tests = ['Hola', 'Buenos días.', '¿Cómo te llamas?', 'আমার নাম']
    js = 'function fnv1a(s){var enc=new TextEncoder();var bytes=enc.encode(s);var h=2166136261;for(var i=0;i<bytes.length;i++){h=h^bytes[i];h=Math.imul(h,16777619)>>>0;}var hex=h.toString(16);while(hex.length<8){hex="0"+hex;}return hex;}\n'
    js += 'var t=' + str(tests) + ';t.forEach(function(s){console.log(fnv1a(s));});'
    r = subprocess.run(['node', '-e', js], capture_output=True, text=True)
    js_hashes = r.stdout.strip().splitlines()
    ok = True
    for i, t in enumerate(tests):
        py_h = fnv1a(t)
        js_h = js_hashes[i] if i < len(js_hashes) else 'MISSING'
        if py_h != js_h:
            print('  HASH MISMATCH for', repr(t), ':', py_h, 'vs', js_h)
            ok = False
    return ok

# ── Main ───────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--lang',     required=True, choices=list(VOICES.keys()))
    parser.add_argument('--chapters', help='Folder containing chapter HTML files')
    parser.add_argument('--file',     help='Single chapter HTML file')
    parser.add_argument('--course',   default='', help='Course code for manifest (e.g. es-bn)')
    parser.add_argument('--dry-run',  action='store_true')
    parser.add_argument('--force',    action='store_true',
                        help='Regenerate even if file exists in R2')
    args = parser.parse_args()

    if not args.chapters and not args.file:
        print('Error: provide --chapters or --file')
        sys.exit(1)

    print('=== Shopnil Academy Audio Generator ===')
    print('Language:', args.lang, '| Voice:', VOICES[args.lang]['f'])

    # Collect chapter files
    chapter_files = []
    if args.file:
        chapter_files = [args.file]
    else:
        folder = args.chapters.rstrip('/\\')
        chapter_files = sorted([
            os.path.join(folder, f)
            for f in os.listdir(folder)
            if f.startswith('chapter') and f.endswith('.html')
        ])
    print('Chapters:', len(chapter_files))

    # Verify hash
    print()
    print('=== Step 1: Verify FNV-1a hash ===')
    if not verify_hash():
        print('ABORT: hash mismatch between Python and JavaScript')
        sys.exit(1)
    print('  Hash verified OK')

    # Extract strings
    print()
    print('=== Step 2: Extract TTS strings ===')
    all_strings = set()
    for fname in chapter_files:
        s = extract_strings(fname)
        print('  {0}: {1} strings'.format(os.path.basename(fname), len(s)))
        all_strings |= s
    print('  Total unique strings:', len(all_strings))

    if args.dry_run:
        print()
        print('DRY RUN — no files generated')
        total_chars = sum(len(s) for s in all_strings)
        print('Estimated characters:', total_chars)
        print('Free tier usage: {0:.1f}%'.format(total_chars / 10000))
        return

    # Connect to R2
    print()
    print('=== Step 3: Connect to R2 ===')
    r2 = make_r2()
    manifest_rows = load_manifest(r2)
    existing_hashes = {row['hash'] for row in manifest_rows
                       if row.get('language') == args.lang}
    print('  Existing {0} files in R2: {1}'.format(args.lang, len(existing_hashes)))

    # Generate missing files
    print()
    print('=== Step 4: Generate and upload ===')
    new_count = 0
    skipped   = 0
    failed    = 0

    for text in sorted(all_strings):
        h = fnv1a(text)
        key = 'audio/{0}/{1}.mp3'.format(args.lang, h)

        # Check if already in R2
        if not args.force and h in existing_hashes:
            skipped += 1
            continue

        if not args.force and r2_exists(r2, key):
            skipped += 1
            existing_hashes.add(h)
            continue

        # Synthesise
        try:
            mp3 = synthesise(text, args.lang)
            upload(r2, mp3, key)
            new_count += 1
            existing_hashes.add(h)
            manifest_rows.append({
                'hash': h,
                'language': args.lang,
                'voice': VOICES[args.lang]['f'],
                'course': args.course,
                'text': text,
            })
            print('  NEW [{0}] {1}'.format(h, text[:55]))
            # Small delay to avoid rate limiting
            time.sleep(0.1)
        except Exception as e:
            print('  FAILED: {0} | {1}'.format(repr(text[:40]), str(e)[:60]))
            failed += 1

    print()
    print('Generated: {0} | Skipped: {1} | Failed: {2}'.format(
        new_count, skipped, failed))

    # Save manifest
    if new_count > 0:
        print()
        print('=== Step 5: Update manifest ===')
        save_manifest(r2, manifest_rows)

    # Summary
    print()
    if failed == 0:
        print('SUCCESS — all audio generated and uploaded to R2')
        print('Audio URL pattern:')
        print('  {0}/audio/{1}/[hash].mp3'.format(MEDIA_BASE, args.lang))
    else:
        print('COMPLETED WITH ERRORS — {0} files failed, check above'.format(failed))

if __name__ == '__main__':
    main()
