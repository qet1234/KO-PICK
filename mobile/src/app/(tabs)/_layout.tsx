import { Tabs } from 'expo-router';
import type { BottomTabBarButtonProps } from 'expo-router/build/layouts/Tabs';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text } from 'react-native';

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

  const pressIn: NonNullable<BottomTabBarButtonProps['onPressIn']> = (event) => {
    onPressIn?.(event);
    if (reduceMotion) return;

    scale.stopAnimation();
    translateY.stopAnimation();
    Animated.parallel([
      Animated.timing(scale, { toValue: 0.88, duration: 90, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 2, duration: 90, useNativeDriver: true }),
    ]).start();
  };

  const pressOut: NonNullable<BottomTabBarButtonProps['onPressOut']> = (event) => {
    onPressOut?.(event);
    if (reduceMotion) return;

    scale.stopAnimation();
    translateY.stopAnimation();
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        damping: 8,
        stiffness: 260,
        mass: 0.45,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        damping: 9,
        stiffness: 280,
        mass: 0.45,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <AnimatedPressable
      {...props}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={[style, styles.tabButton, { transform: [{ scale }, { translateY }] }]}
    />
  );
}

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ color: focused ? '#146b45' : '#879089', fontSize: 18, fontWeight: '900' }}>
      {label}
    </Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#146b45',
        tabBarInactiveTintColor: '#879089',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '800' },
        tabBarActiveBackgroundColor: '#e9f7ef',
        tabBarItemStyle: { marginHorizontal: 4, marginVertical: 5, borderRadius: 15 },
        tabBarStyle: { height: 68, paddingHorizontal: 5, paddingTop: 2, paddingBottom: 4 },
        tabBarButton: (props) => <AnimatedTabButton {...props} />,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '추천',
          tabBarIcon: ({ focused }) => <TabIcon label="K" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '장소 찾기',
          tabBarIcon: ({ focused }) => <TabIcon label="⌖" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="office"
        options={{
          title: '직장인 식사',
          tabBarIcon: ({ focused }) => <TabIcon label="식" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: '내 계정',
          tabBarIcon: ({ focused }) => <TabIcon label="●" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    borderRadius: 15,
  },
});
