import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useHaditsById } from '../../../hooks/use-hadits'

export default function HaditsDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const hadits = useHaditsById(Number(id))

  if (!hadits) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFBF0' }}>
        <Text style={{ color: '#92400E', fontSize: 14 }}>Hadits tidak ditemukan.</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFBF0' }}>
      <View style={{
        backgroundColor: '#F59E0B',
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 16,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 34, height: 34,
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 10,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>
              Detail Hadits
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
              Hadits #{hadits.id} · {hadits.kategori.charAt(0).toUpperCase() + hadits.kategori.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{
          backgroundColor: '#FEF3C7',
          borderRadius: 16,
          padding: 18,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: '#FDE68A',
        }}>
          <Text style={{
            fontSize: 26,
            fontFamily: 'ScheherazadeNew-Regular',
            color: '#1A1A2E',
            textAlign: 'right',
            lineHeight: 48,
            writingDirection: 'rtl',
          }}>
            {hadits.arabic}
          </Text>
        </View>

        <Text style={{
          fontSize: 15,
          color: '#44403C',
          lineHeight: 24,
          fontStyle: 'italic',
          marginBottom: 10,
        }}>
          "{hadits.indonesia}"
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 13 }}>📚 </Text>
          <Text style={{ fontSize: 13, color: '#92400E', fontWeight: '600' }}>
            {hadits.perawi}
          </Text>
        </View>

        <View style={{ height: 1, backgroundColor: '#FDE68A', marginBottom: 16 }} />

        <Text style={{ fontSize: 13, color: '#78716C', fontWeight: '600', marginBottom: 10 }}>
          💡 Pelajaran untuk Kita
        </Text>
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          borderLeftWidth: 4,
          borderLeftColor: '#F59E0B',
          padding: 14,
        }}>
          <Text style={{ fontSize: 13, color: '#44403C', lineHeight: 22 }}>
            {hadits.pelajaran}
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}
