"""
Tajweed Rules Engine — versi 1
Deteksi: Mad Thabi'i (2 harakat) dan Ghunnah (nun/mim bertasydid)
"""
import re
from dataclasses import dataclass

# Karakter Arab Unicode
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

# Harakat panjang (tanda mad thabi'i)
MAD_PATTERNS = [
    FATHA + ALEF,         # fathah + alef
    FATHA + ALEF_MAQSURA, # fathah + alef maqsura
    KASRA + YA,            # kasrah + ya
    DAMMA + WAW,           # dhammah + waw
]

# Huruf ghunnah: nun/mim bertasydid
GHUNNAH_PATTERN = re.compile(f'[{NUN}{MIM}]{SHADDA}')


@dataclass
class WordResult:
    word: str
    status: str   # "correct" | "wrong" | "missing"
    position: int

    def dict(self):
        return {"word": self.word, "status": self.status, "position": self.position}


def normalize_arabic(text: str) -> str:
    """Hapus harakat untuk perbandingan kata."""
    harakat = 'ًٌٍَُِّْٕٓٔ'
    return ''.join(c for c in text if c not in harakat)


def count_mad_positions(text: str) -> int:
    """Hitung jumlah posisi mad thabi'i dalam teks."""
    count = 0
    for pattern in MAD_PATTERNS:
        count += text.count(pattern)
    return count


def count_ghunnah(text: str) -> int:
    """Hitung jumlah ghunnah (nun/mim tasydid)."""
    return len(GHUNNAH_PATTERN.findall(text))


def compare_texts(expected: str, transcribed: str) -> tuple[list[WordResult], int]:
    """
    Bandingkan teks yang diharapkan vs hasil transkripsi.
    Return: (word_results, word_accuracy_0_to_100)
    """
    expected_words = expected.strip().split()
    transcribed_words = transcribed.strip().split()

    # Normalisasi untuk perbandingan
    expected_norm = [normalize_arabic(w) for w in expected_words]
    transcribed_norm = [normalize_arabic(w) for w in transcribed_words]

    results = []
    correct = 0

    for i, (exp_word, exp_norm) in enumerate(zip(expected_words, expected_norm)):
        if i < len(transcribed_norm):
            if exp_norm == transcribed_norm[i]:
                results.append(WordResult(word=exp_word, status="correct", position=i))
                correct += 1
            else:
                results.append(WordResult(word=exp_word, status="wrong", position=i))
        else:
            results.append(WordResult(word=exp_word, status="missing", position=i))

    total = len(expected_words)
    accuracy = int((correct / total) * 100) if total > 0 else 0

    return results, accuracy


def analyze_tajweed(expected_text: str, audio_duration_seconds: float) -> tuple[int, list[str]]:
    """
    Analisis tajweed berdasarkan teks dan durasi audio.
    Return: (tajweed_score_0_to_100, feedback_list)
    """
    feedback = []
    score = 100

    # Hitung mad thabi'i dalam teks
    mad_count = count_mad_positions(expected_text)
    ghunnah_count = count_ghunnah(expected_text)

    # Estimasi durasi ideal:
    # Tiap kata normal ~0.4 detik, tiap mad +0.3 detik, tiap ghunnah +0.2 detik
    word_count = len(expected_text.strip().split())
    ideal_duration = (word_count * 0.4) + (mad_count * 0.3) + (ghunnah_count * 0.2)

    # Toleransi: ±40% dari durasi ideal
    min_duration = ideal_duration * 0.6
    max_duration = ideal_duration * 1.8

    if audio_duration_seconds < min_duration and mad_count > 0:
        score -= 30
        feedback.append(f"Bacaan terlalu cepat. Ada {mad_count} mad (huruf panjang) yang perlu diperpanjang.")
    elif audio_duration_seconds > max_duration:
        score -= 10
        feedback.append("Bacaan terlalu lambat. Coba baca dengan tempo yang lebih natural.")

    if ghunnah_count > 0:
        # Tidak bisa deteksi ghunnah dari durasi saja, berikan hint saja
        feedback.append(f"Perhatikan {ghunnah_count} ghunnah (dengung) pada nun/mim bertasydid.")
        # Kurangi skor sedikit karena tidak bisa verifikasi
        score -= 10

    return max(0, score), feedback
