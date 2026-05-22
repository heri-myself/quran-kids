import {
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  StyleSheet,
} from 'react-native'
import { Text } from '../../components/Text'
import { useRouter } from 'expo-router'
import { useProfileStore } from '../../stores/profile-store'
import { useLastActivityStore } from '../../stores/last-activity-store'

const C = {
  bg: '#F8F9FF',
  white: '#FFFFFF',
  textPrimary: '#0F172A',
  textSub: '#64748B',
  textDim: '#94A3B8',
  border: '#E8ECF4',
  purple: '#6C5CE7',
  purpleLight: '#EEE9FF',
  orange: '#FF6B35',
  orangeLight: '#FFF2ED',
  green: '#059669',
  greenLight: '#ECFDF5',
  violet: '#8B5CF6',
  violetLight: '#F3EEFF',
  teal: '#0891B2',
  tealLight: '#E0F7FA',
}

const FEATURES = [
  {
    key: 'tilawah',
    icon: '🎙️',
    title: 'Tilawah',
    desc: 'Rekam bacaanmu, dapat koreksi kata per kata dari AI',
    color: C.orange,
    bgLight: C.orangeLight,
    route: '/(child)/tilawah/',
    cta: 'Mulai Tilawah',
  },
  {
    key: 'hafalan',
    icon: '🧠',
    title: 'Hafalan',
    desc: 'Uji hafalanmu ayat demi ayat, teks tersembunyi saat rekam',
    color: C.violet,
    bgLight: C.violetLight,
    route: '/(child)/hafalan/',
    cta: 'Mulai Hafalan',
  },
  {
    key: 'membaca',
    icon: '📖',
    title: 'Mode Membaca',
    desc: 'Baca surah sambil merekam, ayat otomatis lanjut tanpa penilaian ketat',
    color: C.green,
    bgLight: C.greenLight,
    route: '/(child)/membaca/',
    cta: 'Mulai Membaca',
  },
  {
    key: 'hijaiyah',
    icon: '🔤',
    title: 'Game Hijaiyah',
    desc: 'Kenali huruf hijaiyah lewat game seru — dengar, lihat, dan hafal dengan mudah',
    color: C.teal,
    bgLight: C.tealLight,
    route: '/(child)/hijaiyah/',
    cta: 'Main Sekarang',
  },
]

function GreetingHeader({ name }: { name: string }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam'
  const initial = name.charAt(0).toUpperCase()

  return (
    <View style={s.header}>
      <View style={{ flex: 1 }}>
        <Text style={s.greeting}>{greeting} 👋</Text>
        <Text style={s.name}>{name}</Text>
        <Text style={s.subtitle}>Semangat belajar Al-Quran hari ini!</Text>
      </View>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{initial}</Text>
      </View>
    </View>
  )
}

function FeatureCard({
  icon, title, desc, color, bgLight, cta, onPress, hasActivity,
}: {
  icon: string
  title: string
  desc: string
  color: string
  bgLight: string
  cta: string
  onPress: () => void
  hasActivity?: boolean
}) {
  return (
    <TouchableOpacity style={s.featureCard} onPress={onPress} activeOpacity={0.88}>
      <View style={[s.featureIconWrap, { backgroundColor: bgLight }]}>
        <Text style={{ fontSize: 28 }}>{icon}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Text style={s.featureTitle}>{title}</Text>
        {hasActivity && (
          <View style={[s.badge, { backgroundColor: color + '20', borderColor: color + '40' }]}>
            <Text style={[s.badgeText, { color }]}>Lanjut</Text>
          </View>
        )}
      </View>
      <Text style={s.featureDesc}>{desc}</Text>
      <View style={{ flex: 1 }} />
      <View style={[s.ctaBtn, { backgroundColor: color }]}>
        <Text style={s.ctaText}>{cta} →</Text>
      </View>
    </TouchableOpacity>
  )
}

