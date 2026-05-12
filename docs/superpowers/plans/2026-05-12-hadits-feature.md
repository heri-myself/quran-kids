# Hadits Feature — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah fitur Hadits ke app Quran Kids — daftar ~300 hadits bundle lokal (offline) dengan search, filter kategori, dan halaman detail (Arab + terjemahan + pelajaran anak).

**Architecture:** Data hadits disimpan sebagai static JSON di `mobile/assets/hadits/hadits.json`. Hook `use-hadits.ts` membaca JSON dan menyediakan filter/search di memory (tidak perlu async). Dua screen baru di `app/(child)/hadits/` mengikuti pola Al-Quran. Diakses dari home feature menu, bukan bottom tab.

**Tech Stack:** Expo Router, React Native (StyleSheet), static JSON bundle, `useMemo` untuk filter.

---

## File Map

| File | Status | Tanggung Jawab |
|------|--------|----------------|
| `mobile/assets/hadits/hadits.json` | Baru | ~300 hadits (id, arabic, indonesia, perawi, kategori, pelajaran) |
| `mobile/hooks/use-hadits.ts` | Baru | `useHadits(kategori?, query?)` dan `useHaditsById(id)` |
| `mobile/app/(child)/hadits/index.tsx` | Baru | Daftar hadits: search + chip filter + FlatList |
| `mobile/app/(child)/hadits/[id].tsx` | Baru | Detail: teks Arab + terjemahan + pelajaran |
| `mobile/app/(child)/_layout.tsx` | Modifikasi | Tambah hidden routes hadits/index dan hadits/[id] |
| `mobile/app/(child)/index.tsx` | Modifikasi | Aktifkan route kartu Hadits di feature menu |

---

### Task 1: Buat hadits.json bundle lokal

**Files:**
- Create: `mobile/assets/hadits/hadits.json`

- [ ] **Step 1: Buat direktori assets/hadits**

```bash
mkdir -p "mobile/assets/hadits"
```

- [ ] **Step 2: Buat file hadits.json dengan ~300 hadits**

Buat `mobile/assets/hadits/hadits.json` dengan konten berikut (300 hadits pilihan, sesuai anak-anak):

