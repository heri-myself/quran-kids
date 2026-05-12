import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useProfileStore } from '../../stores/profile-store'
import { useGamification } from '../../hooks/use-progress'
import { BadgeCard } from '../../components/BadgeCard'
import { getLevelInfo, getProgressToNextLevel } from '../../constants/gamification'
import { RIcon } from '../../components/RIcon'

function AvatarCircle({ name, avatar }: { name: string; avatar: string | null }) {
  const initial = name?.charAt(0)?.toUpperCase() ?? '?'
  return (
    <View style={styles.avatarCircle}>
      <Text style={styles.avatarInitial}>{initial}</Text>
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
                  backgroundColor: active ? '#7C6FF1' : '#F0F0FA',
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

function StatCard({ label, value, emoji }: { label: string; value: string | number; emoji: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

export default function AkunScreen() {
  const router = useRouter()
  const { activeProfile, clearActiveProfile } = useProfileStore()
  const { data, isLoading } = useGamification(activeProfile?.id)

  const levelInfo = data ? getLevelInfo(data.currentLevel) : null
  const progress = data ? getProgressToNextLevel(data.totalPoints) : 0

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header profil */}
      <View style={styles.profileHeader}>
        <AvatarCircle name={activeProfile?.name ?? ''} avatar={activeProfile?.avatar ?? null} />
        <Text style={styles.profileName}>{activeProfile?.name ?? 'Anak'}</Text>
        <Text style={styles.profileAge}>
          {activeProfile?.age ? `${activeProfile.age} tahun` : ''}
        </Text>
        {levelInfo && (
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>{levelInfo.icon} {levelInfo.title}</Text>
          </View>
        )}
      </View>

      {/* Progress level */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Level & Poin</Text>
          <Text style={styles.sectionSub}>Level {data?.currentLevel ?? 1}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
        </View>
        <Text style={styles.progressLabel}>{data?.totalPoints ?? 0} poin · {Math.round(progress)}% ke level berikutnya</Text>
      </View>

      {/* Statistik */}
      <View style={styles.statsRow}>
        <StatCard label="Total Poin" value={data?.totalPoints ?? 0} emoji="⭐" />
        <StatCard label="Level" value={data?.currentLevel ?? 1} emoji="🏆" />
        <StatCard label="Streak" value={`${data?.currentStreak ?? data?.streak ?? 0}🔥`} emoji="" />
      </View>

      {/* Streak Calendar */}
      <StreakCalendar streak={Math.min(data?.currentStreak ?? data?.streak ?? 0, 7)} />

      {/* Hadiah / Badge */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hadiah & Lencana</Text>
        {isLoading ? (
          <ActivityIndicator color="#7C6FF1" style={{ marginTop: 16 }} />
        ) : data?.badges?.length ? (
          <View style={styles.badgeGrid}>
            {data.badges.map((badge: any) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyBadge}>
            <Text style={styles.emptyBadgeEmoji}>🎯</Text>
            <Text style={styles.emptyBadgeText}>Terus belajar untuk mendapat lencana!</Text>
          </View>
        )}
      </View>

      {/* Tombol ganti profil */}
      <TouchableOpacity
        style={styles.switchBtn}
        onPress={() => {
          clearActiveProfile()
          router.push('/(auth)/profiles')
        }}
      >
        <RIcon name="parent-line" size={18} color="#7C6FF1" />
        <Text style={styles.switchBtnText}>Ganti Profil</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4FF' },
  content: { paddingBottom: 40 },
  profileHeader: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 64 : 48,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#7C6FF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#7C6FF1',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  avatarInitial: { fontSize: 32, color: '#FFFFFF', fontWeight: '700' },
  profileName: { fontSize: 22, fontWeight: '700', color: '#1A1A2E' },
  profileAge: { fontSize: 14, color: '#6B6B8A', marginTop: 2 },
  levelBadge: {
    marginTop: 8,
    backgroundColor: '#EEF0FF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  levelBadgeText: { fontSize: 13, fontWeight: '700', color: '#7C6FF1' },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#7C6FF1',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  sectionSub: { fontSize: 13, color: '#7C6FF1', fontWeight: '600' },
  progressBar: {
    height: 8,
    backgroundColor: '#EEF0FF',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: { height: 8, backgroundColor: '#7C6FF1', borderRadius: 4 },
  progressLabel: { fontSize: 12, color: '#6B6B8A' },
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
    padding: 12,
    alignItems: 'center',
    shadowColor: '#7C6FF1',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statEmoji: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  statLabel: { fontSize: 11, color: '#6B6B8A', marginTop: 2, textAlign: 'center' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emptyBadge: { alignItems: 'center', paddingVertical: 20 },
  emptyBadgeEmoji: { fontSize: 36, marginBottom: 8 },
  emptyBadgeText: { fontSize: 13, color: '#6B6B8A', textAlign: 'center' },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#7C6FF1',
    backgroundColor: '#FFFFFF',
  },
  switchBtnText: { fontSize: 14, fontWeight: '700', color: '#7C6FF1' },
})
