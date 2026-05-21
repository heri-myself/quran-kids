# backend/python/runpod_handler.py
import runpod
import base64
import os
import subprocess
import tempfile

import traceback

import torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline as hf_pipeline
import numpy as np

MODEL_ID = os.environ.get("MODEL_ID", "naazimsnh02/whisper-large-v3-turbo-ar-quran")

_pipe = None


def get_pipe():
    global _pipe
    if _pipe is None:
        print(f"[WORKER] Loading model {MODEL_ID} ...")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if device == "cuda" else torch.float32
        try:
            model = AutoModelForSpeechSeq2Seq.from_pretrained(
                MODEL_ID,
                torch_dtype=dtype,
                low_cpu_mem_usage=True,
                use_safetensors=True,
            ).to(device)
            processor = AutoProcessor.from_pretrained(MODEL_ID)
            processor.tokenizer.set_prefix_tokens(language="arabic", task="transcribe")
            prefix = processor.tokenizer.prefix_tokens[1:]
            model.generation_config.forced_decoder_ids = [(i + 1, tok) for i, tok in enumerate(prefix)]
            _pipe = hf_pipeline(
                "automatic-speech-recognition",
                model=model,
                tokenizer=processor.tokenizer,
                feature_extractor=processor.feature_extractor,
                torch_dtype=dtype,
                device=device,
            )
            print(f"[WORKER] Model loaded on {device}.")
        except Exception as e:
            _pipe = None
            raise RuntimeError(f"[WORKER] Model load failed: {e}") from e
    return _pipe


def audio_bytes_to_array(audio_bytes: bytes) -> np.ndarray:
    with tempfile.NamedTemporaryFile(suffix=".m4a", delete=False) as f:
        f.write(audio_bytes)
        tmp_path = f.name
    try:
        cmd = [
            "ffmpeg", "-hide_banner", "-loglevel", "error",
            "-i", tmp_path,
            "-ar", "16000", "-ac", "1", "-f", "f32le", "pipe:1",
        ]
        proc = subprocess.run(cmd, capture_output=True)
        if proc.returncode != 0:
            raise ValueError(f"ffmpeg error: {proc.stderr.decode()}")
        audio_array = np.frombuffer(proc.stdout, dtype=np.float32)
        if audio_array.size == 0:
            raise ValueError("ffmpeg produced no audio output — file may be corrupt or silent")
        return audio_array
    finally:
        os.unlink(tmp_path)


def handler(job):
    """RunPod job handler — dipanggil untuk setiap request."""
    job_input = job.get("input", {})
    audio_b64 = job_input.get("audio_base64")

    if not audio_b64:
        return {"error": "audio_base64 is required"}

    try:
        audio_bytes = base64.b64decode(audio_b64)
    except Exception as e:
        return {"error": f"Invalid base64: {e}"}

    try:
        audio_array = audio_bytes_to_array(audio_bytes)
        pipe = get_pipe()
        result = pipe(
            {"raw": audio_array, "sampling_rate": 16000},
            generate_kwargs={"num_beams": 1, "max_new_tokens": 128},
        )
        transcription = result["text"].strip()
        print(f"[WORKER] Transcribed: {transcription}")
        return {"transcription": transcription}
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}


if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})
