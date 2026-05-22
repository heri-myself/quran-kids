import { View, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native'
import { Text } from '../../components/Text'
import { useRouter } from 'expo-router'
import { useProfileStore } from '../../stores/profile-store'
import { RIcon } from '../../components/RIcon'

const PRIMARY = '#6C5CE7'

export default function AkunScreen() {
  const router = useRouter()
  const { activeProfile, clearActiveProfile } = useProfileStore()
  const initial = activeProfile?.name?.charAt(0)?.toUpperCase() ?? '?'

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Profile header */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>
        <Text style={styles.name}>{activeProfile?.name ?? 'Anak Shaleh'}</Text>
        {activeProfile?.age ? <Text style={styles.age}>{activeProfile.age} tahun</Text> : null}
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem} activeOpacity={0.75}>
          <View style={styles.menuIcon}>
            <RIcon name="user-line" size={20} color={PRIMARY} />
          </View>
          <Text style={styles.menuLabel}>Ubah Profil</Text>
          <RIcon name="arrow-right-line" size={18} color="#B2BEC3" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuItem}
          activeOpacity={0.75}
          onPress={() => {
            clearActiveProfile()
            router.push('/(auth)/profiles')
          }}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#FFE9E9' }]}>
            <RIcon name="parent-line" size={20} color="#FF6B6B" />
          </View>
          <Text style={[styles.menuLabel, { color: '#FF6B6B' }]}>Ganti Profil</Text>
          <RIcon name="arrow-right-line" size={18} color="#B2BEC3" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4FF' },
  content: { paddingBottom: 120 },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 64 : 48,
    paddingBottom: 28,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    shadowColor: PRIMARY,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowColor: PRIMARY, shadowOpacity: 0.35, shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
  avatarInitial: { fontSize: 36, color: '#FFFFFF', fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.4 },
  age: { fontSize: 14, color: '#6B6B8A', marginTop: 4 },
  menu: {
    backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 16,
    borderRadius: 20, paddingHorizontal: 16,
    shadowColor: PRIMARY, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 14 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EEEBFF', alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  divider: { height: 1, backgroundColor: '#F0F0FA' },
})
