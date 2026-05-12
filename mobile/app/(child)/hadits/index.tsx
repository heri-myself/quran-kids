import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { useHadits, type KategoriHadits, type Hadits } from '../../../hooks/use-hadits'

const KATEGORI_CHIPS: { value: KategoriHadits; label: string }[] = [
  { value: 'semua', label: 'Semua' },
  { value: 'akhlaq', label: 'Akhlaq' },
  { value: 'ibadah', label: 'Ibadah' },
  { value: 'keluarga', label: 'Keluarga' },
  { value: 'ilmu', label: 'Ilmu' },
  { value: 'doa', label: 'Doa' },
]

function HaditsCard({ hadits, onPress }: { hadits: Hadits; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#FDE68A',
        padding: 14,
        marginBottom: 10,
      }}
    >
      <Text style={{ fontSize: 9, color: '#F59E0B', fontWeight: '700', marginBottom: 5, letterSpacing: 0.5 }}>
        HADITS #{hadits.id} · {hadits.kategori.toUpperCase()}
      </Text>
      <Text
        numberOfLines={3}
        style={{ fontSize: 13, color: '#1A1A2E', lineHeight: 20, marginBottom: 8 }}
      >
        {hadits.indonesia}
      </Text>
      <View style={{
        backgroundColor: '#FEF3C7', borderRadius: 6,
        paddingHorizontal: 8, paddingVertical: 3,
        alignSelf: 'flex-start',
      }}>
        <Text style={{ fontSize: 10, color: '#92400E', fontWeight: '600' }}>
          {hadits.perawi}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

export default function HaditsListScreen() {
  const router = useRouter()
  const [kategori, setKategori] = useState<KategoriHadits>('semua')
  const [query, setQuery] = useState('')
  const hadits = useHadits(kategori, query)

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFBF0' }}>
      <View style={{
        backgroundColor: '#F59E0B',
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 20,
      }}>
        <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800' }}>Hadits 📜</Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 3 }}>
          {hadits.length} hadits pilihan
        </Text>
        <View style={{
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          marginTop: 14,
          height: 40,
        }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', marginRight: 8 }}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cari hadits..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            style={{ flex: 1, color: '#FFFFFF', fontSize: 13 }}
          />
        </View>
      </View>

      <View style={{
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
        flexWrap: 'wrap',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#FEF3C7',
      }}>
        {KATEGORI_CHIPS.map(chip => (
          <TouchableOpacity
            key={chip.value}
            onPress={() => setKategori(chip.value)}
            style={{
              backgroundColor: kategori === chip.value ? '#F59E0B' : '#FEF3C7',
              borderWidth: 1.5,
              borderColor: kategori === chip.value ? '#F59E0B' : '#FDE68A',
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 6,
            }}
          >
            <Text style={{
              fontSize: 12,
              fontWeight: '600',
              color: kategori === chip.value ? '#FFFFFF' : '#92400E',
            }}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={hadits}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#92400E', paddingTop: 48, fontSize: 14 }}>
            Tidak ada hadits ditemukan.
          </Text>
        }
        renderItem={({ item }) => (
          <HaditsCard
            hadits={item}
            onPress={() => router.push(`/(child)/hadits/${item.id}`)}
          />
        )}
      />
    </View>
  )
}
