import { useState, useEffect } from 'react'
import { TouchableOpacity, Text, View, ActivityIndicator } from 'react-native'
import { Audio } from 'expo-av'

interface AudioPlayerProps {
  audioUrl: string | null
}

export function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    return () => {
      sound?.unloadAsync()
    }
  }, [sound])

  // Unload when URL changes (page change)
  useEffect(() => {
    sound?.unloadAsync()
    setSound(null)
    setIsPlaying(false)
  }, [audioUrl])

  async function togglePlay() {
    if (!audioUrl) return

    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync()
        setIsPlaying(false)
      } else {
        await sound.playAsync()
        setIsPlaying(true)
      }
      return
    }

    setIsLoading(true)
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true })
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
      )
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false)
        }
      })
      setSound(newSound)
      setIsPlaying(true)
    } catch (e) {
      console.error('Audio error:', e)
    } finally {
      setIsLoading(false)
    }
  }

  if (!audioUrl) return null

  return (
    <TouchableOpacity
      onPress={togglePlay}
      className="flex-row items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-2"
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#10b981" />
      ) : (
        <Text className="text-xl">{isPlaying ? '⏸️' : '▶️'}</Text>
      )}
      <Text className="text-emerald-700 text-sm font-medium">
        {isPlaying ? 'Pause' : 'Dengarkan'}
      </Text>
    </TouchableOpacity>
  )
}
