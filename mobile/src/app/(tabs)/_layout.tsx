import { Tabs } from 'expo-router';
import type { BottomTabBarButtonProps } from 'expo-router/build/layouts/Tabs';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const colors = {
  home: '#ff3b36',
  search: '#1677e8',
  saved: '#f43f72',
  savedHeart: '#ff5b6e',
  office: '#173a5e',
  officeAccent: '#ff9a1f',
  account: '#7c5ce7',
} as const;

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
      Animated.spring(scale, { toValue: pressed ? 0.91 : 1, damping: 10, stiffness: 260, mass: 0.45, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: pressed ? 2 : 0, damping: 10, stiffness: 280, mass: 0.45, useNativeDriver: true }),
    ]).start();
  };
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => { onPressIn?.(event); animate(true); }}
      onPressOut={(event) => { onPressOut?.(event); animate(false); }}
      style={[style, styles.tabButton, { transform: [{ scale }, { translateY }] }]}
    />
  );
}

function TextTabIcon({ label, color, size = 21 }: { label: string; color: string; size?: number }) {
  return <Text accessibilityElementsHidden maxFontSizeMultiplier={1} style={[styles.tabIconText, { color, fontSize: size }]}>{label}</Text>;
}

function SavedIcon() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.savedIcon}>
      <Text maxFontSizeMultiplier={1} style={styles.savedHeart}>♥</Text>
      <View style={styles.savedNotch} />
    </View>
  );
}

function OfficeDiningIcon() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.officeIcon}>
      <View style={styles.officeHandle} />
      <View style={styles.officeBag}>
        <View style={styles.forkIcon}>
          <View style={styles.forkTines}>
            <View style={styles.utensilTine} />
            <View style={styles.utensilTine} />
            <View style={styles.utensilTine} />
          </View>
          <View style={styles.utensilStem} />
        </View>
        <View style={styles.spoonIcon}>
          <View style={styles.spoonHead} />
          <View style={styles.utensilStem} />
        </View>
      </View>
    </View>
  );
}

function AccountIcon() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.accountIcon}>
      <View style={[styles.accountHead, { borderColor: colors.account }]} />
      <View style={[styles.accountShoulders, { borderColor: colors.account }]} />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 360;
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarHideOnKeyboard: true,
      tabBarActiveTintColor: colors.home,
      tabBarInactiveTintColor: '#252525',
      tabBarLabelStyle: { fontSize: compact ? 8 : 9, lineHeight: 11, fontWeight: '800', marginBottom: 2, textAlign: 'center' },
      tabBarIconStyle: { height: 23, marginTop: 3, alignItems: 'center', justifyContent: 'center' },
      tabBarActiveBackgroundColor: 'transparent',
      tabBarItemStyle: { marginHorizontal: compact ? 0 : 1, borderRadius: 10 },
      tabBarStyle: {
        height: 58 + insets.bottom,
        paddingHorizontal: compact ? 1 : 3,
        paddingTop: 3,
        paddingBottom: Math.max(insets.bottom, 4),
        borderTopWidth: 1,
        borderTopColor: '#e6e6e6',
        backgroundColor: '#ffffff',
        elevation: 0,
        shadowOpacity: 0,
      },
      tabBarButton: (props) => <AnimatedTabButton {...props} />,
    }}>
      <Tabs.Screen name="index" options={{ title: '홈', tabBarIcon: () => <TextTabIcon color={colors.home} label="⌂" /> }} />
      <Tabs.Screen name="explore" options={{ title: '장소 찾기', tabBarIcon: () => <TextTabIcon color={colors.search} label="⌕" /> }} />
      <Tabs.Screen name="saved" options={{ title: '저장', tabBarIcon: () => <SavedIcon /> }} />
      <Tabs.Screen name="office" options={{ title: '직장인 식사', tabBarIcon: () => <OfficeDiningIcon /> }} />
      <Tabs.Screen name="account" options={{ title: '내 계정', tabBarIcon: () => <AccountIcon /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabButton: { minHeight: 48, borderRadius: 10 },
  tabIconText: { minWidth: 24, lineHeight: 23, fontWeight: '900', textAlign: 'center' },
  savedIcon: { width: 17, height: 21, alignItems: 'center', borderWidth: 1.8, borderColor: colors.saved, borderRadius: 2, backgroundColor: '#ffffff' },
  savedHeart: { marginTop: 2, color: colors.savedHeart, fontSize: 8, lineHeight: 10, fontWeight: '900' },
  savedNotch: { position: 'absolute', left: 4, bottom: -4, width: 7, height: 7, borderTopWidth: 1.8, borderLeftWidth: 1.8, borderColor: colors.saved, backgroundColor: '#ffffff', transform: [{ rotate: '45deg' }] },
  officeIcon: { width: 25, height: 23, alignItems: 'center' },
  officeHandle: { width: 10, height: 5, borderWidth: 1.8, borderBottomWidth: 0, borderColor: colors.office, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  officeBag: { width: 24, height: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, borderWidth: 1.8, borderColor: colors.office, borderRadius: 4, backgroundColor: '#ffffff' },
  forkIcon: { width: 5, height: 12, alignItems: 'center' },
  forkTines: { height: 4, flexDirection: 'row', gap: 0.6 },
  utensilTine: { width: 0.8, height: 4, borderRadius: 1, backgroundColor: colors.officeAccent },
  utensilStem: { width: 1.2, flex: 1, borderRadius: 1, backgroundColor: colors.officeAccent },
  spoonIcon: { width: 5, height: 12, alignItems: 'center' },
  spoonHead: { width: 4, height: 5, borderRadius: 3, backgroundColor: colors.officeAccent },
  accountIcon: { width: 24, height: 23, alignItems: 'center', justifyContent: 'center' },
  accountHead: { width: 8, height: 8, borderWidth: 1.8, borderRadius: 4, marginBottom: 2 },
  accountShoulders: { width: 18, height: 9, borderWidth: 1.8, borderBottomWidth: 0, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
});
