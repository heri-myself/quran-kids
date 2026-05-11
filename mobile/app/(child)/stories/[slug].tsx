import { useState, useEffect, useRef } from 'react'
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
      <View className="flex-1 items-center justify-center bg-amber-50">
        <Text className="text-slate-500">Kisah tidak ditemukan.</Text>
      </View>
    )
  }

  const currentPage = pages[currentPageIndex]
  const isLastPage = currentPageIndex === pages.length - 1

  async function goToNextPage() {
    if (!story || !activeProfile) return

    // Record progress
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
      <View className="flex-1 items-center justify-center bg-amber-50">
        <ActivityIndicator color="#10b981" size="large" />
      </View>
    )
  }

  if (!story || pages.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-amber-50">
        <Text className="text-slate-500">Kisah tidak ditemukan.</Text>
      </View>
    )
  }

  if (completed) {
    return (
      <View className="flex-1 items-center justify-center bg-amber-50 px-6">
        <Animated.View style={{ opacity: confettiAnim, transform: [{ scale: confettiAnim }] }}>
          <Text className="text-8xl text-center">🎉</Text>
          <Text className="text-2xl font-bold text-emerald-700 text-center mt-4">
            Selesai!
          </Text>
          <Text className="text-slate-500 text-center mt-2">
            Kamu mendapat 50 poin! Terus semangat belajar!
          </Text>
        </Animated.View>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-8 bg-emerald-500 rounded-2xl px-8 py-4"
        >
          <Text className="text-white font-bold text-base">Kembali ke Beranda</Text>
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
    <View className="flex-1 bg-white">
      {/* Top bar */}
      <View className="flex-row items-center px-4 pt-12 pb-3 gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-2xl">←</Text>
        </TouchableOpacity>
        <ProgressBar current={currentPageIndex + 1} total={pages.length} />
        <Text className="text-xs text-slate-400">
          {currentPageIndex + 1}/{pages.length}
        </Text>
      </View>

      <ScrollView className="flex-1">
        {/* Illustration */}
        {illustrationUrl ? (
          <Image
            source={{ uri: illustrationUrl }}
            className="w-full"
            style={{ height: SCREEN_WIDTH * 0.6 }}
            resizeMode="cover"
          />
        ) : (
          <View
            className="w-full bg-emerald-100 items-center justify-center"
            style={{ height: SCREEN_WIDTH * 0.6 }}
          >
            <Text className="text-6xl">📖</Text>
          </View>
        )}

        {/* Text content */}
        <View className="px-6 py-5 gap-4">
          {/* Audio */}
          <AudioPlayer audioUrl={audioUrl} />

          {/* Arabic */}
          {currentPage.textArabic && (
            <Text className="text-right text-2xl leading-loose text-slate-800">
              {currentPage.textArabic}
            </Text>
          )}

          {/* Latin */}
          {currentPage.textLatin && (
            <Text className="text-slate-500 italic text-sm">{currentPage.textLatin}</Text>
          )}

          {/* Translation */}
          <Text className="text-slate-700 text-base leading-7">
            {currentPage.textTranslation}
          </Text>
        </View>
      </ScrollView>

      {/* Next button */}
      <View className="px-6 pb-8 pt-3">
        <TouchableOpacity
          onPress={goToNextPage}
          disabled={postProgress.isPending || !activeProfile}
          className="bg-emerald-500 rounded-2xl py-4 items-center"
        >
          {postProgress.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">
              {isLastPage ? '🎉 Selesai!' : 'Lanjut →'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}
