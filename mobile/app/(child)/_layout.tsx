import { Tabs } from 'expo-router'
import { View, Platform, StyleSheet } from 'react-native'
import { RIcon } from '../../components/RIcon'

const INACTIVE = '#94A3B8'
const BG = '#FFFFFF'

function TabIcon({
  iconFill,
  iconLine,
  focused,
  color,
}: {
  iconFill: string
  iconLine: string
  focused: boolean
  color: string
}) {
  return (
    <View style={styles.iconWrap}>
      <RIcon
        name={(focused ? iconFill : iconLine) as any}
        size={22}
        color={focused ? color : INACTIVE}
      />
    </View>
  )
}

export default function ChildLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: BG,
          borderTopWidth: 1,
          borderTopColor: '#F1F5F9',
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
          elevation: 16,
        },
        tabBarActiveTintColor: '#6C5CE7',
        tabBarInactiveTintColor: INACTIVE,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Beranda',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFill="home-fill" iconLine="home-line" focused={focused} color="#6C5CE7" />
          ),
        }}
      />
      <Tabs.Screen
        name="tilawah/index"
        options={{
          tabBarLabel: 'Tilawah',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFill="mic-fill" iconLine="mic-line" focused={focused} color="#FF6B35" />
          ),
          tabBarActiveTintColor: '#FF6B35',
        }}
      />
      <Tabs.Screen
        name="hafalan/index"
        options={{
          tabBarLabel: 'Hafalan',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFill="book-2-fill" iconLine="book-2-line" focused={focused} color="#8B5CF6" />
          ),
          tabBarActiveTintColor: '#8B5CF6',
        }}
      />
      <Tabs.Screen
        name="membaca/index"
        options={{
          tabBarLabel: 'Membaca',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFill="book-open-fill" iconLine="book-open-line" focused={focused} color="#059669" />
          ),
          tabBarActiveTintColor: '#059669',
        }}
      />
      <Tabs.Screen
        name="akun"
        options={{
          tabBarLabel: 'Akun',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFill="user-fill" iconLine="user-line" focused={focused} color="#6C5CE7" />
          ),
        }}
      />

      {/* Hidden screens */}
      <Tabs.Screen name="journey" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="quran/index" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="quran/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="stories/index" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="stories/[slug]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="rewards" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="tilawah/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="tilawah/result" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="kisah-nabi/index" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="kisah-nabi/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="hafalan/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="hafalan/result" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="hafalan/continuous/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="hijaiyah/index" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="hijaiyah/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
