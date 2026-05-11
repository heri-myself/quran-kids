import { useState } from 'react'
import { Stack } from 'expo-router'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'

const PARENT_PIN = '1234'

export default function ParentLayout() {
  const [pinInput, setPinInput] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState(false)

  function checkPin(pin: string) {
    if (pin.length < 4) return
    if (pin === PARENT_PIN) {
      setUnlocked(true)
      setError(false)
    } else {
      setError(true)
      setPinInput('')
    }
  }

  if (!unlocked) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-800 px-8">
        <Text className="text-4xl mb-4">🔒</Text>
        <Text className="text-white text-xl font-bold mb-2">Mode Orang Tua</Text>
        <Text className="text-slate-400 text-sm mb-8">Masukkan PIN 4 digit</Text>

        <TextInput
          className="bg-slate-700 text-white text-center text-3xl tracking-widest w-40 py-3 rounded-xl"
          value={pinInput}
          onChangeText={(v) => {
            setPinInput(v)
            checkPin(v)
          }}
          keyboardType="numeric"
          maxLength={4}
          secureTextEntry
          autoFocus
        />

        {error && (
          <Text className="text-red-400 mt-3">PIN salah. Coba lagi.</Text>
        )}
      </View>
    )
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
