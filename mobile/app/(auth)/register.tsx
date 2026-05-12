import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { Link } from 'expo-router'
import { useRegister } from '../../hooks/use-auth'

export default function RegisterScreen() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const register = useRegister()

  const inputStyle = {
    borderWidth: 1.5,
    borderColor: '#E8E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 12,
    color: '#1A1A2E' as const,
    fontSize: 15,
    backgroundColor: '#FAFAFE',
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F4F4FF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 }}>
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                backgroundColor: '#7C6FF1',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                shadowColor: '#7C6FF1',
                shadowOpacity: 0.4,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 6 },
                elevation: 8,
              }}
            >
              <Text style={{ fontSize: 36 }}>📖</Text>
            </View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#1A1A2E' }}>Quran Kids</Text>
            <Text style={{ color: '#6B6B8A', marginTop: 4, fontSize: 14 }}>
              Daftar dan mulai perjalananmu!
            </Text>
          </View>

          {/* Form */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 24,
              shadowColor: '#7C6FF1',
              shadowOpacity: 0.1,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              elevation: 6,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A1A2E', marginBottom: 20 }}>
              Daftar Akun
            </Text>

            <TextInput
              style={inputStyle}
              placeholder="Nama lengkap"
              placeholderTextColor="#B0B0C8"
              value={name}
              onChangeText={setName}
              autoComplete="name"
            />
            <TextInput
              style={inputStyle}
              placeholder="Email"
              placeholderTextColor="#B0B0C8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <TextInput
              style={{ ...inputStyle, marginBottom: 16 }}
              placeholder="Password (min. 8 karakter)"
              placeholderTextColor="#B0B0C8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />

            {register.isError && (
              <Text style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>
                {register.error instanceof Error ? register.error.message : 'Pendaftaran gagal'}
              </Text>
            )}

            <TouchableOpacity
              style={{
                backgroundColor: '#7C6FF1',
                borderRadius: 14,
                paddingVertical: 15,
                alignItems: 'center',
                shadowColor: '#7C6FF1',
                shadowOpacity: 0.35,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 6,
              }}
              onPress={() => {
                if (!name.trim() || !email.trim() || password.length < 8) return
                register.mutate({ name: name.trim(), email: email.trim(), password })
              }}
              disabled={register.isPending}
              accessibilityLabel="Daftar"
            >
              {register.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>Daftar</Text>
              )}
            </TouchableOpacity>

            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={{ marginTop: 16, alignItems: 'center', paddingVertical: 8 }}>
                <Text style={{ color: '#6B6B8A', fontSize: 14 }}>
                  Sudah punya akun?{' '}
                  <Text style={{ color: '#7C6FF1', fontWeight: '700' }}>Masuk</Text>
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
