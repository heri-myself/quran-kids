import {
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Text } from '../../components/Text'
import { useRouter } from 'expo-router'

import { useProfileStore } from '../../stores/profile-store'
import { useGamification } from '../../hooks/use-progress'
import { useLastActivityStore } from '../../stores/last-activity-store'


const C = {
  // backgrounds
  bgGradientTop: '#6C5CE7',
  bgGradientBot: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: 'rgba(108,92,231,0.1)',
  cardSolid: '#F5F3FF',
  // text — header area (purple bg) stays white, content area dark
  textPrimary: '#1A1A2E',
  textSub: '#6B6B8A',
  textDim: '#B2BEC3',
  textOnPurple: '#FFFFFF',
  textSubOnPurple: 'rgba(255,255,255,0.75)',
  textDimOnPurple: 'rgba(255,255,255,0.4)',
  // accents
  purple: '#6C5CE7',
  purpleLight: '#A78BFA',
  orange: '#FF6B35',
  orangeSoft: '#FFF0EB',
}

// ─── HEADER ────────────────────────────────────────────────────────
function Header({ name, points, streak }: { name: string; points: number; streak: number }) {
  const initial = name.charAt(0).toUpperCase()
  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 56 : 44,
        paddingBottom: 24,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ fontSize: 13, color: C.textSubOnPurple, fontWeight: '500', marginBottom: 4 }}>
          Assalamu'alaikum 👋
        </Text>
        <Text style={{ fontSize: 26, fontWeight: '800', color: C.textOnPurple, letterSpacing: -0.5, lineHeight: 32 }}>
          {name}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 5,
            backgroundColor: 'rgba(255,107,53,0.2)', paddingHorizontal: 10, paddingVertical: 5,
            borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,107,53,0.35)',
          }}>
            <Text style={{ fontSize: 13 }}>🔥</Text>
            <Text style={{ fontSize: 12, color: C.orange, fontWeight: '700' }}>{streak} hari</Text>
          </View>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 5,
            backgroundColor: 'rgba(167,139,250,0.2)', paddingHorizontal: 10, paddingVertical: 5,
            borderRadius: 20, borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)',
          }}>
            <Text style={{ fontSize: 13 }}>⭐</Text>
            <Text style={{ fontSize: 12, color: C.purpleLight, fontWeight: '700' }}>{points} poin</Text>
          </View>
        </View>
      </View>

      <View style={{
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: C.orange,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: C.orange, shadowOpacity: 0.6, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
        elevation: 8, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.2)',
      }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{initial}</Text>
      </View>
    </View>
  )
}


// ─── LANJUT TILAWAH ────────────────────────────────────────────────
function LanjutTilawahCard({
  lastTilawah, onPress, onPressCTA,
}: {
  lastTilawah: { surahId: number; surahName: string; verseNumber: number } | null
  onPress: () => void
  onPressCTA: () => void
}) {
  if (lastTilawah) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={{
        backgroundColor: C.card, borderRadius: 22, padding: 16,
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: C.cardBorder,
        shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}>
        <View style={{
          width: 54, height: 54, borderRadius: 17,
          backgroundColor: 'rgba(167,139,250,0.2)',
          borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
          alignItems: 'center', justifyContent: 'center', marginRight: 14,
        }}>
          <Text style={{ fontSize: 26 }}>🎙️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, color: C.purpleLight, fontWeight: '700', letterSpacing: 1, marginBottom: 3 }}>LANJUT TILAWAH</Text>
          <Text style={{ fontSize: 16, color: C.textPrimary, fontWeight: '700' }}>{lastTilawah.surahName}</Text>
          <Text style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>Terakhir dibuka · Ayat {lastTilawah.verseNumber}</Text>
        </View>
        <View style={{
          backgroundColor: C.orange, borderRadius: 13,
          paddingHorizontal: 14, paddingVertical: 9,
          shadowColor: C.orange, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
        }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Lanjut →</Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPressCTA} style={{
      backgroundColor: C.card, borderRadius: 22, padding: 16,
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderColor: C.cardBorder,
    }}>
      <View style={{
        width: 54, height: 54, borderRadius: 17,
        backgroundColor: C.orangeSoft,
        borderWidth: 1, borderColor: 'rgba(255,107,53,0.25)',
        alignItems: 'center', justifyContent: 'center', marginRight: 14,
      }}>
        <Text style={{ fontSize: 26 }}>🎤</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, color: C.orange, fontWeight: '700', letterSpacing: 1, marginBottom: 3 }}>MULAI SEKARANG</Text>
        <Text style={{ fontSize: 15, color: C.textPrimary, fontWeight: '700' }}>Mulai Tilawah Pertamamu!</Text>
        <Text style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>Rekam bacaanmu & raih bintang ⭐</Text>
      </View>
      <View style={{
        backgroundColor: C.orange, borderRadius: 13,
        paddingHorizontal: 14, paddingVertical: 9,
        shadowColor: C.orange, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
      }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Mulai →</Text>
      </View>
    </TouchableOpacity>
  )
}


