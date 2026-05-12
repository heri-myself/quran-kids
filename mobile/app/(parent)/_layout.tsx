import { useState } from 'react'
import { Stack } from 'expo-router'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { RIcon } from '../../components/RIcon'

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
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1A1A2E',
          paddingHorizontal: 32,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            backgroundColor: 'rgba(124,111,241,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <RIcon name="lock-line" size={36} color="#7C6FF1" />
        </View>
        <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginBottom: 6 }}>
          Mode Orang Tua
        </Text>
        <Text style={{ color: '#6B6B8A', fontSize: 14, marginBottom: 32 }}>
          Masukkan PIN 4 digit
        </Text>

        <TextInput
          style={{
            backgroundColor: 'rgba(255,255,255,0.08)',
            color: '#FFFFFF',
            textAlign: 'center',
            fontSize: 28,
            letterSpacing: 12,
            width: 160,
            paddingVertical: 14,
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: error ? '#EF4444' : 'rgba(124,111,241,0.4)',
          }}
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
          <Text style={{ color: '#EF4444', marginTop: 12, fontSize: 14 }}>
            PIN salah. Coba lagi.
          </Text>
        )}
      </View>
    )
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
