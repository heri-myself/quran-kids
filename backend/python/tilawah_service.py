import base64
import tempfile
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

_pipe = None
_processor = None


def get_pipe():
    global _pipe, _processor
    if _pipe is None:
        import torch
        from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline as hf_pipeline
        print("Loading naazimsnh02/whisper-large-v3-turbo-ar-quran ...")
        device = "mps" if torch.backends.mps.is_available() else "cpu"
        dtype = torch.float32  # float16 on MPS produces garbage output
        model = AutoModelForSpeechSeq2Seq.from_pretrained(
            "naazimsnh02/whisper-large-v3-turbo-ar-quran",
            torch_dtype=dtype,
            low_cpu_mem_usage=True,
            use_safetensors=True,
        ).to(device)
        _processor = AutoProcessor.from_pretrained("naazimsnh02/whisper-large-v3-turbo-ar-quran")
        # Force Arabic transcription
        _processor.tokenizer.set_prefix_tokens(language="arabic", task="transcribe")
        _pipe = hf_pipeline(
            "automatic-speech-recognition",
            model=model,
            tokenizer=_processor.tokenizer,
            feature_extractor=_processor.feature_extractor,
            torch_dtype=dtype,
            device=device,
        )
        print("Model loaded.")
    return _pipe


def transcribe_audio(temp_path: str, expected_text: str = "") -> str:
    pipe = get_pipe()

    generate_kwargs: dict = {
        "num_beams": 1,
        "temperature": 0.0,
        "condition_on_prev_tokens": False,
    }

    # Prefix forced decoding — anchor Whisper ke ayat yang diharapkan
    if expected_text and _processor is not None:
        words = expected_text.strip().split()
        # Ambil 4 kata pertama sebagai prompt; kurangi jika ayat pendek (≤4 kata)
        prefix_words = words[:min(4, max(1, len(words) - 1))]
        prefix = " ".join(prefix_words)
        try:
            prompt_ids = _processor.get_prompt_ids(prefix, return_tensors="pt")
            import torch
            device = next(pipe.model.parameters()).device
            generate_kwargs["prompt_ids"] = prompt_ids.to(device)
            print(f"[PREFIX] {prefix}")
        except Exception as e:
            print(f"[PREFIX] gagal generate prompt_ids: {e}")

    result = pipe(temp_path, generate_kwargs=generate_kwargs)
    return result["text"].strip()


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
        transcription = transcribe_audio(temp_path, req.expected_text)
        word_timestamps = []  # HF pipeline doesn't provide word timestamps

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

    print(f"[EXPECTED]     {req.expected_text}")
    print(f"[TRANSCRIBED]  {transcription}")

    raw_word_results, word_accuracy = compare_texts(req.expected_text, transcription)
    detect_mad_errors(raw_word_results, word_timestamps)
    tajweed_score, tajweed_feedback = analyze_tajweed(raw_word_results)

    for w in raw_word_results:
        print(f"  [{w.status.upper():10}] {w.word}")

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


@app.post("/evaluate-simple", response_model=EvaluateResponse)
def evaluate_simple(req: EvaluateRequest):
    try:
        audio_bytes = base64.b64decode(req.audio_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 audio")

    temp_path = None
    try:
        temp_path = load_audio_to_tempfile(audio_bytes)
        transcription = transcribe_audio(temp_path, req.expected_text)

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

    from tajweed_engine import compare_texts

    print(f"[SIMPLE][EXPECTED]    {req.expected_text}")
    print(f"[SIMPLE][TRANSCRIBED] {transcription}")

    raw_word_results, word_accuracy = compare_texts(req.expected_text, transcription)

    for w in raw_word_results:
        print(f"  [{w.status.upper():10}] {w.word}")

    word_results = [
        WordResult(
            word=w.word,
            correct=(w.status in ("correct", "mad_short")),
            expected=w.word,
            status=w.status,
        )
        for w in raw_word_results
    ]

    score = word_accuracy

    if score >= 80:
        feedback_msg = "MasyaAllah! Bacaan sangat bagus! 🌟"
    elif score >= 50:
        feedback_msg = "Bagus! Terus berlatih."
    else:
        feedback_msg = "Ulangi dan perhatikan kata yang disorot merah."

    return EvaluateResponse(
        transcription=transcription,
        word_results=word_results,
        word_accuracy=word_accuracy,
        tajweed_score=0,
        score=score,
        feedback=[feedback_msg],
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
