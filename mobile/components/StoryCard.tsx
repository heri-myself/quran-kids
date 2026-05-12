import { View, Text, TouchableOpacity, Image } from 'react-native'
import { Story } from '../services/stories'
import { RIcon } from './RIcon'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000'

const CATEGORY_LABELS: Record<Story['category'], string> = {
  sahabat_nabi: 'Sahabat Nabi',
  kisah_quran: 'Kisah Al-Quran',
  akhlaq: 'Akhlaq',
}

const CATEGORY_COLORS: Record<Story['category'], { bg: string; text: string }> = {
  sahabat_nabi: { bg: '#FFF3E0', text: '#F57C00' },
  kisah_quran: { bg: '#E8F5E9', text: '#388E3C' },
  akhlaq: { bg: '#F3E5F5', text: '#7B1FA2' },
}

interface StoryCardProps {
  story: Story
  onPress: () => void
}

export function StoryCard({ story, onPress }: StoryCardProps) {
  const coverUrl = story.coverImageUrl
    ? story.coverImageUrl.startsWith('http')
      ? story.coverImageUrl
      : `${BASE_URL}${story.coverImageUrl}`
    : null

  const catColor = CATEGORY_COLORS[story.category]

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        overflow: 'hidden',
        flexDirection: 'row',
        shadowColor: '#7C6FF1',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
      }}
      accessibilityLabel={`Baca kisah ${story.title}`}
    >
      {/* Cover */}
      <View
        style={{
          width: 90,
          height: 90,
          backgroundColor: '#EEF0FF',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={{ width: 90, height: 90 }} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: 36 }}>📖</Text>
        )}
      </View>

      {/* Info */}
      <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center', gap: 4 }}>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <View style={{ backgroundColor: catColor.bg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: catColor.text, fontSize: 10, fontWeight: '600' }}>
              {CATEGORY_LABELS[story.category]}
            </Text>
          </View>
          {story.isPremium && (
            <View style={{ backgroundColor: '#EEF0FF', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: '#7C6FF1', fontSize: 10, fontWeight: '700' }}>✨ PREMIUM</Text>
            </View>
          )}
        </View>
        <Text style={{ fontWeight: '700', color: '#1A1A2E', fontSize: 14 }} numberOfLines={2}>
          {story.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 11, color: '#6B6B8A' }}>📄 {story.totalPages} halaman</Text>
          <View style={{ flexDirection: 'row', gap: 1 }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <RIcon key={s} name={s <= 4 ? 'star-fill' : 'star-line'} size={11} color="#FFB830" />
            ))}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}
