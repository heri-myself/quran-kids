"""
Tajweed Rules Engine — versi 2
- compare_texts: difflib SequenceMatcher (alignment-aware)
- detect_mad_errors: timestamp-based mad duration check
- analyze_tajweed: score from actual mad_short count
"""
import re
from dataclasses import dataclass
from difflib import SequenceMatcher

ALEF            = 'ا'
WAW             = 'و'
YA              = 'ي'
FATHA           = 'َ'
KASRA           = 'ِ'
DAMMA           = 'ُ'
SHADDA          = 'ّ'
NUN             = 'ن'
MIM             = 'م'
ALEF_MAQSURA    = 'ى'

ALEF_SUPERSCRIPT = 'ٰ'   # ARABIC LETTER SUPERSCRIPT ALEF (mad lazim)

MAD_PATTERNS = [
    FATHA + ALEF,
    FATHA + ALEF_MAQSURA,
    FATHA + ALEF_SUPERSCRIPT,
    KASRA + YA,
    DAMMA + WAW,
]

GHUNNAH_PATTERN = re.compile(f'[{NUN}{MIM}]{SHADDA}')

# Empirically calibrated: full-word duration threshold for mad 2-harakat.
# stable-whisper word timestamps cover the entire word, not just the vowel,
# so the threshold must account for consonants. Adjust based on real data.
MAD_MIN_DURATION = 0.35


@dataclass
class WordResult:
    word: str
    status: str             # "correct" | "wrong" | "missing" | "mad_short"
    position: int
    transcription_index: int = -1  # index into word_timestamps; -1 if not from ASR equal match

    def dict(self):
        return {"word": self.word, "status": self.status, "position": self.position}


def normalize_arabic(text: str) -> str:
    harakat = 'ًٌٍَُِّْٕٓٔ'
    return ''.join(c for c in text if c not in harakat)


def has_mad_pattern(word: str) -> bool:
    return any(pattern in word for pattern in MAD_PATTERNS)


def compare_texts(expected: str, transcribed: str) -> tuple[list[WordResult], int]:
    expected_words = expected.strip().split()
    transcribed_words = transcribed.strip().split()

    if not expected_words:
        return [], 0

    expected_norm = [normalize_arabic(w) for w in expected_words]
    transcribed_norm = [normalize_arabic(w) for w in transcribed_words]

    results: list[WordResult | None] = [None] * len(expected_words)
    matcher = SequenceMatcher(None, expected_norm, transcribed_norm, autojunk=False)

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            for k in range(i2 - i1):
                exp_idx = i1 + k
                trans_idx = j1 + k  # corresponding transcription index for timestamp lookup
                results[exp_idx] = WordResult(
                    word=expected_words[exp_idx],
                    status="correct",
                    position=exp_idx,
                    transcription_index=trans_idx,
                )
        elif tag == 'replace':
            spoken_count = j2 - j1
            for k in range(i2 - i1):
                idx = i1 + k
                status = "wrong" if k < spoken_count else "missing"
                results[idx] = WordResult(word=expected_words[idx], status=status, position=idx)
        elif tag == 'delete':
            for k in range(i2 - i1):
                idx = i1 + k
                results[idx] = WordResult(word=expected_words[idx], status="missing", position=idx)
        # 'insert': extra words from transcription — ignore

    final_results = [
        r if r is not None else WordResult(word=expected_words[i], status="missing", position=i)
        for i, r in enumerate(results)
    ]

    correct = sum(1 for r in final_results if r.status == "correct")
    accuracy = int((correct / len(expected_words)) * 100)

    return final_results, accuracy


def detect_mad_errors(
    word_results: list[WordResult],
    word_timestamps: list[dict],
) -> None:
    """Mutates word_results in-place: sets status to 'mad_short' for correct words with too-short mad duration.

    Uses transcription_index (set by compare_texts for 'equal' words) to correctly correlate
    each expected word with its ASR timestamp — avoids index drift from insertions/deletions.
    """
    for wr in word_results:
        if wr.status != "correct":
            continue
        if not has_mad_pattern(wr.word):
            continue
        trans_idx = wr.transcription_index
        if trans_idx < 0 or trans_idx >= len(word_timestamps):
            continue
        ts = word_timestamps[trans_idx]
        duration = ts["end"] - ts["start"]
        if duration < MAD_MIN_DURATION:
            wr.status = "mad_short"


def analyze_tajweed(word_results: list[WordResult]) -> tuple[int, list[str]]:
    mad_short_count = sum(1 for w in word_results if w.status == "mad_short")
    score = max(50, 100 - mad_short_count * 10)

    feedback = []
    if mad_short_count > 0:
        feedback.append(
            f"Ada {mad_short_count} kata dengan mad (huruf panjang) yang terlalu pendek. "
            "Perhatikan kata yang ditandai kuning."
        )

    return score, feedback
