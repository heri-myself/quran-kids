import { TouchableOpacity, View, Text } from 'react-native'
import { Profile } from '../stores/profile-store'

const AVATARS = ['🦁', '🐬', '🦋', '🌟', '🐻', '🦊', '🐸', '🌈']

interface ProfileCardProps {
  profile: Profile
  onPress: (profile: Profile) => void
  size?: 'sm' | 'lg'
}

export function ProfileCard({ profile, onPress, size = 'lg' }: ProfileCardProps) {
  const avatarIndex = profile.id.charCodeAt(0) % AVATARS.length
  const emoji = profile.avatar ?? AVATARS[avatarIndex]
  const isLg = size === 'lg'

  return (
    <TouchableOpacity
      onPress={() => onPress(profile)}
      className="items-center"
      accessibilityLabel={`Pilih profil ${profile.name}`}
    >
      <View
        className={`${isLg ? 'w-24 h-24' : 'w-14 h-14'} rounded-full bg-emerald-100 items-center justify-center mb-2`}
      >
        <Text className={isLg ? 'text-4xl' : 'text-2xl'}>{emoji}</Text>
      </View>
      <Text className={`font-semibold text-slate-700 ${isLg ? 'text-base' : 'text-sm'}`}>
        {profile.name}
      </Text>
      {profile.age !== null && isLg && (
        <Text className="text-xs text-slate-400">{profile.age} tahun</Text>
      )}
    </TouchableOpacity>
  )
}
