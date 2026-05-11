import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useProfiles, useCreateProfile, useDeleteProfile } from '../../hooks/use-profiles'
import { Profile } from '../../stores/profile-store'

export default function ManageProfilesScreen() {
  const router = useRouter()
  const { data: profiles = [], isLoading } = useProfiles()
  const createProfile = useCreateProfile()
  const deleteProfile = useDeleteProfile()

  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAge, setNewAge] = useState('')

  const childProfiles = profiles.filter((p) => p.role === 'child')

  async function handleAdd() {
    if (!newName.trim() || !newAge.trim()) return
    const age = Number(newAge)
    if (isNaN(age) || age < 1) return
    await createProfile.mutateAsync({ name: newName.trim(), age, role: 'child' })
    setShowAdd(false)
    setNewName('')
    setNewAge('')
  }

  function confirmDelete(profile: Profile) {
    Alert.alert(
      'Hapus Profil',
      `Hapus profil "${profile.name}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => deleteProfile.mutate(profile.id),
        },
      ],
    )
  }

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-slate-800 px-6 pt-14 pb-4 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-white text-xl">←</Text>
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Profil Anak</Text>
      </View>

      <ScrollView contentContainerClassName="px-4 py-4 gap-3 pb-10">
        {isLoading && <ActivityIndicator color="#10b981" />}
        {childProfiles.map((profile) => (
          <View
            key={profile.id}
            className="bg-white rounded-2xl px-4 py-3 flex-row items-center justify-between shadow-sm"
          >
            <View>
              <Text className="font-semibold text-slate-800">{profile.name}</Text>
              {profile.age && <Text className="text-xs text-slate-400">{profile.age} tahun</Text>}
            </View>
            <TouchableOpacity
              onPress={() => confirmDelete(profile)}
              disabled={deleteProfile.isPending}
              className="bg-red-50 px-3 py-1.5 rounded-lg"
            >
              <Text className="text-red-500 text-sm">Hapus</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          onPress={() => setShowAdd(true)}
          className="bg-emerald-50 border border-dashed border-emerald-300 rounded-2xl py-4 items-center"
        >
          <Text className="text-emerald-600 font-semibold">+ Tambah Profil Anak</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-lg font-bold text-slate-800 mb-4">Profil Baru</Text>
            <TextInput
              className="border border-slate-200 rounded-xl px-4 py-3 mb-3 text-slate-800"
              placeholder="Nama anak"
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              className="border border-slate-200 rounded-xl px-4 py-3 mb-4 text-slate-800"
              placeholder="Usia"
              value={newAge}
              onChangeText={setNewAge}
              keyboardType="numeric"
            />
            <TouchableOpacity
              className="bg-emerald-500 rounded-xl py-4 items-center mb-3"
              onPress={handleAdd}
              disabled={createProfile.isPending}
            >
              {createProfile.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold">Simpan</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAdd(false)} className="items-center">
              <Text className="text-slate-500">Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}
