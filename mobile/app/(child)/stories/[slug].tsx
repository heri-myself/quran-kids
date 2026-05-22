import { useState, useRef } from 'react'
import {
  View, ScrollView, TouchableOpacity, Image, ActivityIndicator,
  Animated, Dimensions, Platform, StyleSheet,
} from 'react-native'
import { Text } from '../../../components/Text'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useStory, useStoryPages } from '../../../hooks/use-stories'
import { usePostProgress } from '../../../hooks/use-progress'
import { useProfileStore } from '../../../stores/profile-store'
import { AudioPlayer } from '../../../components/AudioPlayer'
import { RIcon } from '../../../components/RIcon'

const { width: W, height: H } = Dimensions.get('window')
const ILLUSTRATION_H = H * 0.38

const C = {
  primary: '#6C5CE7',
  primaryDeep: '#4B3FC9',
  primarySoft: '#EEEBFF',
  yellow: '#FFB800',
  dark: '#1A1A2E',
  gray: '#6B6B8A',
  lightGray: '#B2BEC3',
  bg: '#FAFAFE',
  white: '#FFFFFF',
}

export default function StoryReaderScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const router = useRouter()
  const { activeProfile } = useProfileStore()

  const { data: story, isLoading: storyLoading } = useStory(slug)
  const { data: pages = [], isLoading: pagesLoading } = useStoryPages(slug)
  const postProgress = usePostProgress()

  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [completed, setCompleted] = useState(false)
  const hasEarnedPoints = useRef(false)
  const celebAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(1)).current

  if (!slug) return <NotFound />

  if (storyLoading || pagesLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.primary} size="large" />
        <Text style={{ color: C.gray, marginTop: 12, fontSize: 14 }}>Memuat kisah...</Text>
      </View>
    )
  }

  if (!story || pages.length === 0) return <NotFound />

  function handleRestart() {
    setCurrentPageIndex(0)
    setCompleted(false)
    fadeAnim.setValue(1)
  }

  if (completed) return (
    <CompletedScreen
      anim={celebAnim}
      earnedPoints={!hasEarnedPoints.current ? false : true}
      onBack={() => router.back()}
      onRestart={handleRestart}
    />
  )

  const currentPage = pages[currentPageIndex]
  const isLastPage = currentPageIndex === pages.length - 1
  const progress = (currentPageIndex + 1) / pages.length

  async function goToNextPage() {
    if (!story) return

    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(async () => {
      const nextPage = currentPageIndex + 1
      const isCompleted = isLastPage

      if (activeProfile && !hasEarnedPoints.current) {
        try {
          await postProgress.mutateAsync({
            profileId: activeProfile.id,
            storyId: story.id,
            lastPage: nextPage,
            isCompleted,
          })
          if (isCompleted) hasEarnedPoints.current = true
        } catch {
          // lanjut meski progress gagal tersimpan
        }
      }

      if (isCompleted) {
        setCompleted(true)
        Animated.spring(celebAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }).start()
      } else {
        setCurrentPageIndex(nextPage)
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start()
      }
    })
  }

  const illustrationUri = currentPage.illustrationUrl ?? story.coverImageUrl ?? null

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Illustration */}
      <View style={{ width: W, height: ILLUSTRATION_H }}>
        {illustrationUri ? (
          <Image source={{ uri: illustrationUri }} style={s.illustration} resizeMode="cover" />
        ) : (
          <View style={[s.illustration, { backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 80 }}>📖</Text>
          </View>
        )}
        {/* gradient overlay */}
        <View style={s.gradientOverlay} />

        {/* Top bar */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
            <RIcon name="arrow-left" size={20} color={C.white} />
          </TouchableOpacity>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={s.progressTrack}>
              <Animated.View style={[s.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>
          <View style={s.pageBadge}>
            <Text style={s.pageBadgeText}>{currentPageIndex + 1}/{pages.length}</Text>
          </View>
        </View>

        {/* Story title on illustration */}
        <View style={s.titleOverlay}>
          <Text style={s.storyTitle} numberOfLines={2}>{story.title}</Text>
        </View>
      </View>

      {/* Content card */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Page indicator dots */}
          <View style={s.dots}>
            {pages.map((_, i) => (
              <View
                key={i}
                style={[s.dot, i === currentPageIndex && s.dotActive]}
              />
            ))}
          </View>

          {/* Audio player */}
          <AudioPlayer audioUrl={currentPage.audioUrl} />

          {/* Arabic text */}
          {currentPage.textArabic && (
            <View style={s.arabicCard}>
              <View style={s.arabicAccent} />
              <Text style={s.arabicText}>{currentPage.textArabic}</Text>
            </View>
          )}

          {/* Latin */}
          {currentPage.textLatin && (
            <Text style={s.latinText}>{currentPage.textLatin}</Text>
          )}

          {/* Translation / story text */}
          <View style={s.storyTextCard}>
            <Text style={s.storyText}>{currentPage.textTranslation}</Text>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Next button */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          onPress={goToNextPage}
          disabled={postProgress.isPending}
          style={[s.nextBtn, isLastPage && s.nextBtnFinish]}
          activeOpacity={0.85}
        >
          {postProgress.isPending ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={s.nextBtnText}>
              {isLastPage ? '🎉  Selesai Membaca!' : 'Lanjut  →'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

function NotFound() {
  const router = useRouter()
  return (
    <View style={s.center}>
      <Text style={{ fontSize: 48 }}>😕</Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color: C.dark, marginTop: 12 }}>Kisah tidak ditemukan</Text>
      <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 24, backgroundColor: C.primary, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 12 }}>
        <Text style={{ color: C.white, fontWeight: '700' }}>Kembali</Text>
      </TouchableOpacity>
    </View>
  )
}

function CompletedScreen({
  anim,
  earnedPoints,
  onBack,
  onRestart,
}: {
  anim: Animated.Value
  earnedPoints: boolean
  onBack: () => void
  onRestart: () => void
}) {
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] })
  const opacity = anim

  return (
    <View style={[s.center, { backgroundColor: C.primarySoft, paddingHorizontal: 32 }]}>
      <Animated.View style={{ alignItems: 'center', opacity, transform: [{ scale }] }}>
        <Text style={{ fontSize: 90, textAlign: 'center' }}>🎉</Text>
        <Text style={{ fontSize: 28, fontWeight: '700', color: C.primary, textAlign: 'center', marginTop: 16, lineHeight: 36 }}>
          Hebat! Kisah selesai dibaca!
        </Text>
        {!earnedPoints && (
          <Text style={{ fontSize: 14, color: C.gray, textAlign: 'center', marginTop: 10, lineHeight: 22 }}>
            Kamu mendapat 50 poin! Terus semangat belajar ya!
          </Text>
        )}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
          {[1, 2, 3].map((i) => (
            <Text key={i} style={{ fontSize: 32 }}>⭐</Text>
          ))}
        </View>
      </Animated.View>

      <View style={{ width: '100%', gap: 12, marginTop: 36 }}>
        <TouchableOpacity onPress={onRestart} style={s.completedBtnSecondary} activeOpacity={0.85}>
          <Text style={[s.nextBtnText, { color: C.primary }]}>🔄  Baca Ulang</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack} style={s.completedBtn} activeOpacity={0.85}>
          <Text style={s.nextBtnText}>Kembali ke Beranda</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  illustration: { width: W, height: ILLUSTRATION_H, position: 'absolute' },
  gradientOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: ILLUSTRATION_H * 0.6,
    backgroundColor: 'rgba(26,26,46,0.55)',
  },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 32,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  progressTrack: {
    height: 5, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 999, overflow: 'hidden',
  },
  progressFill: {
    height: 5, backgroundColor: C.white, borderRadius: 999,
  },
  pageBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  pageBadgeText: { color: C.white, fontSize: 12, fontWeight: '700' },
  titleOverlay: {
    position: 'absolute', bottom: 16, left: 20, right: 20,
  },
  storyTitle: {
    color: C.white, fontSize: 22, fontWeight: '700',
    lineHeight: 30, letterSpacing: -0.4,
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  scrollContent: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120, gap: 14,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D5D5E8' },
  dotActive: { width: 20, backgroundColor: C.primary },
  arabicCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 20,
    shadowColor: C.primary, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 3, flexDirection: 'row', gap: 14,
  },
  arabicAccent: {
    width: 4, borderRadius: 4, backgroundColor: C.primary,
  },
  arabicText: {
    flex: 1, textAlign: 'right', fontSize: 26, lineHeight: 50,
    color: C.dark, fontFamily: 'ScheherazadeNew-Regular',
    writingDirection: 'rtl',
  },
  latinText: {
    color: C.gray, fontStyle: 'italic', fontSize: 13, lineHeight: 22,
    paddingHorizontal: 4,
  },
  storyTextCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 20,
    shadowColor: C.dark, shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  storyText: { color: C.dark, fontSize: 15, lineHeight: 28, fontWeight: '400' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 48 : 28,
    paddingTop: 12,
    backgroundColor: 'rgba(250,250,254,0.95)',
  },
  nextBtn: {
    backgroundColor: C.primary, borderRadius: 18, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  nextBtnFinish: { backgroundColor: '#00B894' },
  nextBtnText: { color: C.white, fontWeight: '700', fontSize: 16 },
  completedBtn: {
    backgroundColor: C.primary, borderRadius: 18,
    paddingHorizontal: 40, paddingVertical: 16, alignItems: 'center',
    shadowColor: C.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  completedBtnSecondary: {
    backgroundColor: C.white, borderRadius: 18,
    paddingHorizontal: 40, paddingVertical: 16, alignItems: 'center',
    borderWidth: 2, borderColor: C.primary,
  },
})
