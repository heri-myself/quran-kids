import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system/legacy'

const SR = 22050

/** Generate a multi-tone jingle WAV as base64.
 *  tones: array of { freq, dur } played sequentially in one buffer. */
function makeJingleWav(tones: { freq: number; dur: number }[], volume = 0.6): string {
  const segments = tones.map(({ freq, dur }) => {
    const n = Math.floor(SR * dur)
    const fade = Math.floor(n * 0.15)
    const samples = new Int16Array(n)
    for (let i = 0; i < n; i++) {
      let env = 1.0
      if (i < fade) env = i / fade
      else if (i > n - fade) env = (n - i) / fade
      samples[i] = Math.round(Math.sin((2 * Math.PI * freq * i) / SR) * volume * env * 32767)
    }
    return samples
  })

  const totalSamples = segments.reduce((s, seg) => s + seg.length, 0)
  const dataBytes = totalSamples * 2
  const buf = new ArrayBuffer(44 + dataBytes)
  const v = new DataView(buf)

  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i))
  }
  str(0, 'RIFF'); v.setUint32(4, 36 + dataBytes, true); str(8, 'WAVE')
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true)
  v.setUint16(22, 1, true); v.setUint32(24, SR, true)
  v.setUint32(28, SR * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, dataBytes, true)

  let offset = 44
  for (const seg of segments) {
    for (let i = 0; i < seg.length; i++) {
      v.setInt16(offset, seg[i], true)
      offset += 2
    }
  }

  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

let _startSound: Audio.Sound | null = null
let _stopSound: Audio.Sound | null = null

async function loadJingle(
  tones: { freq: number; dur: number }[],
  key: string,
): Promise<Audio.Sound | null> {
  try {
    const b64 = makeJingleWav(tones)
    const path = `${FileSystem.cacheDirectory}sfx_${key}.wav`
    await FileSystem.writeAsStringAsync(path, b64, { encoding: 'base64' as any })
    const { sound } = await Audio.Sound.createAsync({ uri: path }, { volume: 1.0 })
    return sound
  } catch {
    return null
  }
}

// Start: C5 → E5 → G5 ascending (bright, cheerful)
const START_TONES = [
  { freq: 523, dur: 0.09 },
  { freq: 659, dur: 0.09 },
  { freq: 784, dur: 0.13 },
]

// Stop: G5 → E5 → C5 descending (calm, satisfying)
const STOP_TONES = [
  { freq: 784, dur: 0.09 },
  { freq: 659, dur: 0.09 },
  { freq: 523, dur: 0.16 },
]

export async function playStartSound(): Promise<void> {
  try {
    if (!_startSound) _startSound = await loadJingle(START_TONES, 'start')
    await _startSound?.setPositionAsync(0)
    await _startSound?.playAsync()
  } catch {}
}

export async function playStopSound(): Promise<void> {
  try {
    if (!_stopSound) _stopSound = await loadJingle(STOP_TONES, 'stop')
    await _stopSound?.setPositionAsync(0)
    await _stopSound?.playAsync()
  } catch {}
}
