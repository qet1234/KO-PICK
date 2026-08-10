import { Tabs } from 'expo-router';
import type { BottomTabBarButtonProps } from 'expo-router/build/layouts/Tabs';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function AnimatedTabButton({ onPressIn, onPressOut, style, ...props }: BottomTabBarButtonProps) {
  const [scale] = useState(() => new Animated.Value(1));
  const [translateY] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);
  const animate = (pressed: boolean) => {
    if (reduceMotion) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: pressed ? 0.9 : 1, damping: 10, stiffness: 260, mass: 0.45, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: pressed ? 2 : 0, damping: 10, stiffness: 280, mass: 0.45, useNativeDriver: true }),
    ]).start();
  };
  return <AnimatedPressable {...props} onPressIn={(event) => { onPressIn?.(event); animate(true); }} onPressOut={(event) => { onPressOut?.(event); animate(false); }}
    style={[style, styles.tabButton, { transform: [{ scale }, { translateY }] }]} />;
}

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return <Text maxFontSizeMultiplier={1.1} style={{ color: focused ? '#146b45' : '#879089', fontSize: 17, fontWeight: '900' }}>{label}</Text>;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 360;
  return <Tabs screenOptions={{
    headerShown: false, tabBarHideOnKeyboard: true, tabBarActiveTintColor: '#146b45', tabBarInactiveTintColor: '#879089',
    tabBarLabelStyle: { fontSize: compact ? 9 : 10, fontWeight: '800', marginBottom: 1 },
    tabBarActiveBackgroundColor: '#e9f7ef', tabBarItemStyle: { marginHorizontal: compact ? 1 : 3, marginVertical: 4, borderRadius: 14 },
    tabBarStyle: { height: 60 + insets.bottom, paddingHorizontal: compact ? 2 : 5, paddingTop: 3, paddingBottom: Math.max(insets.bottom, 6), borderTopColor: '#e2e8e4' },
    tabBarButton: (props) => <AnimatedTabButton {...props} />,
  }}>
    <Tabs.Screen name="index" options={{ title: '홈', tabBarIcon: ({ focused }) => <TabIcon label="K" focused={focused} /> }} />
    <Tabs.Screen name="explore" options={{ title: '장소 찾기', tabBarIcon: ({ focused }) => <TabIcon label="⌖" focused={focused} /> }} />
    <Tabs.Screen name="office" options={{ title: '직장인 식사', tabBarIcon: ({ focused }) => <TabIcon label="식" focused={focused} /> }} />
    <Tabs.Screen name="account" options={{ title: '내 계정', tabBarIcon: ({ focused }) => <TabIcon label="●" focused={focused} /> }} />
  </Tabs>;
}

const styles = StyleSheet.create({ tabButton: { minHeight: 48, borderRadius: 14 } });