```json
[
  {
    "id": 1,
    "arabic": "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
    "indonesia": "Sesungguhnya setiap amalan tergantung pada niatnya, dan setiap orang akan mendapatkan sesuai niatnya.",
    "perawi": "HR. Bukhari & Muslim",
    "kategori": "akhlaq",
    "pelajaran": "Niat itu penting! Sebelum melakukan kebaikan, niatkan karena Allah agar pahala kita sempurna. Kalau kita belajar dengan niat yang baik, insyaAllah dapat pahala juga!"
  },
  {
    "id": 2,
    "arabic": "مَنْ كَانَ يُؤْمِنُ بِاللهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ",
    "indonesia": "Barangsiapa beriman kepada Allah dan hari akhir, hendaklah berkata baik atau diam.",
    "perawi": "HR. Bukhari & Muslim",
    "kategori": "akhlaq",
    "pelajaran": "Kata-kata kita bisa jadi pahala atau dosa. Kalau mau bicara, pastikan yang baik-baik saja. Kalau tidak ada yang baik untuk diucapkan, lebih baik diam."
  },
  {
    "id": 3,
    "arabic": "تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ",
    "indonesia": "Senyummu kepada saudaramu adalah sedekah bagimu.",
    "perawi": "HR. Tirmidzi",
    "kategori": "akhlaq",
    "pelajaran": "Sedekah tidak hanya uang! Senyum yang tulus kepada teman juga termasuk sedekah. Yuk, biasakan senyum kepada semua orang!"
  },
  {
    "id": 4,
    "arabic": "طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ",
    "indonesia": "Menuntut ilmu adalah kewajiban bagi setiap Muslim.",
    "perawi": "HR. Ibnu Majah",
    "kategori": "ilmu",
    "pelajaran": "Belajar itu wajib untuk semua Muslim, laki-laki maupun perempuan. Belajar di sekolah, mengaji, dan membaca buku semuanya termasuk menuntut ilmu yang diwajibkan Allah."
  },
  {
    "id": 5,
    "arabic": "الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ",
    "indonesia": "Muslim yang baik adalah orang yang Muslim lainnya selamat dari lisan dan tangannya.",
    "perawi": "HR. Bukhari",
    "kategori": "akhlaq",
    "pelajaran": "Seorang Muslim yang baik tidak menyakiti orang lain baik dengan kata-kata maupun perbuatan. Jagalah lisan dan tangan kita agar tidak menyakiti siapapun!"
  },
  {
    "id": 6,
    "arabic": "لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ",
    "indonesia": "Tidaklah sempurna iman seseorang hingga ia mencintai saudaranya sebagaimana ia mencintai dirinya sendiri.",
    "perawi": "HR. Bukhari & Muslim",
    "kategori": "akhlaq",
    "pelajaran": "Cintailah temanmu seperti kamu mencintai dirimu sendiri. Kalau kamu tidak suka disakiti, jangan sakiti orang lain. Kalau kamu suka diberi, suka jugalah memberi."
  },
  {
    "id": 7,
    "arabic": "الدِّينُ النَّصِيحَةُ",
    "indonesia": "Agama itu adalah nasihat.",
    "perawi": "HR. Muslim",
    "kategori": "akhlaq",
    "pelajaran": "Islam mengajarkan kita untuk saling menasihati dengan baik. Kalau melihat teman berbuat salah, tegur dengan cara yang baik dan penuh kasih sayang."
  },
  {
    "id": 8,
    "arabic": "اتَّقِ اللهَ حَيْثُمَا كُنْتَ وَأَتْبِعِ السَّيِّئَةَ الْحَسَنَةَ تَمْحُهَا",
    "indonesia": "Bertakwalah kepada Allah di mana pun kamu berada, dan ikutilah keburukan dengan kebaikan niscaya akan menghapusnya.",
    "perawi": "HR. Tirmidzi",
    "kategori": "akhlaq",
    "pelajaran": "Kalau kita pernah berbuat salah, jangan putus asa! Segera ikuti dengan perbuatan baik. Kebaikan bisa menghapus keburukan. Allah Maha Pengampun!"
  },
  {
    "id": 9,
    "arabic": "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
    "indonesia": "Sebaik-baik kalian adalah orang yang belajar Al-Quran dan mengajarkannya.",
    "perawi": "HR. Bukhari",
    "kategori": "ilmu",
    "pelajaran": "Orang terbaik adalah yang belajar Al-Quran dan mengajarkannya kepada orang lain. Yuk rajin mengaji dan ajarkan juga kepada adik atau teman-teman kita!"
  },
  {
    "id": 10,
    "arabic": "مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللهُ لَهُ طَرِيقًا إِلَى الْجَنَّةِ",
    "indonesia": "Barangsiapa menempuh jalan untuk mencari ilmu, Allah akan memudahkan baginya jalan menuju surga.",
    "perawi": "HR. Muslim",
    "kategori": "ilmu",
    "pelajaran": "Setiap langkah kita dalam mencari ilmu adalah jalan menuju surga! Pergi ke sekolah, mengaji, dan membaca buku semuanya bernilai ibadah dan memudahkan jalan ke surga."
  },
  {
    "id": 11,
    "arabic": "بِرُّ الْوَالِدَيْنِ أَفْضَلُ مِنَ الصَّلَاةِ وَالصِّيَامِ وَالْحَجِّ وَالْجِهَادِ",
    "indonesia": "Berbakti kepada kedua orang tua lebih utama daripada shalat sunnah, puasa, haji, dan jihad.",
    "perawi": "HR. Thabrani",
    "kategori": "keluarga",
    "pelajaran": "Berbakti kepada ayah dan ibu sangat utama dalam Islam. Taati perintah mereka, bantu pekerjaan rumah, dan jangan membuat mereka sedih. Ridha Allah ada pada ridha orang tua."
  },
  {
    "id": 12,
    "arabic": "الْجَنَّةُ تَحْتَ أَقْدَامِ الأُمَّهَاتِ",
    "indonesia": "Surga berada di bawah telapak kaki ibu.",
    "perawi": "HR. An-Nasai",
    "kategori": "keluarga",
    "pelajaran": "Ibu adalah orang yang paling berjasa dalam hidup kita. Hormati, sayangi, dan patuhi ibu. Dengan berbakti kepada ibu, kita sudah membuka pintu surga."
  },
  {
    "id": 13,
    "arabic": "الرَّاحِمُونَ يَرْحَمُهُمُ الرَّحْمَنُ",
    "indonesia": "Orang-orang yang penyayang akan disayangi oleh Allah Yang Maha Penyayang.",
    "perawi": "HR. Abu Dawud & Tirmidzi",
    "kategori": "akhlaq",
    "pelajaran": "Kalau kita menyayangi orang lain dan makhluk Allah, Allah akan menyayangi kita. Sayangi adik, teman, hewan, dan semua ciptaan Allah!"
  },
  {
    "id": 14,
    "arabic": "صَلِّ قَبْلَ أَنْ تُصَلَّى عَلَيْكَ",
    "indonesia": "Shalatlah sebelum dishalatkan (meninggal).",
    "perawi": "HR. Ibnu Hibban",
    "kategori": "ibadah",
    "pelajaran": "Jangan tunda shalat! Shalat adalah tiang agama dan amalan yang pertama kali dihisab. Yuk biasakan shalat 5 waktu tepat waktu sejak kecil."
  },
  {
    "id": 15,
    "arabic": "الطَّهُورُ شَطْرُ الإِيمَانِ",
    "indonesia": "Bersuci adalah sebagian dari iman.",
    "perawi": "HR. Muslim",
    "kategori": "ibadah",
    "pelajaran": "Menjaga kebersihan dan bersuci (wudhu, mandi wajib) adalah bagian dari iman kita kepada Allah. Islam adalah agama yang sangat mencintai kebersihan!"
  },
  {
    "id": 16,
    "arabic": "مَنْ لَا يَشْكُرُ النَّاسَ لَا يَشْكُرُ اللهَ",
    "indonesia": "Barangsiapa tidak bersyukur kepada manusia, ia tidak bersyukur kepada Allah.",
    "perawi": "HR. Abu Dawud & Tirmidzi",
    "kategori": "akhlaq",
    "pelajaran": "Ucapkan terima kasih kepada orang yang telah membantu kita. Berterima kasih kepada manusia adalah bagian dari bersyukur kepada Allah atas segala nikmat-Nya."
  },
  {
    "id": 17,
    "arabic": "إِذَا مَاتَ الإِنْسَانُ انْقَطَعَ عَمَلُهُ إِلَّا مِنْ ثَلَاثٍ: صَدَقَةٍ جَارِيَةٍ، وَعِلْمٍ يُنْتَفَعُ بِهِ، وَوَلَدٍ صَالِحٍ يَدْعُو لَهُ",
    "indonesia": "Jika seseorang meninggal dunia, terputuslah amalnya kecuali tiga hal: sedekah jariyah, ilmu yang bermanfaat, dan anak shalih yang mendoakannya.",
    "perawi": "HR. Muslim",
    "kategori": "ilmu",
    "pelajaran": "Jadilah anak shalih/shalihah yang selalu mendoakan orang tua! Doa anak yang shalih akan terus mengalir pahalanya kepada orang tua meski sudah wafat."
  },
  {
    "id": 18,
    "arabic": "أَحَبُّ الأَعْمَالِ إِلَى اللهِ أَدْوَمُهَا وَإِنْ قَلَّ",
    "indonesia": "Amalan yang paling dicintai Allah adalah yang paling rutin (kontinu) meskipun sedikit.",
    "perawi": "HR. Bukhari & Muslim",
    "kategori": "ibadah",
    "pelajaran": "Allah lebih suka amalan yang sedikit tapi rutin daripada amalan banyak tapi jarang. Lebih baik shalat 5 waktu tiap hari daripada shalat banyak tapi hanya sekali-sekali!"
  },
  {
    "id": 19,
    "arabic": "كُلُّ مَعْرُوفٍ صَدَقَةٌ",
    "indonesia": "Setiap kebaikan adalah sedekah.",
    "perawi": "HR. Bukhari & Muslim",
    "kategori": "akhlaq",
    "pelajaran": "Sedekah bukan hanya uang. Membantu teman, membersihkan kelas, berkata sopan, bahkan membuang sampah di tempatnya pun termasuk sedekah!"
  },
  {
    "id": 20,
    "arabic": "لَيْسَ الشَّدِيدُ بِالصُّرَعَةِ، إِنَّمَا الشَّدِيدُ الَّذِي يَمْلِكُ نَفْسَهُ عِنْدَ الْغَضَبِ",
    "indonesia": "Orang yang kuat bukanlah yang pandai bergulat, melainkan orang yang mampu menahan dirinya ketika marah.",
    "perawi": "HR. Bukhari & Muslim",
    "kategori": "akhlaq",
    "pelajaran": "Orang yang benar-benar kuat adalah yang bisa menahan amarah. Kalau lagi marah, tarik nafas, istighfar, dan ingat Allah. Itu jauh lebih hebat daripada menang berkelahi!"
  },
  {
    "id": 21,
    "arabic": "قُلِ اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ فِي الدُّنْيَا وَالآخِرَةِ",
    "indonesia": "Katakanlah: Ya Allah, aku memohon kepada-Mu keselamatan di dunia dan akhirat.",
    "perawi": "HR. Abu Dawud & Ibnu Majah",
    "kategori": "doa",
    "pelajaran": "Ini doa memohon keselamatan di dunia dan akhirat. Amalkan setiap hari! Kesehatan dan keselamatan adalah nikmat terbesar dari Allah."
  },
  {
    "id": 22,
    "arabic": "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",
    "indonesia": "Ya Allah, bantulah aku untuk selalu mengingat-Mu, bersyukur kepada-Mu, dan beribadah dengan baik kepada-Mu.",
    "perawi": "HR. Abu Dawud & An-Nasai",
    "kategori": "doa",
    "pelajaran": "Doa yang diajarkan Rasulullah ﷺ agar kita selalu ingat Allah, bersyukur, dan rajin ibadah. Bacalah setiap selesai shalat!"
  },
  {
    "id": 23,
    "arabic": "رَبِّ زِدْنِي عِلْمًا",
    "indonesia": "Ya Tuhanku, tambahkanlah ilmuku.",
    "perawi": "QS. Thaha: 114",
    "kategori": "doa",
    "pelajaran": "Doa pendek ini sangat mudah dihafalkan! Bacalah setiap sebelum belajar agar Allah menambah ilmu kita. Ilmu adalah cahaya yang menerangi jalan hidup kita."
  },
  {
    "id": 24,
    "arabic": "اللَّهُمَّ اغْفِرْ لِي وَلِوَالِدَيَّ وَارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
    "indonesia": "Ya Allah, ampunilah aku dan kedua orang tuaku, dan sayangilah mereka sebagaimana mereka menyayangiku di waktu kecil.",
    "perawi": "HR. Abu Dawud",
    "kategori": "doa",
    "pelajaran": "Jangan lupa mendoakan ayah dan ibu setiap hari! Doa anak kepada orang tua sangat mustajab. Ini cara terbaik membalas kasih sayang mereka."
  },
  {
    "id": 25,
    "arabic": "بِسْمِ اللهِ تَوَكَّلْتُ عَلَى اللهِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ",
    "indonesia": "Dengan nama Allah, aku bertawakal kepada Allah, tidak ada daya dan kekuatan kecuali dengan pertolongan Allah.",
    "perawi": "HR. Abu Dawud & Tirmidzi",
    "kategori": "doa",
    "pelajaran": "Doa ketika keluar rumah. Bacalah setiap kali mau pergi ke sekolah atau ke mana saja. Dengan membacanya, kita dijaga oleh Allah dan dijauhkan dari bahaya."
  },
  {
    "id": 26,
    "arabic": "الصَّوْمُ جُنَّةٌ",
    "indonesia": "Puasa adalah perisai.",
    "perawi": "HR. Bukhari & Muslim",
    "kategori": "ibadah",
    "pelajaran": "Puasa melindungi kita dari dosa dan nafsu buruk seperti perisai melindungi dari serangan. Dengan berpuasa, kita belajar menahan diri dan menjadi lebih kuat secara spiritual."
  },
  {
    "id": 27,
    "arabic": "مَنْ صَامَ رَمَضَانَ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ",
    "indonesia": "Barangsiapa berpuasa Ramadan dengan penuh keimanan dan mengharap pahala, maka diampuni dosa-dosanya yang telah lalu.",
    "perawi": "HR. Bukhari & Muslim",
    "kategori": "ibadah",
    "pelajaran": "Puasa Ramadan dengan ikhlas dan niat yang benar dapat menghapus dosa-dosa kita! Manfaatkan bulan Ramadan sebaik-baiknya untuk beribadah dan berbuat kebaikan."
  },
  {
    "id": 28,
    "arabic": "إِنَّ اللهَ جَمِيلٌ يُحِبُّ الْجَمَالَ",
    "indonesia": "Sesungguhnya Allah itu Maha Indah dan menyukai keindahan.",
    "perawi": "HR. Muslim",
    "kategori": "akhlaq",
    "pelajaran": "Allah suka keindahan! Maka jagalah kebersihan diri, pakaian, dan lingkungan kita. Berpenampilan rapi dan bersih adalah bagian dari mencintai keindahan yang disukai Allah."
  },
  {
    "id": 29,
    "arabic": "لَا ضَرَرَ وَلَا ضِرَارَ",
    "indonesia": "Tidak boleh membuat mudharat (bahaya) pada diri sendiri dan orang lain.",
    "perawi": "HR. Ibnu Majah",
    "kategori": "akhlaq",
    "pelajaran": "Islam melarang kita menyakiti diri sendiri maupun orang lain. Jangan bully teman, jangan menyakiti hewan, dan jaga juga kesehatan diri sendiri!"
  },
  {
    "id": 30,
    "arabic": "الْمُؤْمِنُ لِلْمُؤْمِنِ كَالْبُنْيَانِ يَشُدُّ بَعْضُهُ بَعْضًا",
    "indonesia": "Seorang mukmin bagi mukmin lainnya bagaikan bangunan yang saling menguatkan satu sama lain.",
    "perawi": "HR. Bukhari & Muslim",
    "kategori": "keluarga",
    "pelajaran": "Sesama Muslim kita harus saling membantu dan menguatkan seperti batu bata yang menyusun dinding. Bantu teman yang kesulitan dan jadilah sandaran bagi sesama!"
  },
  {
    "id": 31,
    "arabic": "خَيْرُ النَّاسِ أَنْفَعُهُمْ لِلنَّاسِ",
    "indonesia": "Sebaik-baik manusia adalah yang paling bermanfaat bagi orang lain.",
    "perawi": "HR. Thabrani",
    "kategori": "akhlaq",
    "pelajaran": "Jadilah orang yang bermanfaat! Manusia terbaik bukan yang paling kaya atau paling pintar, tapi yang paling banyak memberi manfaat kepada orang di sekitarnya."
  },
  {
    "id": 32,
    "arabic": "إِنَّ مِنْ أَبَرِّ الْبِرِّ أَنْ يَصِلَ الرَّجُلُ أَهْلَ وُدِّ أَبِيهِ",
    "indonesia": "Sesungguhnya termasuk bakti yang paling utama adalah seseorang menyambung tali persaudaraan dengan sahabat-sahabat ayahnya.",
    "perawi": "HR. Muslim",
    "kategori": "keluarga",
    "pelajaran": "Berbakti kepada orang tua juga termasuk menghormati teman-teman mereka. Sopanlah kepada orang yang lebih tua dan hormati orang-orang yang dekat dengan keluarga kita."
  },
  {
    "id": 33,
    "arabic": "أَكْمَلُ الْمُؤْمِنِينَ إِيمَانًا أَحْسَنُهُمْ خُلُقًا",
    "indonesia": "Mukmin yang paling sempurna imannya adalah yang paling baik akhlaknya.",
    "perawi": "HR. Abu Dawud & Tirmidzi",
    "kategori": "akhlaq",
    "pelajaran": "Iman yang kuat tercermin dari akhlak yang baik. Orang yang benar-benar beriman selalu berperilaku baik kepada semua orang. Yuk perbaiki akhlak kita setiap hari!"
  },
  {
    "id": 34,
    "arabic": "مَنْ أَحَبَّ أَنْ يُبْسَطَ لَهُ فِي رِزْقِهِ وَيُنْسَأَ لَهُ فِي أَثَرِهِ فَلْيَصِلْ رَحِمَهُ",
    "indonesia": "Barangsiapa ingin diluaskan rezekinya dan dipanjangkan umurnya, hendaklah ia menyambung silaturahmi.",
    "perawi": "HR. Bukhari & Muslim",
    "kategori": "keluarga",
    "pelajaran": "Mau rezeki lancar dan umur panjang? Rajinlah silaturahmi! Kunjungi keluarga, sapa tetangga, dan jaga hubungan baik dengan semua orang."
  },
  {
    "id": 35,
    "arabic": "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ",
    "indonesia": "Ya Allah, aku berlindung kepada-Mu dari rasa gelisah dan kesedihan.",
    "perawi": "HR. Bukhari",
    "kategori": "doa",
    "pelajaran": "Doa ini dibaca ketika merasa sedih, cemas, atau khawatir. Allah selalu siap mendengar doa kita. Ceritakan semua perasaanmu kepada Allah dan mintalah pertolongan-Nya."
  },
  {
    "id": 36,
    "arabic": "إِذَا أَرَادَ أَحَدُكُمْ أَنْ يَنَامَ فَلْيَقُلْ: بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
    "indonesia": "Jika salah seorang dari kalian hendak tidur, ucapkanlah: Dengan nama-Mu ya Allah aku mati (tidur) dan hidup (bangun).",
    "perawi": "HR. Bukhari",
    "kategori": "doa",
    "pelajaran": "Bacalah doa ini sebelum tidur! Tidur ibarat mati sementara, dan bangun adalah hidup kembali. Dengan doa ini kita menyerahkan diri kepada Allah saat tidur."
  },
  {
    "id": 37,
    "arabic": "لَا تَحْقِرَنَّ مِنَ الْمَعْرُوفِ شَيْئًا",
    "indonesia": "Janganlah kamu meremehkan kebaikan sekecil apapun.",
    "perawi": "HR. Muslim",
    "kategori": "akhlaq",
    "pelajaran": "Tidak ada kebaikan yang terlalu kecil untuk diabaikan. Memungut sampah, memberi senyum, atau membantu membawakan tas teman — semua itu kebaikan yang bernilai di sisi Allah!"
  },
  {
    "id": 38,
    "arabic": "كُلُّ بِدْعَةٍ ضَلَالَةٌ",
    "indonesia": "Setiap bid'ah adalah kesesatan.",
    "perawi": "HR. Muslim",
    "kategori": "ibadah",
    "pelajaran": "Ibadah harus sesuai dengan apa yang diajarkan Rasulullah ﷺ. Jangan menambah atau mengurangi tata cara ibadah tanpa dasar dari Al-Quran dan hadits yang shahih."
  },
  {
    "id": 39,
    "arabic": "اتَّقُوا اللهَ وَصِلُوا أَرْحَامَكُمْ",
    "indonesia": "Bertakwalah kepada Allah dan sambunglah tali silaturahmi kalian.",
    "perawi": "HR. Bukhari",
    "kategori": "keluarga",
    "pelajaran": "Silaturahmi sangat penting dalam Islam. Kunjungi kakek-nenek, paman-bibi, dan saudara. Jangan biarkan hubungan keluarga putus karena kesibukan."
  },
  {
    "id": 40,
    "arabic": "لَيْسَ مِنَّا مَنْ لَمْ يَرْحَمْ صَغِيرَنَا وَيُوَقِّرْ كَبِيرَنَا",
    "indonesia": "Bukan termasuk golongan kami orang yang tidak menyayangi yang lebih muda dan tidak menghormati yang lebih tua.",
    "perawi": "HR. Tirmidzi",
    "kategori": "akhlaq",
    "pelajaran": "Sayangi adik-adik dan teman yang lebih muda. Hormati kakak, orang tua, dan guru. Inilah adab Islam yang harus kita praktikkan setiap hari."
  },
  {
    "id": 41,
    "arabic": "مَا مَلَأَ آدَمِيٌّ وِعَاءً شَرًّا مِنْ بَطْنٍ",
    "indonesia": "Tidaklah anak Adam memenuhi wadah yang lebih buruk daripada perutnya.",
    "perawi": "HR. Tirmidzi & Ibnu Majah",
    "kategori": "ibadah",
    "pelajaran": "Jangan makan berlebihan! Islam mengajarkan kita makan secukupnya: sepertiga untuk makanan, sepertiga untuk minuman, sepertiga untuk nafas. Makan yang cukup membuat badan sehat!"
  },
  {
    "id": 42,
    "arabic": "إِنَّ اللهَ كَتَبَ الإِحْسَانَ عَلَى كُلِّ شَيْءٍ",
    "indonesia": "Sesungguhnya Allah mewajibkan ihsan (berbuat baik dengan sempurna) dalam segala hal.",
    "perawi": "HR. Muslim",
    "kategori": "akhlaq",
    "pelajaran": "Allah ingin kita berbuat baik dalam segala hal — belajar dengan sungguh-sungguh, membantu dengan sepenuh hati, dan beribadah dengan khusyu'. Lakukan semua dengan sebaik mungkin!"
  },
  {
    "id": 43,
    "arabic": "مَنْ يُرِدِ اللهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّينِ",
    "indonesia": "Barangsiapa yang Allah kehendaki kebaikan baginya, Allah akan pahamkan dia dalam urusan agama.",
    "perawi": "HR. Bukhari & Muslim",
    "kategori": "ilmu",
    "pelajaran": "Kalau kita mudah memahami ilmu agama, itu tanda Allah menginginkan kebaikan untuk kita! Semangat belajar agama adalah karunia dari Allah yang harus kita syukuri."
  },
  {
    "id": 44,
    "arabic": "الْعُلَمَاءُ وَرَثَةُ الأَنْبِيَاءِ",
    "indonesia": "Para ulama adalah pewaris para nabi.",
    "perawi": "HR. Abu Dawud & Tirmidzi",
    "kategori": "ilmu",
    "pelajaran": "Orang yang berilmu agama meneruskan warisan para nabi. Hormati dan ikuti nasihat para ulama dan guru ngaji kita karena mereka mewarisi ilmu dari Rasulullah ﷺ."
  },
  {
    "id": 45,
    "arabic": "لَا حَسَدَ إِلَّا فِي اثْنَتَيْنِ: رَجُلٌ آتَاهُ اللهُ مَالًا فَسَلَّطَهُ عَلَى هَلَكَتِهِ فِي الْحَقِّ، وَرَجُلٌ آتَاهُ اللهُ حِكْمَةً فَهُوَ يَقْضِي بِهَا وَيُعَلِّمُهَا",
    "indonesia": "Tidak boleh iri kecuali dalam dua hal: orang yang diberi harta lalu menggunakannya di jalan yang benar, dan orang yang diberi hikmah lalu mengamalkan dan mengajarkannya.",
    "perawi": "HR. Bukhari & Muslim",
    "kategori": "ilmu",
    "pelajaran": "Boleh 'iri' positif kepada orang yang dermawan dan orang yang berilmu serta mengamalkannya. Jadikan mereka motivasi untuk kita menjadi lebih baik!"
  },
  {
    "id": 46,
    "arabic": "صِلَةُ الرَّحِمِ تَزِيدُ فِي الْعُمُرِ",
    "indonesia": "Silaturahmi dapat menambah umur.",
    "perawi": "HR. Ahmad",
    "kategori": "keluarga",
    "pelajaran": "Menjaga hubungan dengan keluarga bisa menambah keberkahan umur kita. Jangan malas mengunjungi saudara atau menelepon kerabat yang jauh!"
  },
  {
    "id": 47,
    "arabic": "إِذَا دَخَلْتَ عَلَى أَهْلِكَ فَسَلِّمْ",
    "indonesia": "Jika kamu masuk ke dalam rumah, ucapkanlah salam.",
    "perawi": "HR. Tirmidzi",
    "kategori": "keluarga",
    "pelajaran": "Biasakan mengucapkan salam saat masuk rumah! Assalamu'alaikum adalah doa keselamatan untuk seluruh penghuni rumah. Salam membawa keberkahan dan ketentraman."
  },
  {
    "id": 48,
    "arabic": "أَفْشُوا السَّلَامَ بَيْنَكُمْ",
    "indonesia": "Sebarkanlah salam di antara kalian.",
    "perawi": "HR. Muslim",
    "kategori": "akhlaq",
    "pelajaran": "Jangan pelit mengucapkan salam! Ucapkan salam kepada siapa saja yang kita temui, baik yang kita kenal maupun yang tidak kita kenal. Salam menyebarkan kedamaian dan kasih sayang."
  },
  {
    "id": 49,
    "arabic": "مَنْ أَصْبَحَ مِنْكُمْ آمِنًا فِي سِرْبِهِ مُعَافًى فِي جَسَدِهِ عِنْدَهُ قُوتُ يَوْمِهِ فَكَأَنَّمَا حِيزَتْ لَهُ الدُّنْيَا",
    "indonesia": "Barangsiapa di antara kalian bangun pagi dalam keadaan aman di lingkungannya, sehat badannya, dan memiliki makanan untuk hari itu — seolah-olah seluruh dunia telah diberikan kepadanya.",
    "perawi": "HR. Tirmidzi",
    "kategori": "ibadah",
    "pelajaran": "Syukuri nikmat aman, sehat, dan cukup makan! Banyak orang di dunia yang tidak mendapatkan ketiga hal ini. Mulai setiap pagi dengan syukur kepada Allah atas semua nikmat-Nya."
  },
  {
    "id": 50,
    "arabic": "الْقَنَاعَةُ كَنْزٌ لَا يَنْفَدُ",
    "indonesia": "Qanaah (merasa cukup) adalah harta yang tidak akan habis.",
    "perawi": "HR. Thabrani",
    "kategori": "akhlaq",
    "pelajaran": "Orang yang merasa cukup dengan apa yang dimiliki adalah orang terkaya di dunia! Bersyukur dengan yang ada dan tidak rakus adalah sifat mulia yang membuat hati tenang."
  }
]
```

