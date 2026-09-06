#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Shopnil Academy — R2 Manifest Cleanup

Two independent ways to find contaminated manifest.csv rows / R2 files,
because no single method safely covers every language on the platform.

MODE A — script check (fast, no course files needed)
  Only works for ar, bn, zh, ru — languages with a visually distinctive
  writing system. Flags a row if it's tagged e.g. language=ar but contains
  ZERO Arabic-script characters (i.e. it's actually some other script
  entirely, like the Bangla-under-Arabic incident this was built for).

    python cleanup_contamination.py --lang ar --dry-run
    python cleanup_contamination.py --lang ar

MODE B — ground-truth check (works for ANY language, including
  es/en/fr/de, which share the Latin alphabet and can't be told apart
  by script alone)
  Re-extracts the correct, current set of strings straight from a course's
  actual chapter HTML files (using the same fixed extractor as
  generate_audio.py), then flags any manifest row tagged with that course
  whose hash ISN'T in that correct set. This doesn't guess based on
  appearance — it checks against the real source of truth. Requires
  --chapters and --course so it knows exactly which course's rows to
  check (rows belonging to OTHER courses that legitimately share the same
  language folder are left alone).

    python cleanup_contamination.py --lang es --chapters courses/spanish-bangla/a1/ --course es-bn --dry-run
    python cleanup_contamination.py --lang es --chapters courses/spanish-bangla/a1/ --course es-bn

Always run --dry-run first. Always read the printed list before confirming.
"""

import os, re, sys, csv, io, argparse, html as html_mod
import boto3
from dotenv import load_dotenv

load_dotenv()

MANIFEST_KEY = 'audio/manifest.csv'
BUCKET       = os.getenv('R2_BUCKET', 'shopnil-media')

# ── Mode A: script ranges, for the 4 languages with a distinctive script ──
SCRIPT_RANGES = {
    'ar': [('\u0600', '\u06FF'), ('\u0750', '\u077F'), ('\u08A0', '\u08FF')],  # Arabic
    'bn': [('\u0980', '\u09FF')],                                              # Bengali
    'zh': [('\u4E00', '\u9FFF')],                                              # CJK
    'ru': [('\u0400', '\u04FF')],                                              # Cyrillic
    # es/en/fr/de deliberately absent — Latin script overlaps too much with
    # legitimate loanwords/proper nouns to safely auto-detect this way.
    # Use Mode B for these.
}

# ── FNV-1a 32-bit hash — must match generate_audio.py and every course's JS ─
def fnv1a(s):
    h = 2166136261
    for b in s.encode('utf-8'):
        h ^= b
        h = (h * 16777619) % (2**32)
    return format(h, '08x')

# ── Extractor — identical to the fixed version in generate_audio.py ──────
def extract_strings(fname, lang):
    with open(fname, 'r', encoding='utf-8') as f:
        content = f.read()

    strings = set()

    for m in re.finditer(r"""tts\(\s*['"]([^'"]+)['"]\s*\)""", content):
        strings.add(html_mod.unescape(m.group(1)))

    script_m = re.search(r'<script>(.*?)</script>', content, re.S)
    if script_m:
        js = script_m.group(1)

        lang_field_pattern = re.escape(lang) + r"""\s*:\s*'((?:[^'\\]|\\.)*)'"""
        for m in re.finditer(lang_field_pattern, js):
            val = m.group(1).replace("\\'", "'")
            if val.strip():
                strings.add(val)

        la_m = re.search(r'var letterAudio\s*=\s*\{(.*?)\n\};', js, re.S)
        if la_m:
            for m in re.finditer(r"""'[a-zA-Z0-9_]+'\s*:\s*'((?:[^'\\]|\\.)*)'""", la_m.group(1)):
                val = m.group(1).replace("\\'", "'")
                if val.strip():
                    strings.add(val)

        for m in re.finditer(
                r"""makeListenPlayer\s*\(\s*'[^']+'\s*,\s*'((?:[^'\\]|\\.)*)'\s*\)""", js):
            val = m.group(1).replace("\\'", "'")
            if val.strip():
                strings.add(val)

    strings = {s for s in strings if s.strip()}
    return strings

