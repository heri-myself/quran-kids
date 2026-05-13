import { useState, useMemo } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useChapters } from '../../../hooks/use-quran'
import type { Chapter } from '../../../services/quran'

// SVG surah name imports — each imported as a React component
import S001 from '../../../assets/surah-names/001.svg'
import S002 from '../../../assets/surah-names/002.svg'
import S003 from '../../../assets/surah-names/003.svg'
import S004 from '../../../assets/surah-names/004.svg'
import S005 from '../../../assets/surah-names/005.svg'
import S006 from '../../../assets/surah-names/006.svg'
import S007 from '../../../assets/surah-names/007.svg'
import S008 from '../../../assets/surah-names/008.svg'
import S009 from '../../../assets/surah-names/009.svg'
import S010 from '../../../assets/surah-names/010.svg'
import S011 from '../../../assets/surah-names/011.svg'
import S012 from '../../../assets/surah-names/012.svg'
import S013 from '../../../assets/surah-names/013.svg'
import S014 from '../../../assets/surah-names/014.svg'
import S015 from '../../../assets/surah-names/015.svg'
import S016 from '../../../assets/surah-names/016.svg'
import S017 from '../../../assets/surah-names/017.svg'
import S018 from '../../../assets/surah-names/018.svg'
import S019 from '../../../assets/surah-names/019.svg'
import S020 from '../../../assets/surah-names/020.svg'
import S021 from '../../../assets/surah-names/021.svg'
import S022 from '../../../assets/surah-names/022.svg'
import S023 from '../../../assets/surah-names/023.svg'
import S024 from '../../../assets/surah-names/024.svg'
import S025 from '../../../assets/surah-names/025.svg'
import S026 from '../../../assets/surah-names/026.svg'
import S027 from '../../../assets/surah-names/027.svg'
import S028 from '../../../assets/surah-names/028.svg'
import S029 from '../../../assets/surah-names/029.svg'
import S030 from '../../../assets/surah-names/030.svg'
import S031 from '../../../assets/surah-names/031.svg'
import S032 from '../../../assets/surah-names/032.svg'
import S033 from '../../../assets/surah-names/033.svg'
import S034 from '../../../assets/surah-names/034.svg'
import S035 from '../../../assets/surah-names/035.svg'
import S036 from '../../../assets/surah-names/036.svg'
import S037 from '../../../assets/surah-names/037.svg'
import S038 from '../../../assets/surah-names/038.svg'
import S039 from '../../../assets/surah-names/039.svg'
import S040 from '../../../assets/surah-names/040.svg'
import S041 from '../../../assets/surah-names/041.svg'
import S042 from '../../../assets/surah-names/042.svg'
import S043 from '../../../assets/surah-names/043.svg'
import S044 from '../../../assets/surah-names/044.svg'
import S045 from '../../../assets/surah-names/045.svg'
import S046 from '../../../assets/surah-names/046.svg'
import S047 from '../../../assets/surah-names/047.svg'
import S048 from '../../../assets/surah-names/048.svg'
import S049 from '../../../assets/surah-names/049.svg'
import S050 from '../../../assets/surah-names/050.svg'
import S051 from '../../../assets/surah-names/051.svg'
import S052 from '../../../assets/surah-names/052.svg'
import S053 from '../../../assets/surah-names/053.svg'
import S054 from '../../../assets/surah-names/054.svg'
import S055 from '../../../assets/surah-names/055.svg'
import S056 from '../../../assets/surah-names/056.svg'
import S057 from '../../../assets/surah-names/057.svg'
import S058 from '../../../assets/surah-names/058.svg'
import S059 from '../../../assets/surah-names/059.svg'
import S060 from '../../../assets/surah-names/060.svg'
import S061 from '../../../assets/surah-names/061.svg'
import S062 from '../../../assets/surah-names/062.svg'
import S063 from '../../../assets/surah-names/063.svg'
import S064 from '../../../assets/surah-names/064.svg'
import S065 from '../../../assets/surah-names/065.svg'
import S066 from '../../../assets/surah-names/066.svg'
import S067 from '../../../assets/surah-names/067.svg'
import S068 from '../../../assets/surah-names/068.svg'
import S069 from '../../../assets/surah-names/069.svg'
import S070 from '../../../assets/surah-names/070.svg'
import S071 from '../../../assets/surah-names/071.svg'
import S072 from '../../../assets/surah-names/072.svg'
import S073 from '../../../assets/surah-names/073.svg'
import S074 from '../../../assets/surah-names/074.svg'
import S075 from '../../../assets/surah-names/075.svg'
import S076 from '../../../assets/surah-names/076.svg'
import S077 from '../../../assets/surah-names/077.svg'
import S078 from '../../../assets/surah-names/078.svg'
import S079 from '../../../assets/surah-names/079.svg'
import S080 from '../../../assets/surah-names/080.svg'
import S081 from '../../../assets/surah-names/081.svg'
import S082 from '../../../assets/surah-names/082.svg'
import S083 from '../../../assets/surah-names/083.svg'
import S084 from '../../../assets/surah-names/084.svg'
import S085 from '../../../assets/surah-names/085.svg'
import S086 from '../../../assets/surah-names/086.svg'
import S087 from '../../../assets/surah-names/087.svg'
import S088 from '../../../assets/surah-names/088.svg'
import S089 from '../../../assets/surah-names/089.svg'
import S090 from '../../../assets/surah-names/090.svg'
import S091 from '../../../assets/surah-names/091.svg'
import S092 from '../../../assets/surah-names/092.svg'
import S093 from '../../../assets/surah-names/093.svg'
import S094 from '../../../assets/surah-names/094.svg'
import S095 from '../../../assets/surah-names/095.svg'
import S096 from '../../../assets/surah-names/096.svg'
import S097 from '../../../assets/surah-names/097.svg'
import S098 from '../../../assets/surah-names/098.svg'
import S099 from '../../../assets/surah-names/099.svg'
import S100 from '../../../assets/surah-names/100.svg'
import S101 from '../../../assets/surah-names/101.svg'
import S102 from '../../../assets/surah-names/102.svg'
import S103 from '../../../assets/surah-names/103.svg'
import S104 from '../../../assets/surah-names/104.svg'
import S105 from '../../../assets/surah-names/105.svg'
import S106 from '../../../assets/surah-names/106.svg'
import S107 from '../../../assets/surah-names/107.svg'
import S108 from '../../../assets/surah-names/108.svg'
import S109 from '../../../assets/surah-names/109.svg'
import S110 from '../../../assets/surah-names/110.svg'
import S111 from '../../../assets/surah-names/111.svg'
import S112 from '../../../assets/surah-names/112.svg'
import S113 from '../../../assets/surah-names/113.svg'
import S114 from '../../../assets/surah-names/114.svg'

