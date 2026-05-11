import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useProfiles, useCreateProfile } from '../../hooks/use-profiles'
import { useProfileStore, Profile } from '../../stores/profile-store'
import { ProfileCard } from '../../components/ProfileCard'

export default function ProfilesScreen() {
  const router = useRouter()
  const { data: profiles = [], isLoading } = useProfiles()
  const { setActiveProfile } = useProfileStore()
  const createProfile = useCreateProfile()

  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAge, setNewAge] = useState('')

  const childProfiles = profiles.filter((p) => p.role === 'child')

  function selectProfile(profile: Profile) {
    setActiveProfile(profile)
    router.replace('/(child)/')
  }

  async function handleAddProfile() {
    const age = parseInt(newAge, 10)
    if (!newName.trim() || !age || age < 1 || age > 18) return
    try {
      await createProfile.mutateAsync({ name: newName.trim(), age, role: 'child' })
      setShowAdd(false)
      setNewName('')
      setNewAge('')
      createProfile.reset()
    } catch {
      // error displayed via createProfile.isError
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-amber-50">
        <ActivityIndicator color="#10b981" size="large" />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-amber-50">
      <View className="pt-16 pb-6 px-6 items-center">
        <Text className="text-2xl font-bold text-slate-800">Siapa yang mau belajar?</Text>
        <Text className="text-slate-500 mt-1">Pilih profilmu</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}>
        <View className="flex-row flex-wrap gap-6 justify-center">
          {childProfiles.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} onPress={selectProfile} />
          ))}
          <TouchableOpacity
            onPress={() => setShowAdd(true)}
            className="items-center"
            accessibilityLabel="Tambah profil anak"
          >
            <View className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 items-center justify-center mb-2">
              <Text className="text-3xl text-slate-400">+</Text>
            </View>
            <Text className="text-sm text-slate-500">Tambah Profil</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(parent)/')}
          className="mt-10 items-center py-3"
          accessibilityLabel="Buka mode orang tua"
        >
          <Text className="text-slate-400 text-sm">🔒 Mode Orang Tua</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-lg font-bold text-slate-800 mb-4">Tambah Profil Anak</Text>
            <TextInput
              className="border border-slate-200 rounded-xl px-4 py-3 mb-3 text-slate-800 text-base"
              placeholder="Nama anak"
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <TextInput
              className="border border-slate-200 rounded-xl px-4 py-3 mb-4 text-slate-800 text-base"
              placeholder="Usia (tahun)"
              value={newAge}
              onChangeText={setNewAge}
              keyboardType="numeric"
            />
            {createProfile.isError && (
              <Text className="text-red-500 text-sm mb-3">Gagal menambah profil.</Text>
            )}
            <TouchableOpacity
              className="bg-emerald-500 rounded-xl py-4 items-center mb-3"
              onPress={handleAddProfile}
              disabled={createProfile.isPending}
            >
              {createProfile.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Simpan</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setShowAdd(false); setNewName(''); setNewAge(''); createProfile.reset() }}
              className="items-center py-2"
            >
              <Text className="text-slate-500">Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}