> **Catatan:** File ini berisi 50 hadits sebagai contoh awal. Tambahkan hingga ~300 hadits dengan pola yang sama untuk melengkapi koleksi. Kategori yang tersedia: `akhlaq`, `ibadah`, `keluarga`, `ilmu`, `doa`.

- [ ] **Step 3: Commit**

```bash
git add "mobile/assets/hadits/hadits.json"
git commit -m "feat: add hadits JSON bundle lokal (50 hadits awal)"
```

---

### Task 2: Hook useHadits

**Files:**
- Create: `mobile/hooks/use-hadits.ts`

- [ ] **Step 1: Buat hook use-hadits.ts**

```typescript
// mobile/hooks/use-hadits.ts
import { useMemo } from 'react'
import haditsData from '../assets/hadits/hadits.json'

export type KategoriHadits = 'semua' | 'akhlaq' | 'ibadah' | 'keluarga' | 'ilmu' | 'doa'

export interface Hadits {
  id: number
  arabic: string
  indonesia: string
  perawi: string
  kategori: KategoriHadits
  pelajaran: string
}

const ALL_HADITS: Hadits[] = haditsData as Hadits[]

export function useHadits(kategori: KategoriHadits = 'semua', query = '') {
  return useMemo(() => {
    let result = ALL_HADITS
    if (kategori !== 'semua') {
      result = result.filter(h => h.kategori === kategori)
    }
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(
        h => h.indonesia.toLowerCase().includes(q) || h.perawi.toLowerCase().includes(q)
      )
    }
    return result
  }, [kategori, query])
}

export function useHaditsById(id: number): Hadits | undefined {
  return useMemo(() => ALL_HADITS.find(h => h.id === id), [id])
}
```

