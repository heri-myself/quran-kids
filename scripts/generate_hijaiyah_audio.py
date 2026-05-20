#!/usr/bin/env python3
"""
Generate audio huruf hijaiyah lengkap menggunakan Edge TTS (Microsoft).
Gratis, tidak perlu API key.

Install: pip install edge-tts asyncio
Jalankan: python3 generate_hijaiyah_audio.py
"""

import asyncio
import os
import json

try:
    import edge_tts
except ImportError:
    print("❌ edge-tts belum terinstall.")
    print("   Jalankan: pip install edge-tts")
    exit(1)

# ─────────────────────────────────────────────────────────────
#  OUTPUT DIRECTORY
# ─────────────────────────────────────────────────────────────
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "../mobile/assets/audio/hijaiyah")

# Voice terbaik untuk Arabic anak-anak
# Options: ar-EG-ShakirNeural (male), ar-EG-SalmaNeural (female)
VOICE = "ar-EG-SalmaNeural"

# ─────────────────────────────────────────────────────────────
#  DATA HURUF HIJAIYAH
# ─────────────────────────────────────────────────────────────
HURUF = [
    # (id, nama_latin, karakter, dengan_fathah, dengan_kasrah, dengan_dhammah)
    ("alif",    "Alif",    "ا", "أَ", "أِ", "أُ"),
    ("ba",      "Ba",      "ب", "بَ", "بِ", "بُ"),
    ("ta",      "Ta",      "ت", "تَ", "تِ", "تُ"),
    ("tsa",     "Tsa",     "ث", "ثَ", "ثِ", "ثُ"),
    ("jim",     "Jim",     "ج", "جَ", "جِ", "جُ"),
    ("ha",      "Ha",      "ح", "حَ", "حِ", "حُ"),
    ("kha",     "Kha",     "خ", "خَ", "خِ", "خُ"),
    ("dal",     "Dal",     "د", "دَ", "دِ", "دُ"),
    ("dzal",    "Dzal",    "ذ", "ذَ", "ذِ", "ذُ"),
    ("ra",      "Ra",      "ر", "رَ", "رِ", "رُ"),
    ("zai",     "Zai",     "ز", "زَ", "زِ", "زُ"),
    ("sin",     "Sin",     "س", "سَ", "سِ", "سُ"),
    ("syin",    "Syin",    "ش", "شَ", "شِ", "شُ"),
    ("shad",    "Shad",    "ص", "صَ", "صِ", "صُ"),
    ("dhad",    "Dhad",    "ض", "ضَ", "ضِ", "ضُ"),
    ("tha",     "Tha",     "ط", "طَ", "طِ", "طُ"),
    ("zha",     "Zha",     "ظ", "ظَ", "ظِ", "ظُ"),
    ("ain",     "Ain",     "ع", "عَ", "عِ", "عُ"),
    ("ghain",   "Ghain",   "غ", "غَ", "غِ", "غُ"),
    ("fa",      "Fa",      "ف", "فَ", "فِ", "فُ"),
    ("qaf",     "Qaf",     "ق", "قَ", "قِ", "قُ"),
    ("kaf",     "Kaf",     "ك", "كَ", "كِ", "كُ"),
    ("lam",     "Lam",     "ل", "لَ", "لِ", "لُ"),
    ("mim",     "Mim",     "م", "مَ", "مِ", "مُ"),
    ("nun",     "Nun",     "ن", "نَ", "نِ", "نُ"),
    ("waw",     "Waw",     "و", "وَ", "وِ", "وُ"),
    ("ha2",     "Ha",      "ه", "هَ", "هِ", "هُ"),
    ("ya",      "Ya",      "ي", "يَ", "يِ", "يُ"),
    ("hamzah",  "Hamzah",  "ء", "أَ", "أِ", "أُ"),
    ("lam_alif","Lam Alif","لا", "لاَ", "لاِ", "لاُ"),
]