type SvgComponent = React.FC<{ width?: number; height?: number }>

const SURAH_SVG: Record<number, SvgComponent> = {
  1: S001, 2: S002, 3: S003, 4: S004, 5: S005, 6: S006, 7: S007, 8: S008, 9: S009, 10: S010,
  11: S011, 12: S012, 13: S013, 14: S014, 15: S015, 16: S016, 17: S017, 18: S018, 19: S019, 20: S020,
  21: S021, 22: S022, 23: S023, 24: S024, 25: S025, 26: S026, 27: S027, 28: S028, 29: S029, 30: S030,
  31: S031, 32: S032, 33: S033, 34: S034, 35: S035, 36: S036, 37: S037, 38: S038, 39: S039, 40: S040,
  41: S041, 42: S042, 43: S043, 44: S044, 45: S045, 46: S046, 47: S047, 48: S048, 49: S049, 50: S050,
  51: S051, 52: S052, 53: S053, 54: S054, 55: S055, 56: S056, 57: S057, 58: S058, 59: S059, 60: S060,
  61: S061, 62: S062, 63: S063, 64: S064, 65: S065, 66: S066, 67: S067, 68: S068, 69: S069, 70: S070,
  71: S071, 72: S072, 73: S073, 74: S074, 75: S075, 76: S076, 77: S077, 78: S078, 79: S079, 80: S080,
  81: S081, 82: S082, 83: S083, 84: S084, 85: S085, 86: S086, 87: S087, 88: S088, 89: S089, 90: S090,
  91: S091, 92: S092, 93: S093, 94: S094, 95: S095, 96: S096, 97: S097, 98: S098, 99: S099, 100: S100,
  101: S101, 102: S102, 103: S103, 104: S104, 105: S105, 106: S106, 107: S107, 108: S108, 109: S109, 110: S110,
  111: S111, 112: S112, 113: S113, 114: S114,
}

