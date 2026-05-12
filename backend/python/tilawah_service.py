import base64
import tempfile
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np

app = FastAPI()

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


def load_audio_bytes(audio_bytes: bytes) -> np.ndarray:
    """Decode audio bytes (m4a/wav/aac/any) to float32 numpy array at 16kHz mono."""
    import av

    with tempfile.NamedTemporaryFile(suffix='.audio', delete=False) as f:
        f.write(audio_bytes)
        temp_path = f.name

    try:
        container = av.open(temp_path)
        samples = []
        resampler = av.AudioResampler(format='fltp', layout='mono', rate=16000)
        for frame in container.decode(audio=0):
            for out_frame in resampler.resample(frame):
                samples.append(out_frame.to_ndarray()[0])
        container.close()

        if not samples:
            raise ValueError("No audio frames decoded")

        audio_array = np.concatenate(samples).astype(np.float32)
        return audio_array
    finally:
        try:
            os.unlink(temp_path)
        except Exception:
            pass


class EvaluateRequest(BaseModel):
    audio_base64: str
    expected_text: str
    verse_number: int
    chapter_id: int


class WordResult(BaseModel):
    word: str
    correct: bool
    expected: str


class EvaluateResponse(BaseModel):
    transcription: str
    word_results: list[WordResult]
    word_accuracy: int
    tajweed_score: int
    score: int
    feedback: list[str]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/evaluate", response_model=EvaluateResponse)
def evaluate(req: EvaluateRequest):
    try:
        audio_bytes = base64.b64decode(req.audio_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 audio")

    try:
        audio_array = load_audio_bytes(audio_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot read audio: {e}")

    model, processor = get_model()
    import torch
    inputs = processor(audio_array, sampling_rate=16000, return_tensors="pt")
    with torch.no_grad():
        predicted_ids = model.generate(inputs["input_features"])
    transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0].strip()

    from tajweed_engine import compare_texts, analyze_tajweed

    raw_word_results, word_accuracy = compare_texts(req.expected_text, transcription)
    tajweed_score, tajweed_feedback = analyze_tajweed(req.expected_text, len(audio_array) / 16000)

    word_results = [
        WordResult(
            word=w.word,
            correct=(w.status == "correct"),
            expected=w.word,
        )
        for w in raw_word_results
    ]

    completeness = 100 if not any(w.status == "missing" for w in raw_word_results) else 70
    score = int(word_accuracy * 0.6 + tajweed_score * 0.2 + completeness * 0.2)

    feedback = []
    wrong_words = [w for w in raw_word_results if w.status == "wrong"]
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
