import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { RIcon } from '../../components/RIcon'
import { useRouter } from 'expo-router'
import { useProfiles } from '../../hooks/use-profiles'
import { useGamification } from '../../hooks/use-progress'
import { useLogout } from '../../hooks/use-auth'
import { useSubscription } from '../../hooks/use-subscription'

function ChildSummary({ profileId, name }: { profileId: string; name: string }) {
  const { data } = useGamification(profileId)
  const g = data

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#7C6FF1',
        shadowOpacity: 0.07,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <Text style={{ fontWeight: '700', color: '#1A1A2E', fontSize: 15, marginBottom: 10 }}>{name}</Text>
      {g ? (
        <View style={{ flexDirection: 'row', gap: 20 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#7C6FF1' }}>{g.totalPoints}</Text>
            <Text style={{ fontSize: 11, color: '#6B6B8A' }}>poin</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#FF6B6B' }}>{g.currentStreak}</Text>
            <Text style={{ fontSize: 11, color: '#6B6B8A' }}>streak</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A1A2E' }}>{g.currentLevel}</Text>
            <Text style={{ fontSize: 11, color: '#6B6B8A' }}>level</Text>
          </View>
        </View>
      ) : (
        <ActivityIndicator size="small" color="#7C6FF1" />
      )}
    </View>
  )
}

export default function ParentDashboardScreen() {
  const router = useRouter()
  const logout = useLogout()
  const { data: profiles = [], isLoading } = useProfiles()
  const { data: subscription } = useSubscription()

  const childProfiles = profiles.filter((p) => p.role === 'child')
  const isActive = subscription?.status === 'active'

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F4F4FF' }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={{
          backgroundColor: '#1A1A2E',
          paddingHorizontal: 24,
          paddingTop: 56,
          paddingBottom: 28,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
        }}
      >
        <Text style={{ color: '#BDB8FF', fontSize: 13 }}>Mode Orang Tua</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginTop: 2 }}>
          Dashboard 👨‍👩‍👧
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 14 }}>
        {/* Subscription */}
        <View
          style={{
            backgroundColor: isActive ? '#E8F5E9' : '#FFF3E0',
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: isActive ? '#A5D6A7' : '#FFCC80',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <View>
            <Text style={{ fontWeight: '700', color: '#1A1A2E', fontSize: 14 }}>Langganan</Text>
            <Text style={{ fontSize: 13, color: isActive ? '#388E3C' : '#F57C00', marginTop: 2 }}>
              {isActive
                ? `Premium aktif sampai ${subscription?.expiresAt?.split('T')[0]}`
                : 'Akun Gratis'}
            </Text>
          </View>
          {!isActive && (
            <TouchableOpacity
              onPress={() => router.push('/(parent)/subscription')}
              style={{
                backgroundColor: '#7C6FF1',
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Upgrade</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Children */}
        <Text style={{ fontWeight: '700', color: '#1A1A2E', fontSize: 16 }}>Aktivitas Anak</Text>
        {isLoading ? (
          <ActivityIndicator color="#7C6FF1" />
        ) : (
          childProfiles.map((p) => (
            <ChildSummary key={p.id} profileId={p.id} name={p.name} />
          ))
        )}

        {/* Nav */}
        <TouchableOpacity
          onPress={() => router.push('/(parent)/profiles')}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            shadowColor: '#7C6FF1',
            shadowOpacity: 0.07,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <RIcon name="parent-line" size={18} color="#1A1A2E" />
            <Text style={{ fontWeight: '600', color: '#1A1A2E', fontSize: 14 }}>Kelola Profil Anak</Text>
          </View>
          <RIcon name="arrow-right" size={18} color="#B0B0C8" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={async () => await logout()}
          style={{
            backgroundColor: '#FFF0F0',
            borderRadius: 16,
            padding: 16,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#FFCCCC',
          }}
        >
          <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 14 }}>Keluar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
