import base64
import tempfile
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import soundfile as sf
import numpy as np

app = FastAPI()

# Load model sekali saat startup (lazy load agar cepat start)
_model = None
_processor = None

def get_model():
    global _model, _processor
    if _model is None:
        from transformers import WhisperProcessor, WhisperForConditionalGeneration
        print("Loading tarteel-ai/whisper-base-ar-quran model...")
        _processor = WhisperProcessor.from_pretrained("tarteel-ai/whisper-base-ar-quran")
        _model = WhisperForConditionalGeneration.from_pretrained("tarteel-ai/whisper-base-ar-quran")
        _model.eval()
        print("Model loaded.")
    return _model, _processor


class EvaluateRequest(BaseModel):
    audio_base64: str      # audio m4a/wav dikodekan base64
    expected_text: str     # teks arab ayat dari quran.com (text_uthmani)
    verse_number: int
    chapter_id: int


class WordResult(BaseModel):
    word: str
    status: str            # "correct" | "wrong" | "missing"
    position: int


class EvaluateResponse(BaseModel):
    transcription: str
    word_results: list[WordResult]
    word_accuracy: int     # 0-100
    tajweed_score: int     # 0-100
    score: int             # 0-100 total
    feedback: list[str]    # pesan feedback bahasa Indonesia


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/evaluate", response_model=EvaluateResponse)
def evaluate(req: EvaluateRequest):
    # 1. Decode audio
    try:
        audio_bytes = base64.b64decode(req.audio_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 audio")

    # 2. Simpan ke temp file dan load sebagai array
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(audio_bytes)
        temp_path = f.name

    try:
        audio_array, sample_rate = sf.read(temp_path)
        if audio_array.ndim > 1:
            audio_array = audio_array.mean(axis=1)  # stereo → mono
        # Resample ke 16kHz jika perlu
        if sample_rate != 16000:
            import torchaudio
            import torch
            waveform = torch.tensor(audio_array).float().unsqueeze(0)
            resampler = torchaudio.transforms.Resample(sample_rate, 16000)
            audio_array = resampler(waveform).squeeze().numpy()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot read audio: {e}")
    finally:
        os.unlink(temp_path)

    # 3. Transkripsi dengan Whisper
    model, processor = get_model()
    import torch
    inputs = processor(audio_array, sampling_rate=16000, return_tensors="pt")
    with torch.no_grad():
        predicted_ids = model.generate(inputs["input_features"], language="ar")
    transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0].strip()

    # 4. Analisis dengan tajweed engine
    from tajweed_engine import compare_texts, analyze_tajweed

    word_results, word_accuracy = compare_texts(req.expected_text, transcription)
    tajweed_score, tajweed_feedback = analyze_tajweed(req.expected_text, len(audio_array) / 16000)

    # 5. Hitung skor total
    completeness = 100 if not any(w.status == "missing" for w in word_results) else 70
    score = int(word_accuracy * 0.6 + tajweed_score * 0.2 + completeness * 0.2)

    # 6. Feedback bahasa Indonesia
    feedback = []
    wrong_words = [w for w in word_results if w.status == "wrong"]
    if wrong_words:
        feedback.append(f"Ada {len(wrong_words)} kata yang perlu diperbaiki pengucapannya.")
    feedback.extend(tajweed_feedback)
    if score >= 85:
        feedback.insert(0, "MasyaAllah! Bacaan sangat bagus! 🌟")
    elif score >= 65:
        feedback.insert(0, "Bagus! Terus berlatih untuk hasil lebih baik.")
    else:
        feedback.insert(0, "Jangan menyerah! Ulangi dan perhatikan kata yang disorot merah.")

    return EvaluateResponse(
        transcription=transcription,
        word_results=word_results,
        word_accuracy=word_accuracy,
        tajweed_score=tajweed_score,
        score=score,
        feedback=feedback,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
