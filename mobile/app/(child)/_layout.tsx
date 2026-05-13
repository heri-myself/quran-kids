import { Tabs, useRouter } from 'expo-router'
import { View, Platform, TouchableOpacity, StyleSheet } from 'react-native'
import { RIcon } from '../../components/RIcon'

function TabIcon({
  iconFill,
  iconLine,
  focused,
}: {
  iconFill: string
  iconLine: string
  focused: boolean
}) {
  return (
    <View style={[styles.tabIconContainer, focused && styles.tabIconContainerFocused]}>
      <RIcon
        name={(focused ? iconFill : iconLine) as any}
        size={22}
        color={focused ? '#7C6FF1' : '#B0B0C8'}
      />
    </View>
  )
}

function FloatingMicButton() {
  const router = useRouter()

  return (
    <TouchableOpacity
      onPress={() => router.push('/(child)/tilawah/')}
      activeOpacity={0.8}
      style={styles.floatingWrapper}
    >
      <View style={styles.floatingButton}>
        <RIcon name="mic-fill" size={24} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  tabIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconContainerFocused: {
    backgroundColor: 'rgba(124,111,241,0.12)',
  },
  floatingWrapper: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -36,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7C6FF1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5B4FD4',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
})

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
          shadowOpacity: 0.1,
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
        name="quran/index"
        options={{
          tabBarLabel: 'Al-Quran',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFill="quran-fill" iconLine="quran-line" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tilawah/index"
        options={{
          tabBarLabel: 'AI Tilawah',
          tabBarIcon: () => <FloatingMicButton />,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
            color: '#7C6FF1',
            marginTop: -4,
          },
        }}
      />
      <Tabs.Screen
        name="stories/index"
        options={{
          tabBarLabel: 'Kisah',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFill="story-fill" iconLine="story-line" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="akun"
        options={{
          tabBarLabel: 'Akun',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFill="user-fill" iconLine="user-line" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="rewards" options={{ href: null }} />
      <Tabs.Screen name="quran/[id]" options={{ href: null }} />
      <Tabs.Screen name="hadits/index" options={{ href: null }} />
      <Tabs.Screen name="hadits/[id]" options={{ href: null }} />
      <Tabs.Screen name="stories/[slug]" options={{ href: null }} />
      <Tabs.Screen name="tilawah/[id]" options={{ href: null }} />
      <Tabs.Screen name="tilawah/result" options={{ href: null }} />
      <Tabs.Screen name="kisah-nabi/index" options={{ href: null }} />
      <Tabs.Screen name="kisah-nabi/[id]" options={{ href: null }} />
    </Tabs>
  )
}
