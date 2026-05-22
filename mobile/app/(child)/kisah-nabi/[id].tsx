import { View, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native'
import { Text } from '../../../components/Text'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useKisahNabiDetail } from '../../../hooks/use-kisah-nabi'
import { RIcon } from '../../../components/RIcon'

const PROPHET_EMOJIS: Record<string, string> = {
  Adam: '🌿', Idris: '⭐', Nuh: '⛵', Hud: '🌬️', Saleh: '🐪',
  Ibrahim: '🔥', Lut: '🏙️', Ismail: '🏹', Ishaq: '🌙', Yaqub: '🪄',
  Yusuf: '👑', Ayyub: '💪', Syuaib: '⚖️', Musa: '🪄', Harun: '📜',
  Dzulkifli: '🌟', Daud: '🎵', Sulaiman: '🦁', Ilyas: '⚡', Ilyasa: '💧',
  Yunus: '🐋', Zakaria: '🌸', Yahya: '🕊️', Isa: '✨', Muhammad: '🌙',
}

export default function KisahNabiDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const kisah = useKisahNabiDetail(Number(id))

  if (!kisah) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F4FF' }}>
        <Text style={{ color: '#6B6B8A' }}>Kisah tidak ditemukan.</Text>
      </View>
    )
  }

  const emoji = PROPHET_EMOJIS[kisah.prophet] ?? '☪️'
  const paragraphs = kisah.content.split('\n\n').filter((p) => p.trim())

  return (
    <View style={{ flex: 1, backgroundColor: '#0F0A2E' }}>
      {/* Hero */}
      <View style={styles.hero}>
        {kisah.thumbnail ? (
          <Image
            source={{ uri: kisah.thumbnail }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : null}
        <View style={styles.heroOverlay} />

        {/* Back button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <RIcon name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Hero content */}
        <View style={styles.heroContent}>
          <Text style={styles.heroEmoji}>{emoji}</Text>
          <Text style={styles.heroNumber}>Nabi ke-{kisah.id}</Text>
          <Text style={styles.heroTitle}>{kisah.title}</Text>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>⏱ {kisah.readTime} menit baca</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1, backgroundColor: '#F4F4FF' }}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>RINGKASAN</Text>
          <Text style={styles.summaryText}>{kisah.summary}</Text>
        </View>

        {/* Full content */}
        {paragraphs.map((para, i) => {
          const isLesson = para.toLowerCase().startsWith('pelajaran')
          return (
            <View
              key={i}
              style={[styles.paraContainer, isLesson && styles.lessonContainer]}
            >
              {isLesson && (
                <Text style={styles.lessonLabel}>💡 HIKMAH</Text>
              )}
              <Text style={[styles.paraText, isLesson && styles.lessonText]}>
                {para}
              </Text>
            </View>
          )
        })}

        {/* Attribution */}
        <View style={styles.attribution}>
          <Text style={styles.attributionText}>
            Sumber: {kisah.attribution ?? 'Wikipedia Bahasa Indonesia'}
          </Text>
          <Text style={styles.attributionText}>{kisah.license}</Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  hero: {
    height: 260,
    backgroundColor: '#2D1B69',
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,10,46,0.6)',
  },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: 'flex-start',
  },
  heroEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  heroNumber: {
    color: '#BDB8FF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 10,
  },
  heroBadge: {
    backgroundColor: 'rgba(124,111,241,0.4)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  heroBadgeText: {
    color: '#D4D0FF',
    fontSize: 12,
    fontWeight: '600',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 48,
    gap: 12,
  },
  summaryCard: {
    backgroundColor: '#EEF0FF',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#7C6FF1',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C6FF1',
    letterSpacing: 1,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#1A1A2E',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  paraContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
  },
  paraText: {
    fontSize: 15,
    color: '#1A1A2E',
    lineHeight: 26,
  },
  lessonContainer: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  lessonLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 1,
    marginBottom: 8,
  },
  lessonText: {
    color: '#92400E',
  },
  attribution: {
    paddingTop: 8,
    alignItems: 'center',
    gap: 2,
  },
  attributionText: {
    fontSize: 11,
    color: '#B0B0C8',
    textAlign: 'center',
  },
})