# Nama huruf dalam bahasa Arab (untuk audio nama)
NAMA_ARAB = {
    "alif":     "أَلِف",
    "ba":       "بَاء",
    "ta":       "تَاء",
    "tsa":      "ثَاء",
    "jim":      "جِيم",
    "ha":       "حَاء",
    "kha":      "خَاء",
    "dal":      "دَال",
    "dzal":     "ذَال",
    "ra":       "رَاء",
    "zai":      "زَاي",
    "sin":      "سِين",
    "syin":     "شِين",
    "shad":     "صَاد",
    "dhad":     "ضَاد",
    "tha":      "طَاء",
    "zha":      "ظَاء",
    "ain":      "عَيْن",
    "ghain":    "غَيْن",
    "fa":       "فَاء",
    "qaf":      "قَاف",
    "kaf":      "كَاف",
    "lam":      "لاَم",
    "mim":      "مِيم",
    "nun":      "نُون",
    "waw":      "وَاو",
    "ha2":      "هَاء",
    "ya":       "يَاء",
    "hamzah":   "هَمْزَة",
    "lam_alif": "لاَم أَلِف",
}

# Tanwin
TANWIN = [
    ("tanwin_fathah", "Tanwin Fathah", "ً",  "بً"),
    ("tanwin_kasrah", "Tanwin Kasrah", "ٍ",  "بٍ"),
    ("tanwin_dhammah","Tanwin Dhammah","ٌ",  "بٌ"),
]

# Tasydid contoh
TASYDID = [
    ("tasydid_ba",  "بَّ"),
    ("tasydid_mim", "مَّ"),
    ("tasydid_nun", "نَّ"),
]

# ─────────────────────────────────────────────────────────────
#  AUDIO GENERATION
# ─────────────────────────────────────────────────────────────
async def generate(text: str, path: str, rate: str = "-10%") -> bool:
    """Generate satu file audio."""
    if os.path.exists(path):
        print(f"  ⏭  Skip (sudah ada): {os.path.basename(path)}")
        return True
    try:
        communicate = edge_tts.Communicate(text, VOICE, rate=rate)
        await communicate.save(path)
        print(f"  ✅ {os.path.basename(path)}")
        return True
    except Exception as e:
        print(f"  ❌ {os.path.basename(path)}: {e}")
        return False


