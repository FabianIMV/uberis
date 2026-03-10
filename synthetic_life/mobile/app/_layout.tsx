import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'
import { COLORS } from '../constants/theme'

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar style="light" backgroundColor={COLORS.bg} />
      <Stack
        screenOptions={{
          headerStyle:      { backgroundColor: COLORS.bgCard },
          headerTintColor:  COLORS.text,
          headerTitleStyle: { color: COLORS.text, fontWeight: '700' },
          contentStyle:     { backgroundColor: COLORS.bg },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="entity/[id]"
          options={{ title: 'Entity', presentation: 'card' }}
        />
      </Stack>
    </View>
  )
}
