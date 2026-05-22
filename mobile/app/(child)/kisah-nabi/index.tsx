import { useState } from 'react'
import { View, FlatList, TouchableOpacity, Image } from 'react-native'
import { Text } from '../../../components/Text'
import { useRouter } from 'expo-router'
import { useKisahNabiList, type KisahNabi } from '../../../hooks/use-kisah-nabi'

const PROPHET_EMOJIS: Record<string, string> = {
  Adam: '🌿', Idris: '⭐', Nuh: '⛵', Hud: '🌬️', Saleh: '🐪',
  Ibrahim: '🔥', Lut: '🏙️', Ismail: '🏹', Ishaq: '🌙', Yaqub: '🪄',
  Yusuf: '👑', Ayyub: '💪', Syuaib: '⚖️', Musa: '🪄', Harun: '📜',
  Dzulkifli: '🌟', Daud: '🎵', Sulaiman: '🦁', Ilyas: '⚡', Ilyasa: '💧',
  Yunus: '🐋', Zakaria: '🌸', Yahya: '🕊️', Isa: '✨', Muhammad: '🌙',
}

function NabiCard({ kisah, onPress }: { kisah: KisahNabi; onPress: () => void }) {
  const emoji = PROPHET_EMOJIS[kisah.prophet] ?? '☪️'
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        shadowColor: '#2D1B69',
        shadowOpacity: 0.07,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      {kisah.thumbnail ? (
        <Image
          source={{ uri: kisah.thumbnail }}
          style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: '#EEF0FF' }}
          resizeMode="cover"
        />
      ) : (
        <View style={{
          width: 56, height: 56, borderRadius: 12,
          backgroundColor: '#EEF0FF',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 28 }}>{emoji}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 9, color: '#7C6FF1', fontWeight: '700', letterSpacing: 0.5, marginBottom: 3 }}>
          NABI KE-{kisah.id}
        </Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 }}>
          {kisah.title}
        </Text>
        <Text numberOfLines={2} style={{ fontSize: 12, color: '#6B6B8A', lineHeight: 18 }}>
          {kisah.summary}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <View style={{ backgroundColor: '#EEF0FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 10, color: '#7C6FF1', fontWeight: '600' }}>
              ⏱ {kisah.readTime} menit
            </Text>
          </View>
        </View>
      </View>
      <Text style={{ color: '#B0B0C8', fontSize: 18 }}>›</Text>
    </TouchableOpacity>
  )
}

export default function KisahNabiListScreen() {
  const router = useRouter()
  const kisahList = useKisahNabiList()
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? kisahList.filter(
        (k) =>
          k.prophet.toLowerCase().includes(query.toLowerCase()) ||
          k.title.toLowerCase().includes(query.toLowerCase()),
      )
    : kisahList

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4FF' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#2D1B69',
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 20,
      }}>
        <Text style={{ color: '#BDB8FF', fontSize: 13, marginBottom: 4 }}>Al-Quran & Sunnah</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '800' }}>Kisah 25 Nabi 🕌</Text>
        <Text style={{ color: '#9990D8', fontSize: 13, marginTop: 2 }}>
          Pelajari kisah teladan para nabi
        </Text>

        {/* Search */}
        <View style={{
          backgroundColor: 'rgba(255,255,255,0.12)',
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          marginTop: 14,
          height: 40,
        }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', marginRight: 8 }}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cari nabi..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            style={{ flex: 1, color: '#FFFFFF', fontSize: 13 }}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#6B6B8A', paddingTop: 48, fontSize: 14 }}>
            Nabi tidak ditemukan.
          </Text>
        }
        renderItem={({ item }) => (
          <NabiCard
            kisah={item}
            onPress={() => router.push(`/(child)/kisah-nabi/${item.id}`)}
          />
        )}
      />
    </View>
  )
}
