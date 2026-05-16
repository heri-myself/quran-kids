import { Tabs, useRouter } from 'expo-router'
import { View, Platform, TouchableOpacity, StyleSheet } from 'react-native'
import { RIcon } from '../../components/RIcon'

const PRIMARY = '#6C5CE7'
const ORANGE = '#FF6B35'
const INACTIVE = '#B2BEC3'
const NAV_BG = '#FFFFFF'

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
        color={focused ? ORANGE : INACTIVE}
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
        <RIcon name="mic-fill" size={26} color="#FFFFFF" />
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
    backgroundColor: 'transparent',
  },
  floatingWrapper: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -44,
  },
  floatingButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: ORANGE,
    shadowOpacity: 0.65,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
})

export default function ChildLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: NAV_BG,
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          shadowColor: 'rgba(45,52,54,1)',
          shadowOpacity: 0.18,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -8 },
          elevation: 20,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 10,
          position: 'absolute',
        },
        tabBarActiveTintColor: ORANGE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2, color: undefined },
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
          tabBarLabel: 'Tilawah',
          tabBarIcon: () => <FloatingMicButton />,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
            color: ORANGE,
            marginTop: 0,
            letterSpacing: 0.2,
          },
        }}
      />
      <Tabs.Screen name="journey" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen
        name="hafalan/index"
        options={{
          tabBarLabel: 'Hafalan',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFill="quran-fill" iconLine="quran-line" focused={focused} />
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
      <Tabs.Screen name="stories/index" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="rewards" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="quran/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="stories/[slug]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="tilawah/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="tilawah/result" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="kisah-nabi/index" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="kisah-nabi/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="hafalan/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="hafalan/result" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="hafalan/continuous/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  )
}
