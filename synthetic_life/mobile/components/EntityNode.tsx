import { useEffect, useRef } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { emotionColor } from '../constants/theme'
import type { Entity } from '../hooks/useEntities'

interface Props {
  entity: Entity
  isSelected: boolean
  onPress: () => void
  size?: number
}

export default function EntityNode({ entity, isSelected, onPress, size = 36 }: Props) {
  const pulse = useRef(new Animated.Value(1)).current
  const glow  = useRef(new Animated.Value(0.6)).current
  const color = emotionColor(entity.emotional_state?.emotion)

  useEffect(() => {
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0,  duration: 1800, useNativeDriver: true }),
      ])
    )
    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1.0, duration: 2200, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.5, duration: 2200, useNativeDriver: true }),
      ])
    )
    pulseAnim.start()
    glowAnim.start()
    return () => { pulseAnim.stop(); glowAnim.stop() }
  }, [pulse, glow])

  const nodeSize = size + (entity.energy ?? 0) * 0.08  // slight size from energy

  return (
    <Pressable onPress={onPress} style={styles.wrapper}>
      {/* Outer glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            width: nodeSize + 16,
            height: nodeSize + 16,
            borderRadius: (nodeSize + 16) / 2,
            borderColor: color,
            opacity: glow,
          },
          isSelected && { borderWidth: 2, borderColor: '#ffffff' },
        ]}
      />
      {/* Core node */}
      <Animated.View
        style={[
          styles.node,
          {
            width: nodeSize,
            height: nodeSize,
            borderRadius: nodeSize / 2,
            backgroundColor: color,
            transform: [{ scale: pulse }],
            shadowColor: color,
            shadowOpacity: 0.9,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 0 },
          },
          isSelected && { borderWidth: 2, borderColor: '#ffffff' },
        ]}
      />
      {/* Name label */}
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {entity.name}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    margin: 8,
  },
  glowRing: {
    position: 'absolute',
    borderWidth: 1,
  },
  node: {
    elevation: 8,
  },
  label: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
    maxWidth: 64,
    textAlign: 'center',
  },
})
