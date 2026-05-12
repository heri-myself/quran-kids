import { useState, useEffect } from 'react'
import { TouchableOpacity, Text, View, ActivityIndicator } from 'react-native'
import { Audio } from 'expo-av'
import { RIcon } from './RIcon'

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
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#EEF0FF',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        alignSelf: 'flex-start',
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: '#7C6FF1',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <RIcon name={isPlaying ? 'pause-fill' : 'play-fill'} size={16} color="#FFFFFF" />
        )}
      </View>
      <Text style={{ color: '#5B52D4', fontSize: 14, fontWeight: '600' }}>
        {isPlaying ? 'Pause' : 'Dengarkan'}
      </Text>
    </TouchableOpacity>
  )
}