- [ ] **Step 2: Verifikasi TypeScript tidak error**

```bash
cd mobile && npx tsc --noEmit 2>&1 | head -20
```

Expected: tidak ada error terkait `use-hadits.ts`.

- [ ] **Step 3: Commit**

```bash
git add "mobile/hooks/use-hadits.ts"
git commit -m "feat: add useHadits and useHaditsById hooks"
```

---

### Task 3: Screen Daftar Hadits

**Files:**
- Create: `mobile/app/(child)/hadits/index.tsx`

- [ ] **Step 1: Buat direktori dan file screen**

```bash
mkdir -p "mobile/app/(child)/hadits"
```

- [ ] **Step 2: Buat hadits/index.tsx**

```typescript
// mobile/app/(child)/hadits/index.tsx
import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useHadits, type KategoriHadits, type Hadits } from '../../../hooks/use-hadits'

const KATEGORI_CHIPS: { value: KategoriHadits; label: string }[] = [
  { value: 'semua', label: 'Semua' },
  { value: 'akhlaq', label: 'Akhlaq' },
  { value: 'ibadah', label: 'Ibadah' },
  { value: 'keluarga', label: 'Keluarga' },
  { value: 'ilmu', label: 'Ilmu' },
  { value: 'doa', label: 'Doa' },
]

function HaditsCard({ hadits, onPress }: { hadits: Hadits; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#FDE68A',
        padding: 14,
        marginBottom: 10,
      }}
    >
      <Text style={{ fontSize: 9, color: '#F59E0B', fontWeight: '700', marginBottom: 5, letterSpacing: 0.5 }}>
        HADITS #{hadits.id} · {hadits.kategori.toUpperCase()}
      </Text>
      <Text
        numberOfLines={3}
        style={{ fontSize: 13, color: '#1A1A2E', lineHeight: 20, marginBottom: 8 }}
      >
        {hadits.indonesia}
      </Text>
      <View style={{
        backgroundColor: '#FEF3C7', borderRadius: 6,
        paddingHorizontal: 8, paddingVertical: 3,
        alignSelf: 'flex-start',
      }}>
        <Text style={{ fontSize: 10, color: '#92400E', fontWeight: '600' }}>
          {hadits.perawi}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

export default function HaditsListScreen() {
  const router = useRouter()
  const [kategori, setKategori] = useState<KategoriHadits>('semua')
  const [query, setQuery] = useState('')
  const hadits = useHadits(kategori, query)

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFBF0' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#F59E0B',
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 20,
      }}>
        <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800' }}>Hadits 📜</Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 3 }}>
          {hadits.length} hadits pilihan
        </Text>

        {/* Search */}
        <View style={{
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          marginTop: 14,
          height: 40,
        }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', marginRight: 8 }}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cari hadits..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            style={{ flex: 1, color: '#FFFFFF', fontSize: 13 }}
          />
        </View>
      </View>

      {/* Chip filter kategori */}
      <View style={{
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
        flexWrap: 'wrap',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#FEF3C7',
      }}>
        {KATEGORI_CHIPS.map(chip => (
          <TouchableOpacity
            key={chip.value}
            onPress={() => setKategori(chip.value)}
            style={{
              backgroundColor: kategori === chip.value ? '#F59E0B' : '#FEF3C7',
              borderWidth: 1.5,
              borderColor: kategori === chip.value ? '#F59E0B' : '#FDE68A',
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 6,
            }}
          >
            <Text style={{
              fontSize: 12,
              fontWeight: '600',
              color: kategori === chip.value ? '#FFFFFF' : '#92400E',
            }}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={hadits}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#92400E', paddingTop: 48, fontSize: 14 }}>
            Tidak ada hadits ditemukan.
          </Text>
        }
        renderItem={({ item }) => (
          <HaditsCard
            hadits={item}
            onPress={() => router.push(`/(child)/hadits/${item.id}`)}
          />
        )}
      />
    </View>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add "mobile/app/(child)/hadits/index.tsx"
git commit -m "feat: add hadits list screen with search and category filter"
```

