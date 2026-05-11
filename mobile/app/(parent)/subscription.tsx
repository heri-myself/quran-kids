import { View, Text, TouchableOpacity, ActivityIndicator, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import { useSubscription, useCreateCheckout } from '../../hooks/use-subscription'

const PLANS = [
  {
    plan: 'monthly' as const,
    label: 'Bulanan',
    price: 'Rp 29.000',
    period: '/bulan',
    highlight: false,
  },
  {
    plan: 'yearly' as const,
    label: 'Tahunan',
    price: 'Rp 249.000',
    period: '/tahun',
    highlight: true,
    saving: 'Hemat 30%',
  },
]

export default function SubscriptionScreen() {
  const router = useRouter()
  const { data: subscription } = useSubscription()
  const checkout = useCreateCheckout()

  const isActive = subscription?.status === 'active'

  async function handleSubscribe(plan: 'monthly' | 'yearly') {
    try {
      const { redirectUrl } = await checkout.mutateAsync(plan)
      await Linking.openURL(redirectUrl)
    } catch (e) {
      console.error('Checkout error:', e)
    }
  }

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-violet-700 px-6 pt-14 pb-8 flex-row items-center gap-3 rounded-b-3xl">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-white text-xl">←</Text>
        </TouchableOpacity>
        <View>
          <Text className="text-white text-xl font-bold">Langganan Premium</Text>
          <Text className="text-violet-200 text-sm">Akses semua kisah tanpa batas</Text>
        </View>
      </View>

      <View className="px-4 gap-4 mt-6">
        {isActive ? (
          <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 items-center">
            <Text className="text-3xl mb-2">✅</Text>
            <Text className="font-bold text-emerald-700 text-lg">Premium Aktif</Text>
            <Text className="text-slate-500 text-sm mt-1">
              Berlaku hingga {subscription?.expiresAt.split('T')[0]}
            </Text>
          </View>
        ) : (
          <>
            <Text className="font-bold text-slate-800 text-lg">Pilih Paket</Text>
            {PLANS.map((p) => (
              <TouchableOpacity
                key={p.plan}
                onPress={() => handleSubscribe(p.plan)}
                disabled={checkout.isPending}
                className={`rounded-2xl p-5 ${
                  p.highlight
                    ? 'bg-violet-600 shadow-lg'
                    : 'bg-white border border-slate-200'
                }`}
              >
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className={`font-bold text-lg ${p.highlight ? 'text-white' : 'text-slate-800'}`}>
                      {p.label}
                    </Text>
                    {p.saving && (
                      <View className="bg-amber-400 self-start px-2 py-0.5 rounded-full mt-1">
                        <Text className="text-white text-xs font-bold">{p.saving}</Text>
                      </View>
                    )}
                  </View>
                  <View className="items-end">
                    <Text className={`text-2xl font-bold ${p.highlight ? 'text-white' : 'text-slate-800'}`}>
                      {p.price}
                    </Text>
                    <Text className={`text-sm ${p.highlight ? 'text-violet-200' : 'text-slate-400'}`}>
                      {p.period}
                    </Text>
                  </View>
                </View>
                {checkout.isPending && (
                  <ActivityIndicator color={p.highlight ? 'white' : '#7c3aed'} className="mt-2" />
                )}
              </TouchableOpacity>
            ))}

            <Text className="text-xs text-slate-400 text-center">
              Pembayaran via Midtrans · QRIS · Transfer Bank · E-Wallet
            </Text>
          </>
        )}
      </View>
    </View>
  )
}
