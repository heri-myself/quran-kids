import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { Link } from 'expo-router'
import { useLogin } from '../../hooks/use-auth'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useLogin()

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
              Kisah penuh hikmah untuk si kecil
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
              Masuk
            </Text>

            <TextInput
              style={{
                borderWidth: 1.5,
                borderColor: '#E8E8F0',
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 13,
                marginBottom: 12,
                color: '#1A1A2E',
                fontSize: 15,
                backgroundColor: '#FAFAFE',
              }}
              placeholder="Email"
              placeholderTextColor="#B0B0C8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <TextInput
              style={{
                borderWidth: 1.5,
                borderColor: '#E8E8F0',
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 13,
                marginBottom: 16,
                color: '#1A1A2E',
                fontSize: 15,
                backgroundColor: '#FAFAFE',
              }}
              placeholder="Password"
              placeholderTextColor="#B0B0C8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />

            {login.isError && (
              <Text style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>
                {login.error instanceof Error ? login.error.message : 'Login gagal'}
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
                if (!email.trim() || !password) return
                login.mutate({ email: email.trim(), password })
              }}
              disabled={login.isPending}
              accessibilityLabel="Masuk"
            >
              {login.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>Masuk</Text>
              )}
            </TouchableOpacity>

            <Link href="/(auth)/register" asChild>
              <TouchableOpacity style={{ marginTop: 16, alignItems: 'center', paddingVertical: 8 }}>
                <Text style={{ color: '#6B6B8A', fontSize: 14 }}>
                  Belum punya akun?{' '}
                  <Text style={{ color: '#7C6FF1', fontWeight: '700' }}>Daftar</Text>
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
