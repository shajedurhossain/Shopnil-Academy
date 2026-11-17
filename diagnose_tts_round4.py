#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Round 4 diagnostic for the 2 letters still unresolved (হ and কি). Three
different single-knob changes (voice, rate, punctuation position, SSML
silence) have now all failed for these two specifically, while each
worked for at least one of the other three broken letters. Time to try
two different kinds of lever:

  L: double the grapheme with NO space ("হহ" / "কিকি" instead of "হ হ").
     Round 2's space-separated double got real volume but came out as
     the letter said twice with a gap -- confirmed by ear. With no space
     there's no word-boundary cue, so this might render as one longer/
     geminated sound instead of two separate repeats. Cheap to test.

  M, N: fall back to a non-Chirp3 voice tier entirely for just these two
     hashes. Chirp3 HD seems to have a specific collapse-to-silence
     quirk on certain very short bare inputs; an older Standard or
     Wavenet voice may not share it. 'bn-IN-Standard-A' and
     'bn-IN-Wavenet-A' are the standard Google Cloud TTS naming pattern
     for bn-IN -- I haven't verified these exact names exist on your
     account (no network access on my end), so the script reports
     cleanly if a voice name is rejected instead of crashing, and you
     can paste back whatever error you get if one fails.

Local only -- nothing uploaded to R2, nothing touches manifest.csv. Run
from the same folder as generate_audio.py (needs the same .env with
Google Cloud creds).

Usage:
  python diagnose_tts_round4.py

Produces files named like:
  variant4_de5f3346_L_nospace.mp3
  variant4_de5f3346_M_standardA.mp3
  variant4_de5f3346_N_wavenetA.mp3
  ...
Send back whatever gets written (some may be skipped if a voice name
doesn't exist) for a volume/silence check.
"""
import os
from dotenv import load_dotenv
from google.cloud import texttospeech

load_dotenv()

LANG_CODE = 'bn-IN'

# Only the 2 letters still unresolved.
PROBLEM_STRINGS = [
    ('de5f3346', 'হ'),
    ('7479ba35', 'কি'),
]

# Candidate fallback voice names to try alongside the existing Chirp3 HD
# voices. Standard naming pattern for Google Cloud TTS -- not yet
# confirmed to exist on this account.
FALLBACK_VOICES = [
    ('M_standardA', 'bn-IN-Standard-A'),
    ('N_wavenetA', 'bn-IN-Wavenet-A'),
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


def run_variant(h, suffix, text, voice_name, rate):
    try:
        audio = synth(text, voice_name, rate)
    except Exception as e:
        print('  SKIPPED {0}_{1}  (voice={2!r}): {3}'.format(
            h, suffix, voice_name, str(e)[:120]))
        return
    fname = 'variant4_{0}_{1}.mp3'.format(h, suffix)
    with open(fname, 'wb') as f:
        f.write(audio)
    print('  wrote {0}  ({1} bytes)  text={2!r} voice={3} rate={4}'.format(
        fname, len(audio), text, voice_name, rate))


print('=== TTS round-4 diagnostic for হ and কি (local only) ===')
print()
for h, text in PROBLEM_STRINGS:
    print('--- {0} ({1}) ---'.format(h, text))
    # L: double the grapheme with NO separating space
    run_variant(h, 'L_nospace', text + text, 'bn-IN-Chirp3-HD-Kore', 0.9)
    # M, N: fallback voice tiers, bare single-grapheme text, default rate
    for suffix, voice_name in FALLBACK_VOICES:
        run_variant(h, suffix, text, voice_name, 1.0)
    print()

print('Done. Send back whatever variant4_*.mp3 files got written.')
