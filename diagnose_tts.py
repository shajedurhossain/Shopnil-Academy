#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Diagnostic for the 5 silent Chapter 1 letters. Tries a few variations of
voice/rate/text for each one and saves the results LOCALLY ONLY -- nothing
is uploaded to R2, nothing touches manifest.csv. Run this from the same
folder as generate_audio.py (needs the same .env with Google Cloud creds).

Usage:
  python diagnose_tts.py

Produces files named like:
  variant_da5f2cfa_A_altvoice.mp3
  variant_da5f2cfa_B_period.mp3
  ...
Send all of them back and they'll get checked for actual audible content.
"""
import os
from dotenv import load_dotenv
from google.cloud import texttospeech

load_dotenv()

VOICE_CFG = {'code': 'bn-IN', 'f': 'bn-IN-Chirp3-HD-Kore', 'm': 'bn-IN-Chirp3-HD-Charon'}

# (label used in filename, bengali char, hash -- hash is just for the filename,
#  not used for synthesis)
PROBLEM_STRINGS = [
    ('da5f2cfa', 'অ'),
    ('d95f2b67', 'আ'),
    ('c75f0f11', 'ঐ'),
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
    fname = 'variant_{0}_{1}.mp3'.format(h, suffix)
    with open(fname, 'wb') as f:
        f.write(audio)
    print('  wrote {0}  ({1} bytes)  text={2!r} voice={3} rate={4}'.format(
        fname, len(audio), actual_text, voice_key, rate))


print('=== TTS variation diagnostic (local only, nothing uploaded) ===')
print()
for h, text in PROBLEM_STRINGS:
    print('--- {0} ({1}) ---'.format(h, text))
    # A: alternate (male) voice, same rate, same bare text
    run_variant(h, text, 'A_altvoice', 'm', 0.9)
    # B: normal speaking rate instead of 0.9, same voice, same bare text
    run_variant(h, text, 'B_rate10', 'f', 1.0)
    # C: trailing period -- text sent to TTS only; production fix would
    #    keep hashing the BARE text so the JS lookup is unaffected
    run_variant(h, text, 'C_period', 'f', 0.9, text_override=text + '.')
    print()

print('Done. Send ALL the variant_*.mp3 files back for a volume/silence check.')
