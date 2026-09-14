import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Layout uses the current app window in dp, not the panel's physical pixels.
// It also works when a Fold is rotated or the app enters split-screen mode.
export function useAdaptiveLayout() {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const contentWidth = Math.max(0, width - insets.left - insets.right);
  const contentHeight = Math.max(0, height - insets.top - insets.bottom);
  // A wide phone in landscape still has a short viewport.
  const compactHeight = contentHeight < 480;
  const expanded = Platform.OS === 'android' && contentWidth >= 600 && !compactHeight;

  return {
    expanded,
    stackCards: contentWidth < 360 || fontScale > 1.3,
    mapHeight: compactHeight ? Math.min(205, Math.round(contentHeight * 0.5)) : expanded ? Math.min(480, Math.round(contentWidth * 0.45)) : 205,
    previewMapHeight: compactHeight ? Math.min(116, Math.round(contentHeight * 0.35)) : expanded ? Math.min(300, Math.round(contentWidth * 0.28)) : 116,
    featureCardHeight: expanded ? Math.min(320, Math.round(contentWidth * 0.32)) : 145,
  };
}