// ─── SECTION HEADER ────────────────────────────────────────────────
function SectionHeader({ title, subtitle, onSeeAll, light }: { title: string; subtitle?: string; onSeeAll?: () => void; light?: boolean }) {
  const titleColor = light ? C.textOnPurple : C.textPrimary
  const subColor = light ? C.textSubOnPurple : C.textSub
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, marginBottom: 4 }}>
      <View>
        <Text style={{ fontSize: 18, fontWeight: '800', color: titleColor, letterSpacing: -0.4 }}>{title}</Text>
        {subtitle && <Text style={{ fontSize: 12, color: subColor, marginTop: 2 }}>{subtitle}</Text>}
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: light ? 'rgba(255,255,255,0.85)' : C.orange }}>Lihat semua →</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ─── DIVIDER ───────────────────────────────────────────────────────
function Divider() {
  return <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginHorizontal: 20, marginVertical: 4 }} />
}

// ─── HOME SCREEN ───────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter()
  const { activeProfile } = useProfileStore()
  const { data: gamificationData } = useGamification(activeProfile?.id)
  const lastTilawah = useLastActivityStore((s) => s.lastTilawah)
  const lastHafalan = useLastActivityStore((s) => s.lastHafalan)

  const points = gamificationData?.totalPoints ?? 0
  const streak = gamificationData?.currentStreak ?? 0
  const displayName = activeProfile?.name ?? 'Shaleh, Shalehah!'

  return (
    <LinearGradient colors={['#6C5CE7', '#9B8FF0', '#E8E4FF', '#FFFFFF']} locations={[0, 0.25, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        <Header name={displayName} points={points} streak={streak} />

        <View style={{ height: 20 }} />

        {/* Tilawah */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <SectionHeader title="Tilawah" subtitle="Lanjutkan perjalanan bacaanmu" />
          <View style={{ marginTop: 12 }}>
            <LanjutTilawahCard
              lastTilawah={lastTilawah}
              onPress={() => router.push(`/(child)/tilawah/${lastTilawah?.surahId}` as any)}
              onPressCTA={() => router.push('/(child)/tilawah/' as any)}
            />
          </View>
        </View>

        {/* Hafalan */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <SectionHeader title="Hafalan" subtitle="Uji hafalanmu ayat demi ayat" />
          <View style={{ marginTop: 12 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                lastHafalan
                  ? router.push(`/(child)/hafalan/${lastHafalan.surahId}` as any)
                  : router.push('/(child)/hafalan/' as any)
              }
              style={{
                backgroundColor: C.card, borderRadius: 22, padding: 16,
                flexDirection: 'row', alignItems: 'center',
                borderWidth: 1, borderColor: C.cardBorder,
                shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
                elevation: 4,
              }}
            >
              <View style={{
                width: 54, height: 54, borderRadius: 17,
                backgroundColor: 'rgba(108,92,231,0.15)',
                borderWidth: 1, borderColor: 'rgba(108,92,231,0.25)',
                alignItems: 'center', justifyContent: 'center', marginRight: 14,
              }}>
                <Text style={{ fontSize: 26 }}>📖</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: C.purple, fontWeight: '700', letterSpacing: 1, marginBottom: 3 }}>
                  {lastHafalan ? 'LANJUT HAFALAN' : 'MULAI SEKARANG'}
                </Text>
                <Text style={{ fontSize: 16, color: C.textPrimary, fontWeight: '700' }}>
                  {lastHafalan ? lastHafalan.surahName : 'Mulai Hafalan Pertamamu!'}
                </Text>
                <Text style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
                  {lastHafalan ? 'Terakhir dibuka' : 'Uji hafalanmu & raih bintang ⭐'}
                </Text>
              </View>
              <View style={{
                backgroundColor: C.purple, borderRadius: 13,
                paddingHorizontal: 14, paddingVertical: 9,
                shadowColor: C.purple, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
              }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                  {lastHafalan ? 'Lanjut →' : 'Mulai →'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </LinearGradient>
  )
}
