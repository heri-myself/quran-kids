import { View, ScrollView, ActivityIndicator, StyleSheet, Platform } from 'react-native'
import { Text } from '../../components/Text'
import { useProfileStore } from '../../stores/profile-store'
import { useGamification } from '../../hooks/use-progress'
import { BadgeCard } from '../../components/BadgeCard'
import { getLevelInfo, getProgressToNextLevel } from '../../constants/gamification'

const PRIMARY = '#6C5CE7'

function StatCard({ label, value, emoji }: { label: string; value: string | number; emoji: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function StreakCalendar({ streak }: { streak: number }) {
  const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Streak 7 Hari 🔥</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
        {days.map((day, i) => {
          const active = i < streak
          return (
            <View key={day} style={{ alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 11, color: '#6B6B8A' }}>{day}</Text>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: active ? PRIMARY : '#F0F0FA',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 16 }}>{active ? '🔥' : ''}</Text>
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

export default function JourneyScreen() {
  const { activeProfile } = useProfileStore()
  const { data, isLoading } = useGamification(activeProfile?.id)

  const levelInfo = data ? getLevelInfo(data.totalPoints) : null
  const progress = data ? getProgressToNextLevel(data.totalPoints) : 0
  const progressPct = Math.round(progress * 100)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Journey Belajarku 🗺️</Text>
        {levelInfo && (
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>{levelInfo.icon} {levelInfo.title}</Text>
          </View>
        )}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard label="Total Poin" value={data?.totalPoints ?? 0} emoji="⭐" />
        <StatCard label="Level" value={data?.currentLevel ?? 1} emoji="🏆" />
        <StatCard label="Streak" value={`${data?.currentStreak ?? 0}🔥`} emoji="" />
      </View>

      {/* Level progress */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Level & Poin</Text>
          <Text style={styles.sectionSub}>Level {data?.currentLevel ?? 1}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPct}%` as any }]} />
        </View>
        <Text style={styles.progressLabel}>
          {data?.totalPoints ?? 0} poin · {progressPct}% ke level berikutnya
        </Text>
      </View>

      {/* Streak calendar */}
      <StreakCalendar streak={Math.min(data?.currentStreak ?? 0, 7)} />

      {/* Badges */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hadiah & Lencana</Text>
        {isLoading ? (
          <ActivityIndicator color={PRIMARY} style={{ marginTop: 16 }} />
        ) : data?.badges?.length ? (
          <View style={styles.badgeGrid}>
            {data.badges.map((badge: any) => (
              <BadgeCard key={badge.id} badge={badge} earned={badge.earned ?? false} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyBadge}>
            <Text style={styles.emptyBadgeEmoji}>🎯</Text>
            <Text style={styles.emptyBadgeText}>Terus belajar untuk mendapat lencana!</Text>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4FF' },
  content: { paddingBottom: 100 },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 64 : 48,
    paddingBottom: 24,
    backgroundColor: PRIMARY,
    marginBottom: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 },
  levelBadge: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  levelBadgeText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statEmoji: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  statLabel: { fontSize: 11, color: '#6B6B8A', marginTop: 2, textAlign: 'center' },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 16,
    shadowColor: PRIMARY,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  sectionSub: { fontSize: 13, color: PRIMARY, fontWeight: '600' },
  progressBar: { height: 8, backgroundColor: '#EEF0FF', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: 8, backgroundColor: PRIMARY, borderRadius: 4 },
  progressLabel: { fontSize: 12, color: '#6B6B8A' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  emptyBadge: { alignItems: 'center', paddingVertical: 20 },
  emptyBadgeEmoji: { fontSize: 36, marginBottom: 8 },
  emptyBadgeText: { fontSize: 13, color: '#6B6B8A', textAlign: 'center' },
})
