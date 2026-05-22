import { useState, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  StyleSheet,
} from 'react-native'
import { Text } from '../../../components/Text'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

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
  starOn: '#FFB800',
  gold: '#FFB800',
  goldLight: '#FFF8E1',
}

const HURUF = [
  { id: 'alif',    arab: 'ا', nama: 'Alif',    kategori: 'A' },
  { id: 'ba',      arab: 'ب', nama: 'Ba',       kategori: 'B' },
  { id: 'ta',      arab: 'ت', nama: 'Ta',       kategori: 'B' },
  { id: 'tsa',     arab: 'ث', nama: 'Tsa',      kategori: 'B' },
  { id: 'jim',     arab: 'ج', nama: 'Jim',      kategori: 'J' },
  { id: 'ha',      arab: 'ح', nama: 'Ha',       kategori: 'H' },
  { id: 'kha',     arab: 'خ', nama: 'Kha',      kategori: 'H' },
  { id: 'dal',     arab: 'د', nama: 'Dal',      kategori: 'D' },
  { id: 'dzal',    arab: 'ذ', nama: 'Dzal',     kategori: 'D' },
  { id: 'ra',      arab: 'ر', nama: 'Ra',       kategori: 'R' },
  { id: 'zai',     arab: 'ز', nama: 'Zai',      kategori: 'Z' },
  { id: 'sin',     arab: 'س', nama: 'Sin',      kategori: 'S' },
  { id: 'syin',    arab: 'ش', nama: 'Syin',     kategori: 'S' },
  { id: 'shad',    arab: 'ص', nama: 'Shad',     kategori: 'S' },
  { id: 'dhad',    arab: 'ض', nama: 'Dhad',     kategori: 'D' },
  { id: 'tha',     arab: 'ط', nama: 'Tha',      kategori: 'T' },
  { id: 'zha',     arab: 'ظ', nama: 'Zha',      kategori: 'Z' },
  { id: 'ain',     arab: 'ع', nama: 'Ain',      kategori: 'A' },
  { id: 'ghain',   arab: 'غ', nama: 'Ghain',    kategori: 'G' },
  { id: 'fa',      arab: 'ف', nama: 'Fa',       kategori: 'F' },
  { id: 'qaf',     arab: 'ق', nama: 'Qaf',      kategori: 'Q' },
  { id: 'kaf',     arab: 'ك', nama: 'Kaf',      kategori: 'K' },
  { id: 'lam',     arab: 'ل', nama: 'Lam',      kategori: 'L' },
  { id: 'mim',     arab: 'م', nama: 'Mim',      kategori: 'M' },
  { id: 'nun',     arab: 'ن', nama: 'Nun',      kategori: 'N' },
  { id: 'waw',     arab: 'و', nama: 'Waw',      kategori: 'W' },
  { id: 'ha2',     arab: 'ه', nama: 'Ha',       kategori: 'H' },
  { id: 'ya',      arab: 'ي', nama: 'Ya',       kategori: 'Y' },
  { id: 'hamzah',  arab: 'ء', nama: 'Hamzah',   kategori: 'A' },
  { id: 'lam_alif',arab: 'لا',nama: 'Lam Alif', kategori: 'L' },
]

const CARD_COLORS = [
  { bg: '#E0F7FA', border: '#B2EBF2', text: '#006064' },
  { bg: '#E8F5E9', border: '#C8E6C9', text: '#1B5E20' },
  { bg: '#FFF3E0', border: '#FFE0B2', text: '#E65100' },
  { bg: '#F3E5F5', border: '#E1BEE7', text: '#4A148C' },
  { bg: '#E8EAF6', border: '#C5CAE9', text: '#1A237E' },
]

function HurufCard({ huruf, index, onPress }: {
  huruf: typeof HURUF[0]
  index: number
  onPress: () => void
}) {
  const palette = CARD_COLORS[index % CARD_COLORS.length]
  return (
    <TouchableOpacity
      style={[s.hurufCard, { backgroundColor: palette.bg, borderColor: palette.border }]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <Text style={[s.hurufArab, { color: palette.text }]}>{huruf.arab}</Text>
      <Text style={[s.hurufNama, { color: palette.text }]}>{huruf.nama}</Text>
    </TouchableOpacity>
  )
}

export default function HijaiyahIndexScreen() {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filtered = search
    ? HURUF.filter(h => h.nama.toLowerCase().includes(search.toLowerCase()))
    : HURUF

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.bg }}>
        <View style={s.headerWrap}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backText}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Game Hijaiyah</Text>
            <Text style={s.headerSub}>Kenali 30 huruf hijaiyah</Text>
          </View>
          <View style={s.headerBadge}>
            <Text style={s.headerBadgeText}>🔤 {HURUF.length}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro card */}
        <View style={s.introCard}>
          <Text style={s.introEmoji}>🎮</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.introTitle}>Mulai Belajar!</Text>
            <Text style={s.introDesc}>Ketuk huruf untuk mendengar cara bacanya</Text>
          </View>
        </View>

        {/* Grid huruf */}
        <View style={s.sectionTitle}>
          <Text style={s.sectionTitleText}>Semua Huruf Hijaiyah</Text>
        </View>

        <View style={s.grid}>
          {HURUF.map((h, i) => (
            <HurufCard
              key={h.id}
              huruf={h}
              index={i}
              onPress={() => router.push(`/(child)/hijaiyah/${h.id}` as any)}
            />
          ))}
        </View>

        {/* Coming soon card */}
        <View style={s.comingSoon}>
          <Text style={s.comingSoonEmoji}>🚀</Text>
          <Text style={s.comingSoonTitle}>Segera Hadir</Text>
          <Text style={s.comingSoonDesc}>Mode kuis, tebak huruf, dan latihan harakat akan segera tersedia!</Text>
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
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.ink, letterSpacing: -0.4 },
  headerSub: { fontSize: 12, color: C.inkSoft, marginTop: 1 },
  headerBadge: {
    backgroundColor: C.tealLight,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerBadgeText: { fontSize: 12, fontWeight: '700', color: C.teal },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 48 },

  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.line,
  },
  introEmoji: { fontSize: 36 },
  introTitle: { fontSize: 16, fontWeight: '800', color: C.ink, marginBottom: 3 },
  introDesc: { fontSize: 13, color: C.inkSoft },

  sectionTitle: { marginBottom: 14 },
  sectionTitleText: { fontSize: 15, fontWeight: '800', color: C.inkMid },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  hurufCard: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  hurufArab: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 50,
    textAlign: 'center',
  },
  hurufNama: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },

  comingSoon: {
    backgroundColor: C.goldLight,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
  },
  comingSoonEmoji: { fontSize: 32, marginBottom: 8 },
  comingSoonTitle: { fontSize: 16, fontWeight: '800', color: '#7B5800', marginBottom: 6 },
  comingSoonDesc: { fontSize: 13, color: '#9B7000', textAlign: 'center', lineHeight: 20 },
})
