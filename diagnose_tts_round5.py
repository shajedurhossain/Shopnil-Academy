#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Round 5 -- one quick check. Standard-A fixed হ and কি cleanly with their
BARE, unmodified text (no trimming, no duplication needed). অ currently
has a working fix too, but it needs an audio-trim step (doubled text,
then cut to keep only the first instance) because Chirp3 HD never
produced real volume for it under any single-voice-tier variant tried.

This tests whether Standard-A ALSO handles অ cleanly with bare text --
if so, all three problem letters (অ, হ, কি) can use the exact same
simple fix (just a different voice, no text/audio editing at all),
which is much less fragile to ship than a trimming step.

Local only. Run from the same folder as generate_audio.py.

Usage:
  python diagnose_tts_round5.py

Produces:
  variant5_da5f2cfa_standardA.mp3
"""
import os
from dotenv import load_dotenv
from google.cloud import texttospeech

load_dotenv()

LANG_CODE = 'bn-IN'


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


print('=== TTS round-5: does Standard-A also fix bare অ? ===')
text = 'অ'
h = 'da5f2cfa'
try:
    audio = synth(text, 'bn-IN-Standard-A', 1.0)
    fname = 'variant5_{0}_standardA.mp3'.format(h)
    with open(fname, 'wb') as f:
        f.write(audio)
    print('  wrote {0}  ({1} bytes)  text={2!r} voice=bn-IN-Standard-A rate=1.0'.format(
        fname, len(audio), text))
except Exception as e:
    print('  FAILED: {0}'.format(str(e)[:120]))

print('Done. Send back variant5_da5f2cfa_standardA.mp3.')
