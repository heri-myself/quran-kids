import { useState, useCallback } from 'react'
import {
  View,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  ScrollView,
} from 'react-native'
import { Text } from '../../../components/Text'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system/legacy'

const C = {
  bg: '#F0FAFB',
  white: '#FFFFFF',
  teal: '#0891B2',
  tealLight: '#E0F7FA',
  tealMid: '#B2EBF2',
  tealDark: '#0670A0',
  ink: '#0A2A2E',
  inkMid: '#2A5A62',
  inkSoft: '#5A8A92',
  line: '#D0EEF2',
  green: '#22A66A',
  greenLight: '#E8F8F0',
  amber: '#F5A623',
  amberLight: '#FFF7E6',
  purple: '#8B5CF6',
  purpleLight: '#F3EEFF',
}

const HURUF: Record<string, {
  arab: string
  nama: string
  namaArab: string
  fathah: string
  kasrah: string
  dhammah: string
  sukun: string
  contoh: string
  contohArti: string
}> = {
  alif:    { arab: 'ا', nama: 'Alif',    namaArab: 'أَلِف',  fathah: 'أَ', kasrah: 'أِ', dhammah: 'أُ', sukun: 'أْ', contoh: 'اللَّه', contohArti: 'Allah' },
  ba:      { arab: 'ب', nama: 'Ba',      namaArab: 'بَاء',   fathah: 'بَ', kasrah: 'بِ', dhammah: 'بُ', sukun: 'بْ', contoh: 'بَيْت', contohArti: 'Rumah' },
  ta:      { arab: 'ت', nama: 'Ta',      namaArab: 'تَاء',   fathah: 'تَ', kasrah: 'تِ', dhammah: 'تُ', sukun: 'تْ', contoh: 'تِين', contohArti: 'Tin (Buah)' },
  tsa:     { arab: 'ث', nama: 'Tsa',     namaArab: 'ثَاء',   fathah: 'ثَ', kasrah: 'ثِ', dhammah: 'ثُ', sukun: 'ثْ', contoh: 'ثَلَاثَة', contohArti: 'Tiga' },
  jim:     { arab: 'ج', nama: 'Jim',     namaArab: 'جِيم',   fathah: 'جَ', kasrah: 'جِ', dhammah: 'جُ', sukun: 'جْ', contoh: 'جَنَّة', contohArti: 'Surga' },
  ha:      { arab: 'ح', nama: 'Ha',      namaArab: 'حَاء',   fathah: 'حَ', kasrah: 'حِ', dhammah: 'حُ', sukun: 'حْ', contoh: 'حَمْد', contohArti: 'Pujian' },
  kha:     { arab: 'خ', nama: 'Kha',     namaArab: 'خَاء',   fathah: 'خَ', kasrah: 'خِ', dhammah: 'خُ', sukun: 'خْ', contoh: 'خَيْر', contohArti: 'Kebaikan' },
  dal:     { arab: 'د', nama: 'Dal',     namaArab: 'دَال',   fathah: 'دَ', kasrah: 'دِ', dhammah: 'دُ', sukun: 'دْ', contoh: 'دِين', contohArti: 'Agama' },
  dzal:    { arab: 'ذ', nama: 'Dzal',    namaArab: 'ذَال',   fathah: 'ذَ', kasrah: 'ذِ', dhammah: 'ذُ', sukun: 'ذْ', contoh: 'ذِكْر', contohArti: 'Dzikir' },
  ra:      { arab: 'ر', nama: 'Ra',      namaArab: 'رَاء',   fathah: 'رَ', kasrah: 'رِ', dhammah: 'رُ', sukun: 'رْ', contoh: 'رَحْمَة', contohArti: 'Rahmat' },
  zai:     { arab: 'ز', nama: 'Zai',     namaArab: 'زَاي',   fathah: 'زَ', kasrah: 'زِ', dhammah: 'زُ', sukun: 'زْ', contoh: 'زَيْت', contohArti: 'Minyak' },
  sin:     { arab: 'س', nama: 'Sin',     namaArab: 'سِين',   fathah: 'سَ', kasrah: 'سِ', dhammah: 'سُ', sukun: 'سْ', contoh: 'سَلَام', contohArti: 'Salam/Damai' },
  syin:    { arab: 'ش', nama: 'Syin',    namaArab: 'شِين',   fathah: 'شَ', kasrah: 'شِ', dhammah: 'شُ', sukun: 'شْ', contoh: 'شَمْس', contohArti: 'Matahari' },
  shad:    { arab: 'ص', nama: 'Shad',    namaArab: 'صَاد',   fathah: 'صَ', kasrah: 'صِ', dhammah: 'صُ', sukun: 'صْ', contoh: 'صَلَاة', contohArti: 'Shalat' },
  dhad:    { arab: 'ض', nama: 'Dhad',    namaArab: 'ضَاد',   fathah: 'ضَ', kasrah: 'ضِ', dhammah: 'ضُ', sukun: 'ضْ', contoh: 'ضَوْء', contohArti: 'Cahaya' },
  tha:     { arab: 'ط', nama: 'Tha',     namaArab: 'طَاء',   fathah: 'طَ', kasrah: 'طِ', dhammah: 'طُ', sukun: 'طْ', contoh: 'طَرِيق', contohArti: 'Jalan' },
  zha:     { arab: 'ظ', nama: 'Zha',     namaArab: 'ظَاء',   fathah: 'ظَ', kasrah: 'ظِ', dhammah: 'ظُ', sukun: 'ظْ', contoh: 'ظُلْم', contohArti: 'Kegelapan/Kezaliman' },
  ain:     { arab: 'ع', nama: 'Ain',     namaArab: 'عَيْن',  fathah: 'عَ', kasrah: 'عِ', dhammah: 'عُ', sukun: 'عْ', contoh: 'عِلْم', contohArti: 'Ilmu' },
  ghain:   { arab: 'غ', nama: 'Ghain',   namaArab: 'غَيْن',  fathah: 'غَ', kasrah: 'غِ', dhammah: 'غُ', sukun: 'غْ', contoh: 'غَيْب', contohArti: 'Hal Gaib' },
  fa:      { arab: 'ف', nama: 'Fa',      namaArab: 'فَاء',   fathah: 'فَ', kasrah: 'فِ', dhammah: 'فُ', sukun: 'فْ', contoh: 'فَجْر', contohArti: 'Fajar' },
  qaf:     { arab: 'ق', nama: 'Qaf',     namaArab: 'قَاف',   fathah: 'قَ', kasrah: 'قِ', dhammah: 'قُ', sukun: 'قْ', contoh: 'قُرْآن', contohArti: 'Al-Quran' },
  kaf:     { arab: 'ك', nama: 'Kaf',     namaArab: 'كَاف',   fathah: 'كَ', kasrah: 'كِ', dhammah: 'كُ', sukun: 'كْ', contoh: 'كِتَاب', contohArti: 'Kitab/Buku' },
  lam:     { arab: 'ل', nama: 'Lam',     namaArab: 'لاَم',   fathah: 'لَ', kasrah: 'لِ', dhammah: 'لُ', sukun: 'لْ', contoh: 'لَيْل', contohArti: 'Malam' },
  mim:     { arab: 'م', nama: 'Mim',     namaArab: 'مِيم',   fathah: 'مَ', kasrah: 'مِ', dhammah: 'مُ', sukun: 'مْ', contoh: 'مَاء', contohArti: 'Air' },
  nun:     { arab: 'ن', nama: 'Nun',     namaArab: 'نُون',   fathah: 'نَ', kasrah: 'نِ', dhammah: 'نُ', sukun: 'نْ', contoh: 'نُور', contohArti: 'Cahaya' },
  waw:     { arab: 'و', nama: 'Waw',     namaArab: 'وَاو',   fathah: 'وَ', kasrah: 'وِ', dhammah: 'وُ', sukun: 'وْ', contoh: 'وَلَد', contohArti: 'Anak Laki-laki' },
  ha2:     { arab: 'ه', nama: 'Ha',      namaArab: 'هَاء',   fathah: 'هَ', kasrah: 'هِ', dhammah: 'هُ', sukun: 'هْ', contoh: 'هُدَى', contohArti: 'Petunjuk' },
  ya:      { arab: 'ي', nama: 'Ya',      namaArab: 'يَاء',   fathah: 'يَ', kasrah: 'يِ', dhammah: 'يُ', sukun: 'يْ', contoh: 'يَوْم', contohArti: 'Hari' },
  hamzah:  { arab: 'ء', nama: 'Hamzah',  namaArab: 'هَمْزَة', fathah: 'أَ', kasrah: 'أِ', dhammah: 'أُ', sukun: 'أْ', contoh: 'أَمَل', contohArti: 'Harapan' },
  lam_alif:{ arab: 'لا', nama: 'Lam Alif', namaArab: 'لاَم أَلِف', fathah: 'لاَ', kasrah: 'لاِ', dhammah: 'لاُ', sukun: 'لاْ', contoh: 'لَا إِلَهَ', contohArti: 'Tiada Tuhan' },
}