---

### Task 4: Screen Detail Hadits

**Files:**
- Create: `mobile/app/(child)/hadits/[id].tsx`

- [ ] **Step 1: Buat hadits/[id].tsx**

```typescript
// mobile/app/(child)/hadits/[id].tsx
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useHaditsById } from '../../../hooks/use-hadits'

export default function HaditsDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const hadits = useHaditsById(Number(id))

  if (!hadits) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFBF0' }}>
        <Text style={{ color: '#92400E', fontSize: 14 }}>Hadits tidak ditemukan.</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFBF0' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#F59E0B',
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 16,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 34, height: 34,
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 10,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>
              Detail Hadits
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
              Hadits #{hadits.id} · {hadits.kategori.charAt(0).toUpperCase() + hadits.kategori.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Teks Arab */}
        <View style={{
          backgroundColor: '#FEF3C7',
          borderRadius: 16,
          padding: 18,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: '#FDE68A',
        }}>
          <Text style={{
            fontSize: 22,
            fontFamily: 'serif',
            color: '#1A1A2E',
            textAlign: 'right',
            lineHeight: 40,
            writingDirection: 'rtl',
          }}>
            {hadits.arabic}
          </Text>
        </View>

        {/* Terjemahan */}
        <Text style={{
          fontSize: 15,
          color: '#44403C',
          lineHeight: 24,
          fontStyle: 'italic',
          marginBottom: 10,
        }}>
          "{hadits.indonesia}"
        </Text>

        {/* Perawi */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 13 }}>📚 </Text>
          <Text style={{ fontSize: 13, color: '#92400E', fontWeight: '600' }}>
            {hadits.perawi}
          </Text>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: '#FDE68A', marginBottom: 16 }} />

        {/* Pelajaran */}
        <Text style={{ fontSize: 13, color: '#78716C', fontWeight: '600', marginBottom: 10 }}>
          💡 Pelajaran untuk Kita
        </Text>
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          borderLeftWidth: 4,
          borderLeftColor: '#F59E0B',
          padding: 14,
        }}>
          <Text style={{ fontSize: 13, color: '#44403C', lineHeight: 22 }}>
            {hadits.pelajaran}
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "mobile/app/(child)/hadits/[id].tsx"
git commit -m "feat: add hadits detail screen"
```

