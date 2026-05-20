import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system/legacy'

/** Generate a sine-wave WAV and return it as base64. */
function makeBeepWav(frequency: number, durationSec: number, volume = 0.55): string {
  const sampleRate = 22050
  const numSamples = Math.floor(sampleRate * durationSec)
  const dataBytes = numSamples * 2
  const buf = new ArrayBuffer(44 + dataBytes)
  const v = new DataView(buf)

  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i))
  }
  str(0, 'RIFF')
  v.setUint32(4, 36 + dataBytes, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)            // PCM
  v.setUint16(22, 1, true)            // mono
  v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  str(36, 'data')
  v.setUint32(40, dataBytes, true)

  const fade = Math.floor(numSamples * 0.12)
  for (let i = 0; i < numSamples; i++) {
    let env = 1.0
    if (i < fade) env = i / fade
    else if (i > numSamples - fade) env = (numSamples - i) / fade
    const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * volume * env
    v.setInt16(44 + i * 2, Math.round(sample * 32767), true)
  }

  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

let _startSound: Audio.Sound | null = null
let _stopSound: Audio.Sound | null = null

async function loadSound(frequency: number, duration: number, key: string): Promise<Audio.Sound | null> {
  try {
    const b64 = makeBeepWav(frequency, duration)
    const path = `${FileSystem.cacheDirectory}sfx_${key}.wav`
    await FileSystem.writeAsStringAsync(path, b64, { encoding: 'base64' as any })
    const { sound } = await Audio.Sound.createAsync({ uri: path }, { volume: 1.0 })
    return sound
  } catch {
    return null
  }
}

export async function playStartSound(): Promise<void> {
  try {
    if (!_startSound) _startSound = await loadSound(880, 0.10, 'start')
    await _startSound?.setPositionAsync(0)
    await _startSound?.playAsync()
  } catch {}
}

export async function playStopSound(): Promise<void> {
  try {
    if (!_stopSound) _stopSound = await loadSound(523, 0.18, 'stop')
    await _stopSound?.setPositionAsync(0)
    await _stopSound?.playAsync()
  } catch {}
}
