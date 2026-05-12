import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import { useSubscription, useCreateCheckout } from '../../hooks/use-subscription'
import { RIcon } from '../../components/RIcon'

const PLANS = [
  {
    plan: 'monthly' as const,
    label: 'Bulanan',
    price: 'Rp 29.000',
    period: '/bulan',
    highlight: false,
    features: ['Akses semua kisah', 'Mode offline', 'Tanpa iklan'],
  },
  {
    plan: 'yearly' as const,
    label: 'Tahunan',
    price: 'Rp 249.000',
    period: '/tahun',
    highlight: true,
    saving: 'Hemat 30%',
    features: ['Akses semua kisah', 'Mode offline', 'Tanpa iklan', 'Konten eksklusif'],
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
    <View style={{ flex: 1, backgroundColor: '#F4F4FF' }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: '#7C6FF1',
          paddingHorizontal: 24,
          paddingTop: 56,
          paddingBottom: 28,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RIcon name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View>
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>
            Langganan Premium ✨
          </Text>
          <Text style={{ color: '#BDB8FF', fontSize: 13, marginTop: 2 }}>
            Akses semua kisah tanpa batas
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 24, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {isActive ? (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 24,
              alignItems: 'center',
              shadowColor: '#7C6FF1',
              shadowOpacity: 0.08,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 3 },
              elevation: 3,
            }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: '#E8F5E9',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <RIcon name="check-line" size={30} color="#388E3C" />
            </View>
            <Text style={{ fontWeight: '800', color: '#1A1A2E', fontSize: 20, marginBottom: 6 }}>
              Premium Aktif
            </Text>
            <Text style={{ color: '#6B6B8A', fontSize: 14 }}>
              Berlaku hingga {subscription?.expiresAt?.split('T')[0]}
            </Text>
          </View>
        ) : (
          <>
            <Text style={{ fontWeight: '700', color: '#1A1A2E', fontSize: 17 }}>Pilih Paket</Text>
            {PLANS.map((p) => (
              <TouchableOpacity
                key={p.plan}
                onPress={() => handleSubscribe(p.plan)}
                disabled={checkout.isPending}
                style={{
                  borderRadius: 20,
                  padding: 20,
                  backgroundColor: p.highlight ? '#7C6FF1' : '#FFFFFF',
                  shadowColor: p.highlight ? '#7C6FF1' : '#000',
                  shadowOpacity: p.highlight ? 0.3 : 0.06,
                  shadowRadius: p.highlight ? 14 : 8,
                  shadowOffset: { width: 0, height: p.highlight ? 6 : 2 },
                  elevation: p.highlight ? 8 : 2,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <View>
                    <Text style={{ fontWeight: '800', fontSize: 18, color: p.highlight ? '#FFFFFF' : '#1A1A2E' }}>
                      {p.label}
                    </Text>
                    {p.saving && (
                      <View
                        style={{
                          backgroundColor: '#FFD166',
                          alignSelf: 'flex-start',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 20,
                          marginTop: 4,
                        }}
                      >
                        <Text style={{ color: '#1A1A2E', fontSize: 11, fontWeight: '700' }}>
                          {p.saving}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: p.highlight ? '#FFFFFF' : '#1A1A2E' }}>
                      {p.price}
                    </Text>
                    <Text style={{ fontSize: 12, color: p.highlight ? '#BDB8FF' : '#6B6B8A' }}>
                      {p.period}
                    </Text>
                  </View>
                </View>

                <View style={{ gap: 6 }}>
                  {p.features.map((f) => (
                    <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <RIcon name="check-line" size={14} color={p.highlight ? '#BDB8FF' : '#7C6FF1'} />
                      <Text style={{ fontSize: 13, color: p.highlight ? '#D4D0FF' : '#6B6B8A' }}>{f}</Text>
                    </View>
                  ))}
                </View>

                {checkout.isPending && (
                  <ActivityIndicator color={p.highlight ? 'white' : '#7C6FF1'} style={{ marginTop: 12 }} />
                )}
              </TouchableOpacity>
            ))}

            <Text style={{ fontSize: 12, color: '#B0B0C8', textAlign: 'center', marginTop: 4 }}>
              Pembayaran via Midtrans · QRIS · Transfer Bank · E-Wallet
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  )
}
