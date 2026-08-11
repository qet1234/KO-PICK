import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { MotionPressable } from '@/components/motion-pressable';
import {
  getPreferredMap,
  type MapProvider,
  openRouteMap,
  type RoutablePlace,
  setPreferredMap,
} from '@/lib/map-links';
import { trackMobileOperation } from '@/lib/operations';
import { isMobileFeatureEnabled } from '@/lib/service-status';

export function RouteMapChooser({ place }: { place: RoutablePlace }) {
  const [visible, setVisible] = useState(false);
  const [remember, setRemember] = useState(true);
  const [preferredMap, setPreferredMapState] = useState<MapProvider | null>(null);

  useEffect(() => {
    void getPreferredMap().then(setPreferredMapState);
  }, []);

  const start = async () => {
    if (!isMobileFeatureEnabled('navigation')) {
      Alert.alert('기능 점검 중', '지도·길찾기 기능을 잠시 중지했습니다.');
      return;
    }
    if (preferredMap) {
      void trackMobileOperation({ eventType: 'directions_open', feature: 'navigation', placeId: String(place.id), placeName: place.name, route: '/explore', metadata: { provider: preferredMap } });
      await openRouteMap(preferredMap, place);
      return;
    }
    setVisible(true);
  };

  const choose = async (provider: MapProvider) => {
    setVisible(false);
    if (remember) {
      await setPreferredMap(provider);
      setPreferredMapState(provider);
    }
    void trackMobileOperation({ eventType: 'directions_open', feature: 'navigation', placeId: String(place.id), placeName: place.name, route: '/explore', metadata: { provider } });
    await openRouteMap(provider, place);
  };

  const reset = async () => {
    await setPreferredMap(null);
    setPreferredMapState(null);
    setVisible(true);
  };

  return (
    <>
      <MotionPressable accessibilityRole="button" onPress={() => void start()} style={styles.routeButton}>
        <Text style={styles.routeButtonText}>길찾기</Text>
      </MotionPressable>
      {preferredMap ? (
        <MotionPressable accessibilityRole="button" onPress={() => void reset()}>
          <Text style={styles.resetText}>
            {preferredMap === 'naver' ? '네이버지도' : '카카오맵'} 자동 열기 변경
          </Text>
        </MotionPressable>
      ) : null}

      <Modal animationType="slide" transparent visible={visible} onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.sheetTitle}>어떤 지도로 길찾을까요?</Text>
            <Text style={styles.sheetSubtitle}>{place.name}</Text>
            <MotionPressable style={[styles.providerButton, styles.naver]} onPress={() => void choose('naver')}>
              <Text style={styles.providerText}>N  네이버지도</Text>
            </MotionPressable>
            <MotionPressable style={[styles.providerButton, styles.kakao]} onPress={() => void choose('kakao')}>
              <Text style={[styles.providerText, styles.kakaoText]}>●  카카오맵</Text>
            </MotionPressable>
            <View style={styles.rememberRow}>
              <View style={styles.rememberCopy}>
                <Text style={styles.rememberTitle}>다음부터 선택한 지도로 바로 열기</Text>
                <Text style={styles.rememberDescription}>계정이 아닌 이 기기에만 저장됩니다.</Text>
              </View>
              <Switch value={remember} onValueChange={setRemember} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  routeButton: {
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#ff3b36',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  routeButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  resetText: { marginTop: 8, color: '#71716d', fontSize: 11, textAlign: 'center' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(9, 20, 14, 0.42)' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#ffffff',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 34,
  },
  sheetTitle: { color: '#101010', fontSize: 21, fontWeight: '900' },
  sheetSubtitle: { marginTop: 5, marginBottom: 18, color: '#71716d', fontSize: 14 },
  providerButton: { marginTop: 10, alignItems: 'center', borderRadius: 15, paddingVertical: 16 },
  naver: { backgroundColor: '#03c75a' },
  kakao: { backgroundColor: '#fee500' },
  providerText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  kakaoText: { color: '#191919' },
  rememberRow: { marginTop: 20, flexDirection: 'row', alignItems: 'center' },
  rememberCopy: { flex: 1, paddingRight: 12 },
  rememberTitle: { color: '#101010', fontSize: 14, fontWeight: '800' },
  rememberDescription: { marginTop: 3, color: '#71716d', fontSize: 12 },
});
