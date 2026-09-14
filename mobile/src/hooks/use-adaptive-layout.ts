import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Layout uses the current app window in dp, not the panel's physical pixels.
// It also works when a Fold is rotated or the app enters split-screen mode.
export function useAdaptiveLayout() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const contentWidth = Math.max(0, width - insets.left - insets.right);
  const expanded = Platform.OS === 'android' && contentWidth >= 600;

  return {
    expanded,
    mapHeight: expanded ? Math.min(480, Math.round(contentWidth * 0.45)) : 205,
    previewMapHeight: expanded ? Math.min(300, Math.round(contentWidth * 0.28)) : 116,
    featureCardHeight: expanded ? Math.min(320, Math.round(contentWidth * 0.32)) : 145,
  };
}
