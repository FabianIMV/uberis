import React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.cyan,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: [styles.tabBar, { height: 58 + bottomPad, paddingBottom: bottomPad }],
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mundo',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'planet' : 'planet-outline'}
              size={21}
              color={focused ? COLORS.cyan : COLORS.textMuted}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="entities"
        options={{
          title: 'Seres',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'sparkles' : 'sparkles-outline'}
              size={20}
              color={focused ? COLORS.cyan : COLORS.textMuted}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="feed"
        options={{
          title: 'Crónicas',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'book' : 'book-outline'}
              size={20}
              color={focused ? COLORS.cyan : COLORS.textMuted}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="stats"
        options={{
          title: 'Evolución',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'stats-chart' : 'stats-chart-outline'}
              size={20}
              color={focused ? COLORS.cyan : COLORS.textMuted}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#050B18',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.25,
  },
});