def make_r2():
    return boto3.client('s3',
        endpoint_url=os.getenv('R2_ENDPOINT'),
        aws_access_key_id=os.getenv('R2_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('R2_SECRET_ACCESS_KEY'))

def load_manifest(r2):
    obj = r2.get_object(Bucket=BUCKET, Key=MANIFEST_KEY)
    content = obj['Body'].read().decode('utf-8')
    reader = csv.DictReader(content.splitlines())
    return list(reader)

def save_manifest(r2, rows):
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

def has_any_char_in_ranges(text, ranges):
    for c in text:
        for lo, hi in ranges:
            if lo <= c <= hi:
                return True
    return False

def is_contaminated_by_script(row, target_lang):
    if target_lang not in SCRIPT_RANGES:
        return False
    text = row['text']
    own_ranges = SCRIPT_RANGES[target_lang]
    has_letters = any(c.isalpha() for c in text)
    if not has_letters:
        return False
    return not has_any_char_in_ranges(text, own_ranges)

def find_bad_rows_mode_a(rows, lang):
    lang_rows = [r for r in rows if r.get('language') == lang]
    return [r for r in lang_rows if is_contaminated_by_script(r, lang)]

def find_bad_rows_mode_b(rows, lang, chapters_folder, course):
    folder = chapters_folder.rstrip('/\\')
    chapter_files = sorted([
        os.path.join(folder, f)
        for f in os.listdir(folder)
        if f.startswith('chapter') and f.endswith('.html')
    ])
    if not chapter_files:
        print('  WARNING: no chapter*.html files found in', folder)

    correct_strings = set()
    for fname in chapter_files:
        correct_strings |= extract_strings(fname, lang)
    correct_hashes = {fnv1a(s) for s in correct_strings}

    print('  Re-extracted {0} correct strings from {1} chapter file(s)'.format(
        len(correct_strings), len(chapter_files)))

    course_rows = [r for r in rows if r.get('language') == lang and r.get('course') == course]
    print('  {0} manifest rows tagged language={1}, course={2}'.format(
        len(course_rows), lang, course))

    return [r for r in course_rows if r['hash'] not in correct_hashes]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--lang', required=True, help='Language to check, e.g. ar, es')
    parser.add_argument('--chapters', help='(Mode B) folder of this course\'s chapter HTML files')
    parser.add_argument('--course', help='(Mode B) course code, e.g. es-bn — required with --chapters')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    mode_b = bool(args.chapters)
    if mode_b and not args.course:
        print('Error: --chapters requires --course too, so only that course\'s rows are checked.')
        sys.exit(1)
    if not mode_b and args.lang not in SCRIPT_RANGES:
        print('No script-range rule for language "{0}", and no --chapters given for a ground-truth check.'.format(args.lang))
        print('For es/en/fr/de, re-run with --chapters <folder> --course <code> (Mode B).')
        sys.exit(1)

    r2 = make_r2()
    print('Loading manifest...')
    rows = load_manifest(r2)
    print('  {0} total rows in manifest'.format(len(rows)))
    print()

    if mode_b:
        print('=== Mode B: ground-truth check against {0} ==='.format(args.chapters))
        bad = find_bad_rows_mode_b(rows, args.lang, args.chapters, args.course)
    else:
        print('=== Mode A: script check for language={0} ==='.format(args.lang))
        bad = find_bad_rows_mode_a(rows, args.lang)

    print()
    print('Found {0} contaminated/mismatched row(s):'.format(len(bad)))
    for r in bad:
        print('  [{0}] course={1} | {2}'.format(r['hash'], r.get('course',''), r['text'][:60]))

    if not bad:
        print()
        print('Nothing to clean up.')
        return

    if args.dry_run:
        print()
        print('DRY RUN — nothing deleted. Re-run without --dry-run to actually delete these {0} files and rows.'.format(len(bad)))
        return

    print()
    confirm = input('Type DELETE to permanently remove these {0} files and manifest rows: '.format(len(bad)))
    if confirm.strip() != 'DELETE':
        print('Aborted — nothing was deleted.')
        return

    bad_keys = {(r['hash'], r['language']) for r in bad}
    good = [r for r in rows if (r['hash'], r['language']) not in bad_keys]

    deleted_files = 0
    for r in bad:
        key = 'audio/{0}/{1}.mp3'.format(r['language'], r['hash'])
        try:
            r2.delete_object(Bucket=BUCKET, Key=key)
            deleted_files += 1
            print('  deleted', key)
        except Exception as e:
            print('  FAILED to delete', key, '-', str(e)[:80])

    save_manifest(r2, good)
    print()
    print('Done. Deleted {0} audio file(s), manifest now has {1} rows (was {2}).'.format(
        deleted_files, len(good), len(rows)))

if __name__ == '__main__':
    main()
