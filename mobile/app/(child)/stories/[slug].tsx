import { useState, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator,
  Animated, Dimensions,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useStory, useStoryPages } from '../../../hooks/use-stories'
import { usePostProgress } from '../../../hooks/use-progress'
import { useProfileStore } from '../../../stores/profile-store'
import { AudioPlayer } from '../../../components/AudioPlayer'
import { ProgressBar } from '../../../components/ProgressBar'
import { RIcon } from '../../../components/RIcon'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000'
const { width: SCREEN_WIDTH } = Dimensions.get('window')

export default function StoryReaderScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const router = useRouter()
  const { activeProfile } = useProfileStore()

  const { data: story, isLoading: storyLoading } = useStory(slug)
  const { data: pages = [], isLoading: pagesLoading } = useStoryPages(slug)
  const postProgress = usePostProgress()

  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [completed, setCompleted] = useState(false)
  const confettiAnim = useRef(new Animated.Value(0)).current

  if (!slug) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F4FF' }}>
        <Text style={{ color: '#6B6B8A' }}>Kisah tidak ditemukan.</Text>
      </View>
    )
  }

  const currentPage = pages[currentPageIndex]
  const isLastPage = currentPageIndex === pages.length - 1

  async function goToNextPage() {
    if (!story || !activeProfile) return
    const nextPage = currentPageIndex + 1
    const isCompleted = isLastPage

    await postProgress.mutateAsync({
      profileId: activeProfile.id,
      storyId: story.id,
      lastPage: nextPage,
      isCompleted,
    })

    if (isCompleted) {
      setCompleted(true)
      Animated.sequence([
        Animated.timing(confettiAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(confettiAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start()
    } else {
      setCurrentPageIndex(nextPage)
    }
  }

  if (storyLoading || pagesLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F4FF' }}>
        <ActivityIndicator color="#7C6FF1" size="large" />
      </View>
    )
  }

  if (!story || pages.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F4FF' }}>
        <Text style={{ color: '#6B6B8A' }}>Kisah tidak ditemukan.</Text>
      </View>
    )
  }

  if (completed) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F4FF', paddingHorizontal: 24 }}>
        <Animated.View style={{ opacity: confettiAnim, transform: [{ scale: confettiAnim }], alignItems: 'center' }}>
          <Text style={{ fontSize: 80, textAlign: 'center' }}>🎉</Text>
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#7C6FF1', textAlign: 'center', marginTop: 16 }}>
            Selesai!
          </Text>
          <Text style={{ color: '#6B6B8A', textAlign: 'center', marginTop: 8, fontSize: 15 }}>
            Kamu mendapat 50 poin! Terus semangat belajar!
          </Text>
        </Animated.View>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            marginTop: 32,
            backgroundColor: '#7C6FF1',
            borderRadius: 20,
            paddingHorizontal: 32,
            paddingVertical: 16,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>Kembali ke Beranda</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const illustrationUrl = currentPage.illustrationUrl
    ? `${BASE_URL}${currentPage.illustrationUrl}`
    : null

  const audioUrl = currentPage.audioUrl
    ? `${BASE_URL}${currentPage.audioUrl}`
    : null

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Illustration - full bleed */}
      <View style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.65 }}>
        {illustrationUrl ? (
          <Image
            source={{ uri: illustrationUrl }}
            style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.65 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: SCREEN_WIDTH,
              height: SCREEN_WIDTH * 0.65,
              backgroundColor: '#EEF0FF',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 64 }}>📖</Text>
          </View>
        )}

        {/* Overlay top bar */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 48,
            paddingBottom: 12,
            backgroundColor: 'rgba(0,0,0,0.25)',
            gap: 12,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.3)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RIcon name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <ProgressBar current={currentPageIndex + 1} total={pages.length} />
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
            {currentPageIndex + 1}/{pages.length}
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24, gap: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A1A2E' }}>{story.title}</Text>

        <AudioPlayer audioUrl={audioUrl} />

        {currentPage.textArabic && (
          <View style={{ backgroundColor: '#EEF0FF', borderRadius: 16, padding: 16 }}>
            <Text style={{ textAlign: 'right', fontSize: 22, lineHeight: 40, color: '#1A1A2E' }}>
              {currentPage.textArabic}
            </Text>
          </View>
        )}

        {currentPage.textLatin && (
          <Text style={{ color: '#6B6B8A', fontStyle: 'italic', fontSize: 13 }}>
            {currentPage.textLatin}
          </Text>
        )}

        <Text style={{ color: '#1A1A2E', fontSize: 15, lineHeight: 26 }}>
          {currentPage.textTranslation}
        </Text>
      </ScrollView>

      {/* Next button */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 32, paddingTop: 12 }}>
        <TouchableOpacity
          onPress={goToNextPage}
          disabled={postProgress.isPending || !activeProfile}
          style={{
            backgroundColor: '#7C6FF1',
            borderRadius: 20,
            paddingVertical: 16,
            alignItems: 'center',
            shadowColor: '#7C6FF1',
            shadowOpacity: 0.4,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          {postProgress.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
              {isLastPage ? '🎉 Selesai!' : 'Lanjut →'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}
