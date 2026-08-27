import {
  NaverMapMarkerOverlay,
  NaverMapView,
} from '@mj-studio/react-native-naver-map';
import { StyleSheet, Text, View } from 'react-native';

import { MotionPressable } from '@/components/motion-pressable';

type MapCenter = {
  latitude: number;
  longitude: number;
  zoom: number;
};

const regionCenters: Record<string, MapCenter> = {
  전국: { latitude: 36.35, longitude: 127.8, zoom: 7 },
  서울: { latitude: 37.5665, longitude: 126.978, zoom: 12 },
  부산: { latitude: 35.1796, longitude: 129.0756, zoom: 12 },
  대구: { latitude: 35.8714, longitude: 128.6014, zoom: 12 },
  인천: { latitude: 37.4563, longitude: 126.7052, zoom: 11 },
  광주: { latitude: 35.1595, longitude: 126.8526, zoom: 12 },
  대전: { latitude: 36.3504, longitude: 127.3845, zoom: 12 },
  울산: { latitude: 35.5384, longitude: 129.3114, zoom: 11 },
  세종: { latitude: 36.48, longitude: 127.289, zoom: 12 },
  경기: { latitude: 37.275, longitude: 127.009, zoom: 10 },
  강원: { latitude: 37.8228, longitude: 128.1555, zoom: 9 },
  충북: { latitude: 36.6357, longitude: 127.4917, zoom: 10 },
  충남: { latitude: 36.6588, longitude: 126.6728, zoom: 10 },
  전북: { latitude: 35.8203, longitude: 127.1088, zoom: 10 },
  전남: { latitude: 34.8161, longitude: 126.463, zoom: 9 },
  경북: { latitude: 36.576, longitude: 128.5056, zoom: 9 },
  경남: { latitude: 35.2383, longitude: 128.6924, zoom: 9 },
  제주: { latitude: 33.4996, longitude: 126.5312, zoom: 10 },
};

const markerOffsets = [
  { latitude: 0, longitude: 0 },
  { latitude: 0.013, longitude: -0.019 },
  { latitude: -0.011, longitude: 0.018 },
  { latitude: 0.017, longitude: 0.021 },
  { latitude: -0.018, longitude: -0.014 },
] as const;

type HomeNaverMapPreviewProps = {
  locationLabel: string;
  onPress: () => void;
  region: string;
};

export function HomeNaverMapPreview({
  locationLabel,
  onPress,
  region,
}: HomeNaverMapPreviewProps) {
  const center = regionCenters[region] ?? regionCenters.전국;
  const spread = region === '전국' ? 2.2 : center.zoom < 11 ? 0.35 : 1;

  return (
    <MotionPressable
      accessibilityLabel={`${locationLabel} 장소를 네이버 지도에서 보기`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.container}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <NaverMapView
          camera={{
            latitude: center.latitude,
            longitude: center.longitude,
            zoom: center.zoom,
          }}
          isRotateGesturesEnabled={false}
          isScrollGesturesEnabled={false}
          isShowCompass={false}
          isShowIndoorLevelPicker={false}
          isShowLocationButton={false}
          isShowScaleBar={false}
          isShowZoomControls={false}
          isTiltGesturesEnabled={false}
          isUseTextureViewAndroid
          isZoomGesturesEnabled={false}
          locale="ko"
          logoAlign="BottomLeft"
          logoMargin={{ bottom: 5, left: 6 }}
          mapType="Basic"
          style={StyleSheet.absoluteFill}
        >
          {markerOffsets.map((offset, index) => (
            <NaverMapMarkerOverlay
              anchor={{ x: 0.5, y: 1 }}
              height={34}
              image={{ symbol: 'red' }}
              key={`${region}-${index}`}
              latitude={center.latitude + offset.latitude * spread}
              longitude={center.longitude + offset.longitude * spread}
              width={26}
            />
          ))}
        </NaverMapView>
      </View>
      <View style={styles.label}>
        <Text style={styles.labelTitle}>네이버 지도</Text>
        <Text numberOfLines={1} style={styles.labelSubtitle}>{locationLabel} 장소 보기</Text>
      </View>
      <View style={styles.openBadge}>
        <Text style={styles.openBadgeText}>↗</Text>
      </View>
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 116,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dfe2df',
    borderRadius: 9,
    backgroundColor: '#eef2ef',
  },
  label: {
    position: 'absolute',
    top: 8,
    left: 8,
    maxWidth: '70%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 9,
    paddingVertical: 6,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 7,
    elevation: 3,
  },
  labelTitle: { color: '#171717', fontSize: 10, fontWeight: '900' },
  labelSubtitle: { marginTop: 1, color: '#666666', fontSize: 8, fontWeight: '700' },
  openBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#03c75a',
  },
  openBadgeText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
});