export default function HomeScreen() {
  const router = useRouter()
  const { activeProfile } = useProfileStore()
  const lastTilawah = useLastActivityStore((s) => s.lastTilawah)
  const lastHafalan = useLastActivityStore((s) => s.lastHafalan)
  const displayName = activeProfile?.name ?? 'Shaleh, Shalehah!'

  const getRoute = (key: string) => {
    if (key === 'tilawah' && lastTilawah)
      return `/(child)/tilawah/${lastTilawah.surahId}`
    if (key === 'hafalan' && lastHafalan)
      return `/(child)/hafalan/${lastHafalan.surahId}`
    return FEATURES.find((f) => f.key === key)!.route
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.headerWrap}>
          <GreetingHeader name={displayName} />
        </View>

        {/* Tagline */}
        <View style={s.taglineWrap}>
          <View style={s.taglinePill}>
            <Text style={s.taglinePillText}>✨ Pilih cara belajarmu</Text>
          </View>
          <Text style={s.taglineTitle}>4 Cara Belajar Al-Quran</Text>
          <Text style={s.taglineSub}>Pilih salah satu, atau gunakan semuanya setiap hari</Text>
        </View>

        {/* Feature Cards */}
        <View style={s.cardsWrap}>
          {FEATURES.map((f) => (
            <FeatureCard
              key={f.key}
              icon={f.icon}
              title={f.title}
              desc={f.desc}
              color={f.color}
              bgLight={f.bgLight}
              cta={f.cta}
              hasActivity={
                (f.key === 'tilawah' && !!lastTilawah) ||
                (f.key === 'hafalan' && !!lastHafalan)
              }
              onPress={() => router.push(getRoute(f.key) as any)}
            />
          ))}
        </View>

        {/* Tips */}
        <View style={s.tipsCard}>
          <Text style={s.tipsTitle}>💡 Tips Belajar</Text>
          <Text style={s.tipsTxt}>Gunakan <Text style={{ fontWeight: '700', color: C.orange }}>Tilawah</Text> untuk koreksi tajwid kata per kata.</Text>
          <Text style={[s.tipsTxt, { marginTop: 6 }]}>Gunakan <Text style={{ fontWeight: '700', color: C.violet }}>Hafalan</Text> saat kamu ingin menguji ingatan tanpa melihat teks.</Text>
          <Text style={[s.tipsTxt, { marginTop: 6 }]}>Gunakan <Text style={{ fontWeight: '700', color: C.green }}>Mode Membaca</Text> untuk membaca surah panjang dari awal sampai akhir.</Text>
          <Text style={[s.tipsTxt, { marginTop: 6 }]}>Gunakan <Text style={{ fontWeight: '700', color: C.teal }}>Game Hijaiyah</Text> untuk mengenal huruf hijaiyah dengan cara yang menyenangkan.</Text>
        </View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  headerWrap: {
    backgroundColor: C.white,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    gap: 12,
  },
  greeting: { fontSize: 13, color: C.textSub, fontWeight: '500', marginBottom: 2 },
  name: { fontSize: 24, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: C.textSub, marginTop: 4 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.purple,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },

  taglineWrap: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 8,
  },
  taglinePill: {
    alignSelf: 'flex-start',
    backgroundColor: C.purpleLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
  },
  taglinePillText: { fontSize: 12, color: C.purple, fontWeight: '700' },
  taglineTitle: { fontSize: 22, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5, marginBottom: 6 },
  taglineSub: { fontSize: 13, color: C.textSub, lineHeight: 20 },

  cardsWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 16,
    width: '47.5%',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  featureIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureTitle: { fontSize: 14, fontWeight: '800', color: C.textPrimary },
  featureDesc: { fontSize: 12, color: C.textSub, lineHeight: 17, marginBottom: 12 },
  ctaBtn: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  badge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },

  tipsCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  tipsTitle: { fontSize: 15, fontWeight: '800', color: C.textPrimary, marginBottom: 10 },
  tipsTxt: { fontSize: 13, color: C.textSub, lineHeight: 20 },
})