async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Subdirektori
    for subdir in ["nama", "fathah", "kasrah", "dhammah", "sukun", "tanwin", "tasydid"]:
        os.makedirs(os.path.join(OUTPUT_DIR, subdir), exist_ok=True)

    manifest = []
    total = 0
    success = 0

    # ── 1. Nama huruf ──────────────────────────────────────────
    print("\n📢 Nama huruf...")
    for (hid, nama_latin, karakter, *_) in HURUF:
        text = NAMA_ARAB.get(hid, karakter)
        path = os.path.join(OUTPUT_DIR, "nama", f"{hid}.mp3")
        ok = await generate(text, path, rate="-15%")
        total += 1; success += int(ok)
        manifest.append({
            "id": hid,
            "nama": nama_latin,
            "karakter": karakter,
            "kategori": "nama",
            "file": f"nama/{hid}.mp3",
        })

    # ── 2. Dengan fathah ───────────────────────────────────────
    print("\n📢 Dengan harakat fathah...")
    for (hid, nama_latin, karakter, fathah, *_) in HURUF:
        path = os.path.join(OUTPUT_DIR, "fathah", f"{hid}.mp3")
        ok = await generate(fathah, path)
        total += 1; success += int(ok)
        manifest.append({
            "id": f"{hid}_fathah",
            "nama": f"{nama_latin} fathah",
            "karakter": fathah,
            "kategori": "fathah",
            "file": f"fathah/{hid}.mp3",
        })

    # ── 3. Dengan kasrah ───────────────────────────────────────
    print("\n📢 Dengan harakat kasrah...")
    for (hid, nama_latin, karakter, _, kasrah, _2) in HURUF:
        path = os.path.join(OUTPUT_DIR, "kasrah", f"{hid}.mp3")
        ok = await generate(kasrah, path)
        total += 1; success += int(ok)
        manifest.append({
            "id": f"{hid}_kasrah",
            "nama": f"{nama_latin} kasrah",
            "karakter": kasrah,
            "kategori": "kasrah",
            "file": f"kasrah/{hid}.mp3",
        })

    # ── 4. Dengan dhammah ──────────────────────────────────────
    print("\n📢 Dengan harakat dhammah...")
    for (hid, nama_latin, karakter, _, _2, dhammah) in HURUF:
        path = os.path.join(OUTPUT_DIR, "dhammah", f"{hid}.mp3")
        ok = await generate(dhammah, path)
        total += 1; success += int(ok)
        manifest.append({
            "id": f"{hid}_dhammah",
            "nama": f"{nama_latin} dhammah",
            "karakter": dhammah,
            "kategori": "dhammah",
            "file": f"dhammah/{hid}.mp3",
        })

    # ── 5. Sukun (tanpa harakat) ───────────────────────────────
    print("\n📢 Dengan sukun...")
    for (hid, nama_latin, karakter, *_) in HURUF:
        sukun_text = karakter + "ْ"
        path = os.path.join(OUTPUT_DIR, "sukun", f"{hid}.mp3")
        ok = await generate(sukun_text, path)
        total += 1; success += int(ok)
        manifest.append({
            "id": f"{hid}_sukun",
            "nama": f"{nama_latin} sukun",
            "karakter": sukun_text,
            "kategori": "sukun",
            "file": f"sukun/{hid}.mp3",
        })

    # ── 6. Tanwin ──────────────────────────────────────────────
    print("\n📢 Tanwin...")
    for (tid, nama, karakter, contoh) in TANWIN:
        path = os.path.join(OUTPUT_DIR, "tanwin", f"{tid}.mp3")
        ok = await generate(contoh, path)
        total += 1; success += int(ok)
        manifest.append({
            "id": tid,
            "nama": nama,
            "karakter": karakter,
            "kategori": "tanwin",
            "file": f"tanwin/{tid}.mp3",
        })

    # ── 7. Tasydid contoh ──────────────────────────────────────
    print("\n📢 Tasydid...")
    for (tid, contoh) in TASYDID:
        path = os.path.join(OUTPUT_DIR, "tasydid", f"{tid}.mp3")
        ok = await generate(contoh, path)
        total += 1; success += int(ok)
        manifest.append({
            "id": tid,
            "nama": f"Tasydid {tid.split('_')[1].capitalize()}",
            "karakter": contoh,
            "kategori": "tasydid",
            "file": f"tasydid/{tid}.mp3",
        })

    # ── Simpan manifest JSON ───────────────────────────────────
    manifest_path = os.path.join(OUTPUT_DIR, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\n{'─'*50}")
    print(f"✅ Selesai: {success}/{total} file berhasil dibuat")
    print(f"📁 Output : {OUTPUT_DIR}")
    print(f"📋 Manifest: {manifest_path}")
    print(f"🎙  Voice   : {VOICE}")
    print(f"{'─'*50}")
    print("\nStruktur folder:")
    print("  hijaiyah/")
    print("  ├── nama/        ← nama huruf (alif, ba, ta...)")
    print("  ├── fathah/      ← huruf + fathah (بَ)")
    print("  ├── kasrah/      ← huruf + kasrah (بِ)")
    print("  ├── dhammah/     ← huruf + dhammah (بُ)")
    print("  ├── sukun/       ← huruf + sukun (بْ)")
    print("  ├── tanwin/      ← tanwin fathah/kasrah/dhammah")
    print("  ├── tasydid/     ← contoh tasydid")
    print("  └── manifest.json")


if __name__ == "__main__":
    asyncio.run(main())
