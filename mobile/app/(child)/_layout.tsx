import { Tabs } from 'expo-router'
import { Text } from 'react-native'

export default function ChildLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: 'white', borderTopColor: '#e2e8f0' },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Beranda',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? '🏠' : '🏡'}</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="stories/index"
        options={{
          tabBarLabel: 'Kisah',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? '📖' : '📗'}</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          tabBarLabel: 'Hadiah',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? '🏆' : '🎖️'}</Text>
          ),
        }}
      />
      <Tabs.Screen name="stories/[slug]" options={{ href: null }} />
    </Tabs>
  )
}
