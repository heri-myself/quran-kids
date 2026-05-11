import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useProfiles } from '../../hooks/use-profiles'
import { useGamification } from '../../hooks/use-progress'
import { useLogout } from '../../hooks/use-auth'
import { useSubscription } from '../../hooks/use-subscription'

function ChildSummary({ profileId, name }: { profileId: string; name: string }) {
  const { data } = useGamification(profileId)
  const g = data?.gamification

  return (
    <View className="bg-white rounded-2xl p-4 shadow-sm">
      <Text className="font-semibold text-slate-800 mb-2">{name}</Text>
      {g ? (
        <View className="flex-row gap-4">
          <View className="items-center">
            <Text className="text-xl font-bold text-emerald-600">{g.totalPoints}</Text>
            <Text className="text-xs text-slate-400">poin</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl font-bold text-orange-500">{g.currentStreak}</Text>
            <Text className="text-xs text-slate-400">streak</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl font-bold text-slate-700">{g.currentLevel}</Text>
            <Text className="text-xs text-slate-400">level</Text>
          </View>
        </View>
      ) : (
        <ActivityIndicator size="small" color="#10b981" />
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
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="pb-10">
      <View className="bg-slate-800 px-6 pt-14 pb-6">
        <Text className="text-white text-2xl font-bold">Dashboard Orang Tua</Text>
      </View>

      <View className="px-4 gap-4 mt-4">
        {/* Subscription Status */}
        <View className={`rounded-2xl p-4 ${isActive ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="font-semibold text-slate-800">Langganan</Text>
              <Text className={`text-sm ${isActive ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isActive ? `Premium aktif sampai ${subscription?.expiresAt?.split('T')[0]}` : 'Akun Gratis'}
              </Text>
            </View>
            {!isActive && (
              <TouchableOpacity
                onPress={() => router.push('/(parent)/subscription')}
                className="bg-violet-600 px-3 py-2 rounded-xl"
              >
                <Text className="text-white text-xs font-semibold">Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Child Profiles Summary */}
        <Text className="font-bold text-slate-800 text-lg">Aktivitas Anak</Text>
        {isLoading ? (
          <ActivityIndicator color="#10b981" />
        ) : (
          childProfiles.map((p) => (
            <ChildSummary key={p.id} profileId={p.id} name={p.name} />
          ))
        )}

        {/* Navigation */}
        <TouchableOpacity
          onPress={() => router.push('/(parent)/profiles')}
          className="bg-white rounded-2xl p-4 shadow-sm flex-row justify-between items-center"
        >
          <Text className="font-semibold text-slate-700">👨‍👩‍👧 Kelola Profil Anak</Text>
          <Text className="text-slate-400">›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={async () => await logout()}
          className="bg-red-50 rounded-2xl p-4 items-center border border-red-100"
        >
          <Text className="text-red-500 font-semibold">Keluar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
