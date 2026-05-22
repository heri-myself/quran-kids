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

SUKUN           = 'ْ'
TANWIN          = 'ًٌٍ'

IKHFA_LETTERS       = set('تثجدذزسشصضطظفقك')
IDGHAM_GHUNNAH      = set('ينمو')
IDGHAM_BILA_GHUNNAH = set('لر')
IQLAB_LETTERS       = set('ب')
IZHHAR_LETTERS      = set('أهعغحخء')
QALQALAH_LETTERS    = set('قطبجد')
MIM_IKHFA_LETTERS   = set('ب')    # ikhfa syafawi
MIM_IDGHAM_LETTERS  = set('م')    # idgham mitslain


_HARAKAT = set('ًٌٍَُِّْٕٓٔـٰ')
_ARABIC_LETTERS = set('ابتثجحخدذرزسشصضطظعغفقكلمنهويءىآأإٱ')


def _first_consonant(word: str) -> str:
    """Return first Arabic consonant letter of word, skipping harakat/diacritics."""
    for c in word:
        if c in _ARABIC_LETTERS:
            return c
    return ''


def _nun_rule(rules: list, after: str) -> None:
    if after in IKHFA_LETTERS:
        rules.append(('Ikhfa', f'Nun sukun + {after} → Ikhfa, bacaan didengungkan samar (antara jelas dan masuk)'))
    elif after in IDGHAM_GHUNNAH:
        rules.append(('Idgham Bighunnah', f'Nun sukun + {after} → Idgham Bighunnah, masukkan ke huruf berikutnya dengan dengung'))
    elif after in IDGHAM_BILA_GHUNNAH:
        rules.append(('Idgham Bilaghunnah', f'Nun sukun + {after} → Idgham Bilaghunnah, masukkan tanpa dengung'))
    elif after in IQLAB_LETTERS:
        rules.append(('Iqlab', 'Nun sukun + ب → Iqlab, ubah menjadi mim dan dengungkan'))
    elif after in IZHHAR_LETTERS:
        rules.append(('Izhhar Halqi', f'Nun sukun + huruf halq ({after}) → Izhhar, ucapkan nun dengan jelas'))


def _mim_rule(rules: list, after: str) -> None:
    if after in MIM_IKHFA_LETTERS:
        rules.append(('Ikhfa Syafawi', 'Mim sukun + ب → Ikhfa Syafawi, dengungkan samar'))
    elif after in MIM_IDGHAM_LETTERS:
        rules.append(('Idgham Mitslain', 'Mim sukun + م → Idgham Mitslain dengan ghunnah'))
    elif after:
        rules.append(('Izhhar Syafawi', f'Mim sukun + {after} → Izhhar Syafawi, ucapkan mim dengan jelas'))


def detect_tajweed_rules(word: str, next_word: str = '') -> list[tuple[str, str]]:
    """Deteksi hukum tajweed pada sebuah kata (dengan harakat).
    Handles both explicit sukun and implicit sukun on word-final NUN/MIM.
    Returns list of (nama_hukum, penjelasan).
    """
    rules: list[tuple[str, str]] = []
    chars = list(word)
    n = len(chars)
    first_next = _first_consonant(next_word)

    for i, c in enumerate(chars):
        nxt = chars[i + 1] if i + 1 < n else ''

        # Ghunnah: nun atau mim + tasydid
        if c in (NUN, MIM) and nxt == SHADDA:
            huruf = 'Nun' if c == NUN else 'Mim'
            rules.append(('Ghunnah', f'{huruf} tasydid → Ghunnah, harus didengungkan 2 harakat'))

        # Qalqalah: huruf qalqalah + sukun eksplisit atau akhir kata
        if c in QALQALAH_LETTERS and (nxt == SUKUN or (i == n - 1 and nxt == '')):
            rules.append(('Qalqalah', f'Huruf {c} sukun → Qalqalah, suara dipantulkan'))

        # Nun sukun eksplisit (dalam kata)
        if c == NUN and nxt == SUKUN:
            after_idx = i + 2
            after = chars[after_idx] if after_idx < n else first_next
            # skip harakat to get the actual next consonant
            while after in _HARAKAT and after_idx + 1 < n:
                after_idx += 1
                after = chars[after_idx]
            _nun_rule(rules, after)

        # Nun di akhir kata → sukun implisit, cek kata berikutnya
        if c == NUN and i == n - 1 and first_next:
            _nun_rule(rules, first_next)

        # Tanwin di akhir kata → cek huruf pertama kata berikutnya
        if c in TANWIN and (i == n - 1 or nxt not in TANWIN):
            if first_next in IKHFA_LETTERS:
                rules.append(('Ikhfa', f'Tanwin + {first_next} → Ikhfa, dengungkan samar'))
            elif first_next in IDGHAM_GHUNNAH:
                rules.append(('Idgham Bighunnah', f'Tanwin + {first_next} → Idgham Bighunnah'))
            elif first_next in IDGHAM_BILA_GHUNNAH:
                rules.append(('Idgham Bilaghunnah', f'Tanwin + {first_next} → Idgham Bilaghunnah'))
            elif first_next in IQLAB_LETTERS:
                rules.append(('Iqlab', 'Tanwin + ب → Iqlab, ubah menjadi mim'))

        # Mim sukun eksplisit (dalam kata)
        if c == MIM and nxt == SUKUN:
            after_idx = i + 2
            after = chars[after_idx] if after_idx < n else first_next
            while after in _HARAKAT and after_idx + 1 < n:
                after_idx += 1
                after = chars[after_idx]
            _mim_rule(rules, after)

        # Mim di akhir kata → sukun implisit, cek kata berikutnya
        if c == MIM and i == n - 1 and first_next:
            _mim_rule(rules, first_next)

    return rules


# Threshold durasi minimum untuk mad tabi'i (2 harakat) berdasarkan Whisper word timestamps.
# Whisper mengukur durasi seluruh kata (konsonan + vokal), bukan hanya vokal mad.
# Dikalibrasi berdasarkan kata-kata Al-Fatihah: threshold konservatif 0.30s
# agar tidak terlalu banyak false positive pada bacaan anak yang lebih lambat.
MAD_MIN_DURATION = 0.30


@dataclass
class WordResult:
    word: str
    status: str             # "correct" | "wrong" | "missing" | "mad_short"
    position: int
    transcription_index: int = -1  # index into word_timestamps; -1 if not from ASR equal match

    def dict(self):
        return {"word": self.word, "status": self.status, "position": self.position}


def normalize_arabic(text: str) -> str:
    # Normalize alef variants to plain alef (Whisper always outputs plain ا)
    text = text.replace('ٱ', 'ا').replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا')
    # Normalize alef maqsura ى (U+0649) → yeh ي (U+064A): visually identical but different codepoints
    text = text.replace('ى', 'ي')
    # Strip harakat, tatweel, and superscript alef ٰ (U+0670) — all absent from Whisper output
    harakat = 'ًٌٍَُِّْٕٓٔـٰ'
    text = ''.join(c for c in text if c not in harakat)
    # Collapse consecutive duplicate Arabic letters:
    # Whisper sometimes writes shadda as doubled letter (e.g. اللذي for الَّذِي)
    text = re.sub(r'([؀-ۿ])\1+', r'\1', text)
    return text

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
