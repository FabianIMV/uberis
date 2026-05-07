import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../../constants/theme'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#020b18ee',
          borderTopColor: '#0e2040',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor:   '#22d3ee',
        tabBarInactiveTintColor: '#334155',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
        headerStyle:      { backgroundColor: COLORS.bgCard, shadowColor: 'transparent' },
        headerTintColor:  COLORS.text,
        headerTitleStyle: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mundo',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="earth-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="entities"
        options={{
          title: 'Almas',
          headerTitle: 'Almas vivas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Crónicas',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Datos',
          headerTitle: 'Estado del mundo',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
