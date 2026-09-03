from google.cloud import texttospeech

client = texttospeech.TextToSpeechClient()

resp = client.synthesize_speech(
    input=texttospeech.SynthesisInput(text="Hola, buenos días."),
    voice=texttospeech.VoiceSelectionParams(
        language_code="es-ES",
        name="es-ES-Chirp3-HD-Kore"),
    audio_config=texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3),
)

open("test.mp3", "wb").write(resp.audio_content)
print("Success — play test.mp3")