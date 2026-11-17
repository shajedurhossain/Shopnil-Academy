#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Round 6 -- final confirmation before the real production patch. The
Standard-A fix for অ, হ and কি was only tested at speaking_rate=1.0 so
far. Your pipeline's normal rate for every other string is 0.9. This
checks the exact combination that would actually ship: bare text,
bn-IN-Standard-A, rate=0.9.

Local only. Run from the same folder as generate_audio.py.

Usage:
  python diagnose_tts_round6.py

Produces:
  variant6_da5f2cfa_standardA_rate09.mp3   (অ)
  variant6_de5f3346_standardA_rate09.mp3   (হ)
  variant6_7479ba35_standardA_rate09.mp3   (কি)
"""
import os
from dotenv import load_dotenv
from google.cloud import texttospeech

load_dotenv()

LANG_CODE = 'bn-IN'
VOICE_NAME = 'bn-IN-Standard-A'
RATE = 0.9  # the pipeline's normal production rate

STRINGS = [
    ('da5f2cfa', 'অ'),
    ('de5f3346', 'হ'),
    ('7479ba35', 'কি'),
]


def synth(text, voice_name, rate):
    client = texttospeech.TextToSpeechClient()
    resp = client.synthesize_speech(
        input=texttospeech.SynthesisInput(text=text),
        voice=texttospeech.VoiceSelectionParams(
            language_code=LANG_CODE,
            name=voice_name),
        audio_config=texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=rate),
    )
    return resp.audio_content


print('=== TTS round-6: অ/হ/কি on Standard-A at the real production rate (0.9) ===')
for h, text in STRINGS:
    try:
        audio = synth(text, VOICE_NAME, RATE)
        fname = 'variant6_{0}_standardA_rate09.mp3'.format(h)
        with open(fname, 'wb') as f:
            f.write(audio)
        print('  wrote {0}  ({1} bytes)  text={2!r} voice={3} rate={4}'.format(
            fname, len(audio), text, VOICE_NAME, RATE))
    except Exception as e:
        print('  FAILED {0}: {1}'.format(h, str(e)[:120]))

print('Done. Send back all 3 variant6_*.mp3 files.')
