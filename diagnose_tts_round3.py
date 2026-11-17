#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Round 3 diagnostic for the 2 letters still unresolved (হ and কি). Doubling
the text (round 2) DID produce real volume, but you confirmed by ear that
both came out as the letter said twice with no gap -- not usable. So this
round avoids duplicating the spoken content entirely:

  H: a leading period+space instead of a trailing one (plain text) --
     round 1/2 only ever tried trailing punctuation.
  J: SSML with an explicit 300ms silence tag AFTER the single letter --
     gives the model something to "do" after the grapheme without making
     it say anything twice.
  K: same idea, 600ms break, in case 300ms isn't enough.

Local only -- nothing uploaded to R2, nothing touches manifest.csv. Run
from the same folder as generate_audio.py (needs the same .env with
Google Cloud creds).

Usage:
  python diagnose_tts_round3.py

Produces files named like:
  variant3_de5f3346_H_leadperiod.mp3
  variant3_de5f3346_J_ssmlbreak300.mp3
  variant3_de5f3346_K_ssmlbreak600.mp3
  ...
Send all of them back and they'll get checked for actual audible content.
"""
import os
from dotenv import load_dotenv
from google.cloud import texttospeech

load_dotenv()

VOICE_CFG = {'code': 'bn-IN', 'f': 'bn-IN-Chirp3-HD-Kore', 'm': 'bn-IN-Chirp3-HD-Charon'}

# Only the 2 letters still unresolved.
PROBLEM_STRINGS = [
    ('de5f3346', 'হ'),
    ('7479ba35', 'কি'),
]


def synth_text(text, voice_key, rate):
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


def synth_ssml(ssml, voice_key, rate):
    client = texttospeech.TextToSpeechClient()
    resp = client.synthesize_speech(
        input=texttospeech.SynthesisInput(ssml=ssml),
        voice=texttospeech.VoiceSelectionParams(
            language_code=VOICE_CFG['code'],
            name=VOICE_CFG[voice_key]),
        audio_config=texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=rate),
    )
    return resp.audio_content


def run_text_variant(h, suffix, text, voice_key, rate):
    try:
        audio = synth_text(text, voice_key, rate)
    except Exception as e:
        print('  FAILED {0}_{1}: {2}'.format(h, suffix, str(e)[:80]))
        return
    fname = 'variant3_{0}_{1}.mp3'.format(h, suffix)
    with open(fname, 'wb') as f:
        f.write(audio)
    print('  wrote {0}  ({1} bytes)  text={2!r} voice={3} rate={4}'.format(
        fname, len(audio), text, voice_key, rate))


def run_ssml_variant(h, suffix, ssml, voice_key, rate):
    try:
        audio = synth_ssml(ssml, voice_key, rate)
    except Exception as e:
        print('  FAILED {0}_{1}: {2}'.format(h, suffix, str(e)[:80]))
        return
    fname = 'variant3_{0}_{1}.mp3'.format(h, suffix)
    with open(fname, 'wb') as f:
        f.write(audio)
    print('  wrote {0}  ({1} bytes)  ssml={2!r} voice={3} rate={4}'.format(
        fname, len(audio), ssml, voice_key, rate))


print('=== TTS round-3 diagnostic for হ and কি (local only) ===')
print()
for h, text in PROBLEM_STRINGS:
    print('--- {0} ({1}) ---'.format(h, text))
    # H: leading period+space instead of trailing -- plain text, new angle
    run_text_variant(h, 'H_leadperiod', '. ' + text, 'f', 0.9)
    # J: SSML, single bare grapheme + explicit 300ms silence tag after it
    #    (no duplicated speech content)
    ssml_300 = '<speak>' + text + '<break time="300ms"/></speak>'
    run_ssml_variant(h, 'J_ssmlbreak300', ssml_300, 'f', 0.9)
    # K: same, but 600ms break in case 300ms isn't enough
    ssml_600 = '<speak>' + text + '<break time="600ms"/></speak>'
    run_ssml_variant(h, 'K_ssmlbreak600', ssml_600, 'f', 0.9)
    print()

print('Done. Send ALL the variant3_*.mp3 files back for a volume/silence check.')