const HARAKAT = [
  { key: 'fathah',  label: 'Fathah',  symbol: 'بَ', desc: 'Bunyi "a"', color: C.teal,   bg: C.tealLight },
  { key: 'kasrah',  label: 'Kasrah',  symbol: 'بِ', desc: 'Bunyi "i"', color: C.green,  bg: C.greenLight },
  { key: 'dhammah', label: 'Dhammah', symbol: 'بُ', desc: 'Bunyi "u"', color: C.amber,  bg: C.amberLight },
  { key: 'sukun',   label: 'Sukun',   symbol: 'بْ', desc: 'Mati',      color: C.purple, bg: C.purpleLight },
]

async function playAudioFile(path: string) {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false })
    const { sound } = await Audio.Sound.createAsync({ uri: path })
    await sound.playAsync()
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) sound.unloadAsync()
    })
  } catch {}
}

function AudioButton({
  label, arabText, audioPath, color, bg,
}: {
  label: string
  arabText: string
  audioPath?: string
  color: string
  bg: string
}) {
  const [playing, setPlaying] = useState(false)

  const handlePress = useCallback(async () => {
    if (!audioPath) return
    setPlaying(true)
    await playAudioFile(audioPath)
    setTimeout(() => setPlaying(false), 1200)
  }, [audioPath])

  return (
    <TouchableOpacity
      style={[s.audioBtn, { backgroundColor: bg, borderColor: color + '40' }]}
      onPress={handlePress}
      activeOpacity={0.82}
    >
      <Text style={[s.audioBtnArab, { color }]}>{arabText}</Text>
      <Text style={[s.audioBtnLabel, { color }]}>{label}</Text>
      <View style={[s.playIconWrap, { backgroundColor: color }]}>
        <Text style={s.playIcon}>{playing ? '🔊' : '▶'}</Text>
      </View>
    </TouchableOpacity>
  )
}

