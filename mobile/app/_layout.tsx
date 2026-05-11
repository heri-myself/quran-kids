import '../global.css'
import { useState } from 'react'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000, retry: 1 },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(child)" />
        <Stack.Screen name="(parent)" />
      </Stack>
    </QueryClientProvider>
  )
}
