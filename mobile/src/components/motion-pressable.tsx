import { useState, useSyncExternalStore } from 'react';
import type { ComponentProps } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const NativeAnimatedPressable = Animated.createAnimatedComponent(Pressable);

let reduceMotionEnabled = false;
let reduceMotionSubscription: { remove: () => void } | null = null;
const reduceMotionListeners = new Set<() => void>();

function updateReduceMotion(enabled: boolean) {
  if (reduceMotionEnabled === enabled) return;
  reduceMotionEnabled = enabled;
  reduceMotionListeners.forEach((listener) => listener());
}

function subscribeToReduceMotion(listener: () => void) {
  reduceMotionListeners.add(listener);
  if (!reduceMotionSubscription) {
    void AccessibilityInfo.isReduceMotionEnabled().then(updateReduceMotion);
    reduceMotionSubscription = AccessibilityInfo.addEventListener('reduceMotionChanged', updateReduceMotion);
  }
  return () => {
    reduceMotionListeners.delete(listener);
    if (reduceMotionListeners.size === 0) {
      reduceMotionSubscription?.remove();
      reduceMotionSubscription = null;
    }
  };
}

function getReduceMotionSnapshot() {
  return reduceMotionEnabled;
}

type NativePressableProps = ComponentProps<typeof Pressable>;

type MotionPressableProps = NativePressableProps & {
  pressedOpacity?: number;
  pressedScale?: number;
};

export function MotionPressable({
  disabled,
  onPressIn,
  onPressOut,
  pressedOpacity = 0.88,
  pressedScale = 0.96,
  style,
  ...props
}: MotionPressableProps) {
  const [progress] = useState(() => new Animated.Value(0));
  const reduceMotion = useSyncExternalStore(
    subscribeToReduceMotion,
    getReduceMotionSnapshot,
    getReduceMotionSnapshot,
  );

  const animate = (pressed: boolean) => {
    if (disabled || reduceMotion) {
      progress.setValue(0);
      return;
    }
    Animated.spring(progress, {
      toValue: pressed ? 1 : 0,
      damping: pressed ? 18 : 12,
      stiffness: pressed ? 420 : 300,
      mass: 0.45,
      useNativeDriver: true,
    }).start();
  };

  const motionStyle: StyleProp<ViewStyle> = {
    opacity: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [1, pressedOpacity],
    }),
    transform: [{
      scale: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, pressedScale],
      }),
    }],
  };

  const resolveStyle = (state: PressableStateCallbackType): StyleProp<ViewStyle> => [
    typeof style === 'function' ? style(state) : style,
    motionStyle,
  ];

  return (
    <NativeAnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        onPressIn?.(event);
        animate(true);
      }}
      onPressOut={(event) => {
        onPressOut?.(event);
        animate(false);
      }}
      style={resolveStyle}
    />
  );
}
