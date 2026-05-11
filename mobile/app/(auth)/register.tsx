import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { Link } from 'expo-router'
import { useRegister } from '../../hooks/use-auth'

export default function RegisterScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const register = useRegister()

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-amber-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6 py-12">
          <View className="items-center mb-10">
            <Text className="text-5xl">📖</Text>
            <Text className="text-3xl font-bold text-emerald-700 mt-2">Quran Kids</Text>
          </View>

          <View className="bg-white rounded-2xl p-6 shadow-sm">
            <Text className="text-xl font-bold text-slate-800 mb-4">Daftar Akun</Text>

            <TextInput
              className="border border-slate-200 rounded-xl px-4 py-3 mb-3 text-slate-800 text-base"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <TextInput
              className="border border-slate-200 rounded-xl px-4 py-3 mb-4 text-slate-800 text-base"
              placeholder="Password (min. 8 karakter)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />

            {register.isError && (
              <Text className="text-red-500 text-sm mb-3">
                {register.error instanceof Error ? register.error.message : 'Pendaftaran gagal'}
              </Text>
            )}

            <TouchableOpacity
              className="bg-emerald-500 rounded-xl py-4 items-center"
              onPress={() => {
                if (!email.trim() || password.length < 8) return
                register.mutate({ email: email.trim(), password })
              }}
              disabled={register.isPending}
              accessibilityLabel="Daftar"
            >
              {register.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Daftar</Text>
              )}
            </TouchableOpacity>

            <Link href="/(auth)/login" asChild>
              <TouchableOpacity className="mt-4 items-center py-2">
                <Text className="text-slate-500">
                  Sudah punya akun?{' '}
                  <Text className="text-emerald-600 font-semibold">Masuk</Text>
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
