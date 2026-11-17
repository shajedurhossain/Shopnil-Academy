#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Round 2 diagnostic for the 3 letters that are STILL silent after round 1
(alt voice alone, normal rate alone, and trailing period alone all failed
for these three). This time we combine perturbations and try a couple of
new angles. Local only -- nothing uploaded to R2, nothing touches
manifest.csv. Run from the same folder as generate_audio.py (needs the
same .env with Google Cloud creds).

Usage:
  python diagnose_tts_round2.py

Produces files named like:
  variant2_da5f2cfa_D_altvoice_period.mp3
  ...
Send all of them back and they'll get checked for actual audible content.
"""
import os
from dotenv import load_dotenv
from google.cloud import texttospeech

load_dotenv()

VOICE_CFG = {'code': 'bn-IN', 'f': 'bn-IN-Chirp3-HD-Kore', 'm': 'bn-IN-Chirp3-HD-Charon'}

# Only the 3 still-silent letters from round 1.
PROBLEM_STRINGS = [
    ('da5f2cfa', 'অ'),
    ('de5f3346', 'হ'),
    ('7479ba35', 'কি'),
]


def synth(text, voice_key, rate):
    client = texttospeech.TextToSpeechClient()
    resp = client.synthesize_speech(
        input=texttospeech.SynthesisInput(text=text),
        voice=texttospeech.VoiceSelectionParams(
            language_code=VOICE_CFG['code'],
            name=VOICE_CFG[voice_key]),
        audio_config=texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=rate),
    )
    return resp.audio_content


def run_variant(h, text, suffix, voice_key, rate, text_override=None):
    actual_text = text_override if text_override is not None else text
    try:
        audio = synth(actual_text, voice_key, rate)
    except Exception as e:
        print('  FAILED {0}_{1}: {2}'.format(h, suffix, str(e)[:80]))
        return
    fname = 'variant2_{0}_{1}.mp3'.format(h, suffix)
    with open(fname, 'wb') as f:
        f.write(audio)
    print('  wrote {0}  ({1} bytes)  text={2!r} voice={3} rate={4}'.format(
        fname, len(audio), actual_text, voice_key, rate))


print('=== TTS round-2 diagnostic for the 3 still-silent letters (local only) ===')
print()
for h, text in PROBLEM_STRINGS:
    print('--- {0} ({1}) ---'.format(h, text))
    # D: combine alt voice AND trailing period (both single changes failed
    #    alone -- maybe it needs both at once)
    run_variant(h, text, 'D_altvoice_period', 'm', 0.9, text_override=text + '.')
    # E: combine alt voice AND normal rate
    run_variant(h, text, 'E_altvoice_rate10', 'm', 1.0)
    # F: double the character with a space -- a longer input, in case the
    #    model collapses to near-silence specifically on very short/single
    #    grapheme inputs regardless of voice/rate
    run_variant(h, text, 'F_doubled', 'f', 0.9, text_override=text + ' ' + text)
    # G: trailing comma instead of a period -- a different punctuation cue
    #    (non-terminal/continuing clause instead of a full stop)
    run_variant(h, text, 'G_comma', 'f', 0.9, text_override=text + ',')
    print()

print('Done. Send ALL the variant2_*.mp3 files back for a volume/silence check.')