export default function HijaiyahDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const huruf = HURUF[id as string]

  if (!huruf) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <Text style={{ fontSize: 16, color: C.inkSoft }}>Huruf tidak ditemukan</Text>
      </View>
    )
  }

  const audioBase = `${FileSystem.bundleDirectory ?? ''}../assets/audio/hijaiyah`

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.bg }}>
        <View style={s.headerWrap}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backText}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Huruf Hijaiyah</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <View style={s.heroCard}>
          <Text style={s.heroArab}>{huruf.arab}</Text>
          <Text style={s.heroNama}>{huruf.nama}</Text>
          <Text style={s.heroNamaArab}>{huruf.namaArab}</Text>
          <AudioButton
            label="Dengar nama"
            arabText={huruf.namaArab}
            audioPath={`${audioBase}/nama/${id}.mp3`}
            color={C.teal}
            bg={C.tealLight}
          />
        </View>

        {/* Harakat section */}
        <Text style={s.sectionTitle}>Harakat</Text>
        <View style={s.harakatGrid}>
          {HARAKAT.map((h) => (
            <AudioButton
              key={h.key}
              label={h.label}
              arabText={(huruf as any)[h.key]}
              audioPath={`${audioBase}/${h.key}/${id}.mp3`}
              color={h.color}
              bg={h.bg}
            />
          ))}
        </View>

        {/* Contoh dalam kata */}
        <Text style={s.sectionTitle}>Contoh Kata</Text>
        <View style={s.contohCard}>
          <Text style={s.contohArab}>{huruf.contoh}</Text>
          <Text style={s.contohArti}>{huruf.contohArti}</Text>
        </View>

        {/* Fun fact */}
        <View style={s.funCard}>
          <Text style={s.funEmoji}>💡</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.funTitle}>Tahukah kamu?</Text>
            <Text style={s.funDesc}>
              Huruf <Text style={{ fontWeight: '800', color: C.teal }}>{huruf.nama}</Text> adalah salah satu dari 28 huruf hijaiyah dasar dalam Al-Quran.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  headerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 20, color: C.teal, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.ink },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 60 },

  heroCard: {
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.line,
  },
  heroArab: {
    fontSize: 96,
    color: C.teal,
    lineHeight: 120,
    textAlign: 'center',
    fontWeight: '700',
  },
  heroNama: {
    fontSize: 26,
    fontWeight: '800',
    color: C.ink,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  heroNamaArab: {
    fontSize: 20,
    color: C.inkSoft,
    marginTop: 2,
    marginBottom: 18,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: C.inkMid,
    marginBottom: 12,
  },

  harakatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  audioBtn: {
    width: '47%',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  audioBtnArab: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 44,
  },
  audioBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  playIconWrap: {
    marginTop: 6,
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 14, color: C.white },

  contohCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.line,
  },
  contohArab: {
    fontSize: 48,
    color: C.ink,
    fontWeight: '700',
    lineHeight: 68,
    textAlign: 'center',
  },
  contohArti: {
    fontSize: 15,
    color: C.inkSoft,
    marginTop: 6,
    fontWeight: '600',
  },

  funCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: C.tealLight,
    borderRadius: 18,
    padding: 18,
    alignItems: 'flex-start',
  },
  funEmoji: { fontSize: 24 },
  funTitle: { fontSize: 13, fontWeight: '800', color: C.tealDark, marginBottom: 4 },
  funDesc: { fontSize: 13, color: C.inkMid, lineHeight: 20 },
})