---

### Task 5: Registrasi Route & Aktifkan Kartu Home

**Files:**
- Modify: `mobile/app/(child)/_layout.tsx`
- Modify: `mobile/app/(child)/index.tsx`

- [ ] **Step 1: Tambah hidden routes di _layout.tsx**

Buka `mobile/app/(child)/_layout.tsx`. Tambahkan dua `Tabs.Screen` hidden tepat sebelum baris `<Tabs.Screen name="stories/[slug]"`:

```typescript
<Tabs.Screen name="hadits/index" options={{ href: null }} />
<Tabs.Screen name="hadits/[id]" options={{ href: null }} />
```

Setelah perubahan, bagian bawah file menjadi:

```typescript
      <Tabs.Screen name="quran/[id]" options={{ href: null }} />
      <Tabs.Screen
        name="rewards"
        options={{
          tabBarLabel: 'Hadiah',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFill="trophy-fill" iconLine="trophy-line" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="hadits/index" options={{ href: null }} />
      <Tabs.Screen name="hadits/[id]" options={{ href: null }} />
      <Tabs.Screen name="stories/[slug]" options={{ href: null }} />
```

- [ ] **Step 2: Aktifkan route kartu Hadits di index.tsx**

Buka `mobile/app/(child)/index.tsx`. Di array `FEATURES`, ubah `route: null` pada item Hadits menjadi:

```typescript
  {
    id: 'hadist',
    label: 'Hadits',
    subtitle: 'Hadits Pilihan',
    emoji: '📜',
    bg: '#FFF4E6',
    accent: '#F59E0B',
    route: '/(child)/hadits/' as const,
  },
```

Juga update subtitle dari `'Segera Hadir'` ke `'Hadits Pilihan'` dan hapus kondisi badge "Segera" (sudah tidak diperlukan karena fitur aktif).

- [ ] **Step 3: Verifikasi TypeScript tidak error**

```bash
cd mobile && npx tsc --noEmit 2>&1 | head -20
```

Expected: tidak ada error.

- [ ] **Step 4: Commit**

```bash
git add "mobile/app/(child)/_layout.tsx" "mobile/app/(child)/index.tsx"
git commit -m "feat: register hadits routes and activate home feature card"
```

---

### Task 6: Test Manual & Commit Final

- [ ] **Step 1: Jalankan app di simulator/device**

```bash
cd mobile && npx expo start
```

- [ ] **Step 2: Verifikasi alur lengkap**

Pastikan semua flow berikut berjalan:
1. Home screen → tap kartu "Hadits 📜" → masuk ke daftar hadits
2. Daftar hadits tampil dengan header kuning, jumlah hadits, search bar
3. Filter chip kategori berfungsi (tap "Akhlaq" → hanya tampil hadits akhlaq)
4. Search bar filter real-time berfungsi
5. Tap salah satu hadits → masuk ke detail
6. Detail: teks Arab tampil RTL, terjemahan italic, perawi, kotak pelajaran
7. Tombol ← di header kembali ke daftar
8. Badge "Segera" di home sudah hilang dari kartu Hadits

- [ ] **Step 3: Commit final jika ada perbaikan minor**

```bash
git add -p
git commit -m "fix: minor adjustments after manual testing hadits feature"
```
