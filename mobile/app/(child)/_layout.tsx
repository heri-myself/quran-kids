import { Tabs } from 'expo-router'
import { View, Platform } from 'react-native'
import { RIcon } from '../../components/RIcon'

type RIconName = 'home-fill' | 'home-line' | 'book-fill' | 'book-line' | 'trophy-fill' | 'trophy-line' | 'quran-fill' | 'quran-line'

function TabIcon({ iconFill, iconLine, focused }: { iconFill: RIconName; iconLine: RIconName; focused: boolean }) {
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: focused ? '#EEF0FF' : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <RIcon name={focused ? iconFill : iconLine} size={22} color={focused ? '#7C6FF1' : '#B0B0C8'} />
    </View>
  )
}

export default function ChildLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#7C6FF1',
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#7C6FF1',
        tabBarInactiveTintColor: '#B0B0C8',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Beranda',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFill="home-fill" iconLine="home-line" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="stories/index"
        options={{
          tabBarLabel: 'Kisah',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFill="book-fill" iconLine="book-line" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="quran/index"
        options={{
          tabBarLabel: 'Al-Quran',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFill="quran-fill" iconLine="quran-line" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="quran/[id]" options={{ href: null }} />
      <Tabs.Screen
        name="rewards"
        options={{
          tabBarLabel: 'Hadiah',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFill="trophy-fill" iconLine="trophy-line" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="stories/[slug]" options={{ href: null }} />
    </Tabs>
  )
}