function revelationLabel(place: string) {
  return place === 'makkah' ? 'Makkiyyah' : 'Madaniyyah'
}

function SurahRow({ chapter, onPress }: { chapter: Chapter; onPress: () => void }) {
  const SurahNameSvg = SURAH_SVG[chapter.id]
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 12, paddingHorizontal: 20,
        borderBottomWidth: 1, borderBottomColor: '#EEEEFF',
        backgroundColor: '#FFFFFF',
      }}
    >
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        borderWidth: 1.5, borderColor: '#7C6FF1',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#7C6FF1' }}>
          {chapter.id}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#7C6FF1' }}>
          {chapter.name_simple}
        </Text>
        <Text style={{ fontSize: 11, color: '#B0B0C8', marginTop: 2 }}>
          {chapter.translated_name.name} · {chapter.verses_count} Ayat · {revelationLabel(chapter.revelation_place)}
        </Text>
      </View>
      {SurahNameSvg ? (
        <SurahNameSvg width={72} height={28} />
      ) : (
        <Text style={{ fontSize: 20, color: '#5B52D4', fontFamily: 'ScheherazadeNew-Regular' }}>
          {chapter.name_arabic}
        </Text>
      )}
    </TouchableOpacity>
  )
}

export default function QuranIndexScreen() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const { data: chapters = [], isLoading, isError } = useChapters()

  const filtered = useMemo(() => {
    if (!search.trim()) return chapters
    const q = search.toLowerCase()
    return chapters.filter(c =>
      c.name_simple.toLowerCase().includes(q) ||
      c.translated_name.name.toLowerCase().includes(q),
    )
  }, [chapters, search])

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4FF' }}>
      <View style={{
        backgroundColor: '#7C6FF1',
        paddingHorizontal: 24,
        paddingTop: 56,
        paddingBottom: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
      }}>
        <Text style={{ color: '#D4D0FF', fontSize: 13, marginBottom: 4 }}>Kitab Suci</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '800' }}>Al-Quran 📖</Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 }}>
        <View style={{
          backgroundColor: '#FFFFFF', borderRadius: 12,
          borderWidth: 1, borderColor: '#E0DFFF',
          paddingHorizontal: 14, paddingVertical: 10,
          flexDirection: 'row', alignItems: 'center', gap: 8,
        }}>
          <Text style={{ fontSize: 16 }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Cari nama surah..."
            placeholderTextColor="#B0B0C8"
            style={{ flex: 1, fontSize: 14, color: '#1A1A2E' }}
          />
        </View>
      </View>

      {isLoading && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#7C6FF1" size="large" />
        </View>
      )}
      {isError && (
        <Text style={{ textAlign: 'center', color: '#EF4444', padding: 32 }}>
          Gagal memuat daftar surah. Periksa koneksi internet.
        </Text>
      )}
      {!isLoading && !isError && (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <SurahRow
              chapter={item}
              onPress={() => router.push(`/(child)/quran/${item.id}`)}
            />
          )}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}
