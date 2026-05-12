import { Tabs, useRouter } from 'expo-router'
import { View, Text, Platform, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import { useEffect } from 'react'
import { RIcon } from '../../components/RIcon'

type RIconName = 'home-fill' | 'home-line' | 'book-fill' | 'book-line' | 'trophy-fill' | 'trophy-line' | 'quran-fill' | 'quran-line'

function TabIcon({ iconFill, iconLine, focused }: { iconFill: RIconName; iconLine: RIconName; focused: boolean }) {
  return (
    <View style={[styles.tabIconContainer, focused && styles.tabIconContainerFocused]}>
      <RIcon name={focused ? iconFill : iconLine} size={22} color={focused ? '#7C6FF1' : '#B0B0C8'} />
    </View>
  )
}

function FloatingMicButton() {
  const router = useRouter()
  const pulse = useSharedValue(1)

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 800, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.in(Easing.ease) })
      ),
      -1,
      false
    )
  }, [])

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 2 - pulse.value,
  }))

  return (
    <TouchableOpacity
      onPress={() => router.push('/(child)/tilawah/')}
      activeOpacity={0.85}
      style={styles.floatingWrapper}
    >
      <Animated.View style={[styles.pulseRing, pulseStyle]} />
      <View style={styles.floatingButton}>
        <Text style={{ fontSize: 22 }}>🎙️</Text>
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
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  tabIconContainerFocused: {
    backgroundColor: '#EEF0FF',
  },
  floatingWrapper: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  pulseRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#9B5DE5',
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7C6FF1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C6FF1',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
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
        name="tilawah/index"
        options={{
          tabBarLabel: 'AI Tilawah',
          tabBarIcon: () => <FloatingMicButton />,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '700', color: '#7C6FF1', marginTop: -4 },
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
        name="rewards"
        options={{
          tabBarLabel: 'Hadiah',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFill="trophy-fill" iconLine="trophy-line" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="quran/[id]" options={{ href: null }} />
      <Tabs.Screen name="hadits/index" options={{ href: null }} />
      <Tabs.Screen name="hadits/[id]" options={{ href: null }} />
      <Tabs.Screen name="stories/[slug]" options={{ href: null }} />
      <Tabs.Screen name="tilawah/[id]" options={{ href: null }} />
      <Tabs.Screen name="tilawah/result" options={{ href: null }} />
    </Tabs>
  )
}
