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
        MODEL_ID = "naazimsnh02/whisper-large-v3-turbo-ar-quran"
        print(f"Loading {MODEL_ID} ...")
        device = "mps" if torch.backends.mps.is_available() else "cpu"
        dtype = torch.float32  # float16 on MPS produces garbage output
        model = AutoModelForSpeechSeq2Seq.from_pretrained(
            MODEL_ID,
            torch_dtype=dtype,
            low_cpu_mem_usage=True,
            use_safetensors=True,
        ).to(device)
        _processor = AutoProcessor.from_pretrained(MODEL_ID)
        # Force Arabic: prefix_tokens = [startoftranscript, ar, transcribe, notimestamps]
        # decoder_start_token_id already adds startoftranscript, so skip it (index 1 onwards)
        _processor.tokenizer.set_prefix_tokens(language="arabic", task="transcribe")
        prefix = _processor.tokenizer.prefix_tokens[1:]  # skip <|startoftranscript|>
        model.generation_config.forced_decoder_ids = [(i + 1, tok) for i, tok in enumerate(prefix)]
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


def transcribe_audio(audio_bytes: bytes) -> str:
    pipe = get_pipe()
    audio_array = audio_bytes_to_array(audio_bytes)
    duration = len(audio_array) / 16000
    print(f"[AUDIO] size={len(audio_bytes)}B  duration={duration:.2f}s  samples={len(audio_array)}")
    inputs = {"raw": audio_array, "sampling_rate": 16000}
    result = pipe(inputs, generate_kwargs={"num_beams": 1, "max_new_tokens": 128})
    return result["text"].strip()


def load_audio_to_tempfile(audio_bytes: bytes) -> str:
    """Write audio bytes to a temp file, return path. Caller must delete."""
    with tempfile.NamedTemporaryFile(suffix='.m4a', delete=False) as f:
        f.write(audio_bytes)
        return f.name


def audio_bytes_to_array(audio_bytes: bytes) -> "np.ndarray":
    """Convert raw audio bytes (any format) to float32 numpy array at 16kHz mono."""
    import subprocess
    import numpy as np
    # Use temp file because M4A/AAC containers require seeking — cannot pipe from stdin
    tmp_path = load_audio_to_tempfile(audio_bytes)
    try:
        cmd = [
            'ffmpeg', '-hide_banner', '-loglevel', 'error',
            '-i', tmp_path,
            '-ar', '16000', '-ac', '1', '-f', 'f32le', 'pipe:1',
        ]
        proc = subprocess.run(cmd, capture_output=True)
        if proc.returncode != 0:
            raise ValueError(f"ffmpeg error: {proc.stderr.decode()}")
        return np.frombuffer(proc.stdout, dtype=np.float32)
    finally:
        os.unlink(tmp_path)


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

    try:
        transcription = transcribe_audio(audio_bytes)
        word_timestamps = []
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Cannot process audio: {e}")

    from tajweed_engine import compare_texts, detect_mad_errors, analyze_tajweed, detect_tajweed_rules

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
    expected_words = req.expected_text.strip().split()

    wrong_words = [w for w in raw_word_results if w.status == "wrong"]
    missing_words = [w.word for w in raw_word_results if w.status == "missing"]

    if wrong_words:
        feedback.append(f"Kata yang perlu diperbaiki: {', '.join(w.word for w in wrong_words)}")
        for w in wrong_words:
            next_word = expected_words[w.position + 1] if w.position + 1 < len(expected_words) else ''
            rules = detect_tajweed_rules(w.word, next_word)
            seen = set()
            for rule_name, explanation in rules:
                if rule_name not in seen:
                    seen.add(rule_name)
                    feedback.append(f"• {explanation}")

    if missing_words:
        feedback.append(f"Kata yang tidak terdengar: {', '.join(missing_words)} — coba ucapkan lebih jelas.")
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

    try:
        transcription = transcribe_audio(audio_bytes)
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Cannot process audio: {e}")

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


class WordTimestamp(BaseModel):
    word: str
    start: float
    end: float


class AnalyzeRequest(BaseModel):
    transcription: str
    expected_text: str
    verse_number: int
    chapter_id: int
    word_timestamps: list[WordTimestamp] = []


@app.post("/analyze", response_model=EvaluateResponse)
def analyze(req: AnalyzeRequest):
    """Terima transcription teks langsung, lakukan analisis tajweed saja."""
    from tajweed_engine import compare_texts, detect_mad_errors, analyze_tajweed, detect_tajweed_rules

    print(f"[ANALYZE][EXPECTED]     {req.expected_text}")
    print(f"[ANALYZE][TRANSCRIBED]  {req.transcription}")

    raw_word_results, word_accuracy = compare_texts(req.expected_text, req.transcription)
    ts_dicts = [{"word": t.word, "start": t.start, "end": t.end} for t in req.word_timestamps]
    detect_mad_errors(raw_word_results, ts_dicts)
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
    expected_words = req.expected_text.strip().split()
    wrong_words = [w for w in raw_word_results if w.status == "wrong"]
    missing_words = [w.word for w in raw_word_results if w.status == "missing"]

    if wrong_words:
        feedback.append(f"Kata yang perlu diperbaiki: {', '.join(w.word for w in wrong_words)}")
        for w in wrong_words:
            next_word = expected_words[w.position + 1] if w.position + 1 < len(expected_words) else ''
            rules = detect_tajweed_rules(w.word, next_word)
            seen = set()
            for rule_name, explanation in rules:
                if rule_name not in seen:
                    seen.add(rule_name)
                    feedback.append(f"• {explanation}")

    if missing_words:
        feedback.append(f"Kata yang tidak terdengar: {', '.join(missing_words)} — coba ucapkan lebih jelas.")
    feedback.extend(tajweed_feedback)

    if score >= 85:
        feedback.insert(0, "MasyaAllah! Bacaan sangat bagus! 🌟")
    elif score >= 65:
        feedback.insert(0, "Bagus! Terus berlatih untuk hasil lebih baik.")
    else:
        feedback.insert(0, "Jangan menyerah! Ulangi dan perhatikan kata yang disorot merah.")

    return EvaluateResponse(
        transcription=req.transcription,
        word_results=word_results,
        word_accuracy=word_accuracy,
        tajweed_score=tajweed_score,
        score=score,
        feedback=feedback,
    )


@app.post("/analyze-simple", response_model=EvaluateResponse)
def analyze_simple(req: AnalyzeRequest):
    """Versi simple — hanya word accuracy, tanpa tajweed detail."""
    from tajweed_engine import compare_texts

    raw_word_results, word_accuracy = compare_texts(req.expected_text, req.transcription)

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
        transcription=req.transcription,
        word_results=word_results,
        word_accuracy=word_accuracy,
        tajweed_score=0,
        score=score,
        feedback=[feedback_msg],
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
