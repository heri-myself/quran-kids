import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from tajweed_engine import compare_texts, detect_mad_errors, analyze_tajweed, WordResult


def test_compare_identical_returns_all_correct():
    results, acc = compare_texts("قُلْ هُوَ اللَّهُ أَحَدٌ", "قُلْ هُوَ اللَّهُ أَحَدٌ")
    assert all(r.status == "correct" for r in results)
    assert acc == 100

def test_compare_empty_transcription_returns_all_missing():
    results, acc = compare_texts("قُلْ هُوَ", "")
    assert all(r.status == "missing" for r in results)
    assert acc == 0

def test_compare_one_wrong_word_does_not_cascade():
    results, acc = compare_texts("قُلْ هُوَ اللَّهُ", "قُلْ كلمة اللَّهُ")
    assert results[0].status == "correct"
    assert results[1].status == "wrong"
    assert results[2].status == "correct"

def test_compare_missing_last_word():
    results, acc = compare_texts("قُلْ هُوَ اللَّهُ", "قُلْ هُوَ")
    assert results[0].status == "correct"
    assert results[1].status == "correct"
    assert results[2].status == "missing"

def test_compare_accuracy_two_of_four_correct():
    results, acc = compare_texts("قُلْ هُوَ اللَّهُ أَحَدٌ", "قُلْ خطأ اللَّهُ خطأ")
    correct_count = sum(1 for r in results if r.status == "correct")
    assert correct_count == 2
    assert acc == 50

def test_detect_mad_short_flags_mad_short():
    word_results = [WordResult(word="الرَّحْمَٰنِ", status="correct", position=0)]
    timestamps = [{"word": "الرَّحْمَٰنِ", "start": 0.0, "end": 0.10}]
    detect_mad_errors(word_results, timestamps)
    assert word_results[0].status == "mad_short"

def test_detect_mad_sufficient_stays_correct():
    word_results = [WordResult(word="الرَّحْمَٰنِ", status="correct", position=0)]
    timestamps = [{"word": "الرَّحْمَٰنِ", "start": 0.0, "end": 0.40}]
    detect_mad_errors(word_results, timestamps)
    assert word_results[0].status == "correct"

def test_detect_mad_skips_wrong_words():
    word_results = [WordResult(word="الرَّحْمَٰنِ", status="wrong", position=0)]
    timestamps = [{"word": "الرَّحْمَٰنِ", "start": 0.0, "end": 0.05}]
    detect_mad_errors(word_results, timestamps)
    assert word_results[0].status == "wrong"

def test_detect_mad_skips_words_without_mad():
    word_results = [WordResult(word="قُلْ", status="correct", position=0)]
    timestamps = [{"word": "قُلْ", "start": 0.0, "end": 0.05}]
    detect_mad_errors(word_results, timestamps)
    assert word_results[0].status == "correct"

def test_analyze_tajweed_no_mad_short_returns_100():
    word_results = [
        WordResult(word="قُلْ", status="correct", position=0),
        WordResult(word="هُوَ", status="correct", position=1),
    ]
    score, feedback = analyze_tajweed(word_results)
    assert score == 100
    assert feedback == []

def test_analyze_tajweed_one_mad_short_reduces_score():
    word_results = [WordResult(word="الرَّحْمَٰنِ", status="mad_short", position=0)]
    score, feedback = analyze_tajweed(word_results)
    assert score == 90
    assert len(feedback) == 1

def test_analyze_tajweed_max_penalty_is_50():
    word_results = [WordResult(word=f"word{i}", status="mad_short", position=i) for i in range(10)]
    score, feedback = analyze_tajweed(word_results)
    assert score == 50
