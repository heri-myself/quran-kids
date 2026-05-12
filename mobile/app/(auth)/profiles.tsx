import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useProfiles, useCreateProfile } from '../../hooks/use-profiles'
import { useProfileStore, Profile } from '../../stores/profile-store'
import { ProfileCard } from '../../components/ProfileCard'
import { RIcon } from '../../components/RIcon'

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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F4FF' }}>
        <ActivityIndicator color="#7C6FF1" size="large" />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4FF' }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: '#7C6FF1',
          paddingHorizontal: 24,
          paddingTop: 60,
          paddingBottom: 32,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          alignItems: 'center',
        }}
      >
        {router.canGoBack() && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ position: 'absolute', top: 56, left: 20, padding: 8 }}
          >
            <RIcon name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        <Text style={{ fontSize: 32 }}>👶</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 8 }}>
          Siapa yang mau belajar?
        </Text>
        <Text style={{ color: '#BDB8FF', fontSize: 14, marginTop: 4 }}>Pilih profilmu</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, paddingTop: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20, justifyContent: 'center' }}>
          {childProfiles.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} onPress={selectProfile} />
          ))}

          {/* Add profile button */}
          <TouchableOpacity
            onPress={() => setShowAdd(true)}
            style={{ alignItems: 'center' }}
            accessibilityLabel="Tambah profil anak"
          >
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                backgroundColor: '#EEF0FF',
                borderWidth: 2,
                borderColor: '#A89DF5',
                borderStyle: 'dashed',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}
            >
              <RIcon name="add-line" size={32} color="#7C6FF1" />
            </View>
            <Text style={{ fontSize: 13, color: '#7C6FF1', fontWeight: '600' }}>Tambah Profil</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(parent)/')}
          style={{ marginTop: 40, alignItems: 'center', paddingVertical: 12 }}
          accessibilityLabel="Buka mode orang tua"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <RIcon name="lock-line" size={14} color="#B0B0C8" />
            <Text style={{ color: '#B0B0C8', fontSize: 13 }}>Mode Orang Tua</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A1A2E', marginBottom: 20 }}>
              Tambah Profil Anak
            </Text>
            <TextInput
              style={{
                borderWidth: 1.5,
                borderColor: '#E8E8F0',
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 13,
                marginBottom: 12,
                color: '#1A1A2E',
                fontSize: 15,
                backgroundColor: '#FAFAFE',
              }}
              placeholder="Nama anak"
              placeholderTextColor="#B0B0C8"
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <TextInput
              style={{
                borderWidth: 1.5,
                borderColor: '#E8E8F0',
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 13,
                marginBottom: 20,
                color: '#1A1A2E',
                fontSize: 15,
                backgroundColor: '#FAFAFE',
              }}
              placeholder="Usia (tahun)"
              placeholderTextColor="#B0B0C8"
              value={newAge}
              onChangeText={setNewAge}
              keyboardType="numeric"
            />
            {createProfile.isError && (
              <Text style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>
                Gagal menambah profil.
              </Text>
            )}
            <TouchableOpacity
              style={{
                backgroundColor: '#7C6FF1',
                borderRadius: 14,
                paddingVertical: 15,
                alignItems: 'center',
                marginBottom: 12,
              }}
              onPress={handleAddProfile}
              disabled={createProfile.isPending}
            >
              {createProfile.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>Simpan</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setShowAdd(false); setNewName(''); setNewAge(''); createProfile.reset() }}
              style={{ alignItems: 'center', paddingVertical: 10 }}
            >
              <Text style={{ color: '#6B6B8A', fontSize: 14 }}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}
