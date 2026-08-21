import { Tabs } from 'expo-router';
import type { BottomTabBarButtonProps } from 'expo-router/build/layouts/Tabs';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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

function TabIcon({ label, focused, size = 18 }: { label: string; focused: boolean; size?: number }) {
  return (
    <Text
      maxFontSizeMultiplier={1}
      style={[styles.tabIconText, { color: focused ? '#ff3b36' : '#71716d', fontSize: size }]}
    >
      {label}
    </Text>
  );
}

function AccountIcon({ focused }: { focused: boolean }) {
  const color = focused ? '#ff3b36' : '#71716d';
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.accountIcon}>
      <View style={[styles.accountHead, { backgroundColor: color }]} />
      <View style={[styles.accountShoulders, { borderColor: color }]} />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 360;
  return <Tabs screenOptions={{
    headerShown: false, tabBarHideOnKeyboard: true, tabBarActiveTintColor: '#ff3b36', tabBarInactiveTintColor: '#71716d',
    tabBarLabelStyle: { fontSize: compact ? 9 : 10, lineHeight: 13, fontWeight: '800', marginBottom: 2, textAlign: 'center' },
    tabBarIconStyle: { height: 25, marginTop: 4, alignItems: 'center', justifyContent: 'center' },
    tabBarActiveBackgroundColor: 'transparent', tabBarItemStyle: { marginHorizontal: compact ? 0 : 2, marginVertical: 2, borderRadius: 12 },
    tabBarStyle: { height: 66 + insets.bottom, paddingHorizontal: compact ? 1 : 4, paddingTop: 4, paddingBottom: Math.max(insets.bottom, 6), borderTopColor: '#e8e8e8', backgroundColor: '#ffffff' },
    tabBarButton: (props) => <AnimatedTabButton {...props} />,
  }}>
    <Tabs.Screen name="index" options={{ title: '홈', tabBarIcon: ({ focused }) => <TabIcon label="⌂" focused={focused} size={21} /> }} />
    <Tabs.Screen name="explore" options={{ title: '장소 찾기', tabBarIcon: ({ focused }) => <TabIcon label="⌕" focused={focused} size={21} /> }} />
    <Tabs.Screen name="saved" options={{ title: '저장', tabBarIcon: ({ focused }) => <TabIcon label={focused ? '♥' : '♡'} focused={focused} size={21} /> }} />
    <Tabs.Screen name="office" options={{ title: '직장인 식사', tabBarIcon: ({ focused }) => <TabIcon label="▣" focused={focused} size={19} /> }} />
    <Tabs.Screen name="account" options={{ title: '내 계정', tabBarIcon: ({ focused }) => <AccountIcon focused={focused} /> }} />
  </Tabs>;
}

const styles = StyleSheet.create({
  tabButton: { minHeight: 50, borderRadius: 14 },
  tabIconText: { minWidth: 24, lineHeight: 24, fontWeight: '900', textAlign: 'center' },
  accountIcon: { width: 26, height: 25, alignItems: 'center', justifyContent: 'center' },
  accountHead: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  accountShoulders: { width: 20, height: 10, borderWidth: 2.2, borderBottomWidth: 0, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
});
