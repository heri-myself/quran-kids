import base64
import tempfile
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

_model = None


def get_model():
    global _model
    if _model is None:
        import stable_whisper
        print("Loading tarteel-ai/whisper-small-ar-quran model...")
        _model = stable_whisper.load_model("tarteel-ai/whisper-small-ar-quran")
        print("Model loaded.")
    return _model


def load_audio_to_tempfile(audio_bytes: bytes) -> str:
    """Write audio bytes to a temp file, return path. Caller must delete."""
    with tempfile.NamedTemporaryFile(suffix='.audio', delete=False) as f:
        f.write(audio_bytes)
        return f.name


class EvaluateRequest(BaseModel):
    audio_base64: str
    expected_text: str
    verse_number: int
    chapter_id: int


class WordResult(BaseModel):
    word: str
    correct: bool   # True if status is "correct" or "mad_short"
    expected: str
    status: str     # "correct" | "wrong" | "missing" | "mad_short"


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

    temp_path = None
    try:
        temp_path = load_audio_to_tempfile(audio_bytes)
        model = get_model()

        # stable-whisper: transcribe with word timestamps
        result = model.transcribe(temp_path, language="ar", word_timestamps=True)
        transcription = result.text.strip()

        # Extract word timestamps from all segments
        word_timestamps = []
        for segment in result.segments:
            for w in (segment.words or []):
                word_timestamps.append({
                    "word": w.word.strip(),
                    "start": w.start,
                    "end": w.end,
                })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot process audio: {e}")
    finally:
        if temp_path:
            try:
                os.unlink(temp_path)
            except Exception:
                pass

    from tajweed_engine import compare_texts, detect_mad_errors, analyze_tajweed

    raw_word_results, word_accuracy = compare_texts(req.expected_text, transcription)
    detect_mad_errors(raw_word_results, word_timestamps)
    tajweed_score, tajweed_feedback = analyze_tajweed(raw_word_results)

    word_results = [
        WordResult(
            word=w.word,
            correct=(w.status in ("correct", "mad_short")),
            expected=w.word,
            status=w.status,
        )
        for w in raw_word_results
    ]

    completeness = 100 if not any(w.status == "missing" for w in raw_word_results) else 70
    score = int(word_accuracy * 0.60 + tajweed_score * 0.25 + completeness * 0.15)

    feedback: list[str] = []
    wrong_count = sum(1 for w in raw_word_results if w.status == "wrong")
    if wrong_count > 0:
        feedback.append(f"Ada {wrong_count} kata yang perlu diperbaiki pengucapannya.")
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
