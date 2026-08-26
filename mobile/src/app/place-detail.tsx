import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MotionPressable } from '@/components/motion-pressable';
import { PlaceImage } from '@/components/place-image';
import { RouteMapChooser } from '@/components/route-map-chooser';
import { useSession } from '@/context/session-context';
import type { TourPlace } from '@/lib/api';
import { toggleSavedPlace } from '@/lib/place-library';

export default function PlaceDetailScreen() {
  const params = useLocalSearchParams<{
    id?: string; name?: string; category?: string; address?: string;
    latitude?: string; longitude?: string; imageUrl?: string;
    imageAttribution?: string; imageCopyrightCode?: string; imageModificationAllowed?: string;
    openingHoursText?: string; openingState?: string;
  }>();
  const { session } = useSession();
  const [saved, setSaved] = useState(false);

  const place = useMemo<TourPlace>(() => {
    const address = String(params.address ?? '');
    const addressParts = address.split(/\s+/);
    const openingState = params.openingState === 'open' || params.openingState === 'closed' ? params.openingState : 'unknown';
    return {
      id: String(params.id ?? ''),
      name: String(params.name ?? '장소 정보'),
      region: addressParts[0] || '전국',
      city: addressParts[1] || null,
      category: String(params.category ?? '장소'),
      address: address || null,
      latitude: Number(params.latitude ?? 0),
      longitude: Number(params.longitude ?? 0),
      imageUrl: params.imageUrl ? String(params.imageUrl) : null,
      imageThumbnailUrl: params.imageUrl ? String(params.imageUrl) : null,
      imageCopyrightCode: params.imageCopyrightCode === 'Type1' || params.imageCopyrightCode === 'Type3' ? params.imageCopyrightCode : null,
      imageLicenseLabel: null,
      imageAttribution: params.imageAttribution ? String(params.imageAttribution) : null,
      imageModificationAllowed: params.imageModificationAllowed === '1',
      imageLicenseUrl: null,
      imageSourceUrl: null,
      contentTypeId: '',
      openingState,
      openingHoursText: params.openingHoursText ? String(params.openingHoursText) : null,
      restDayText: null,
      breakTimeText: null,
      source: 'TOUR_API',
    };
  }, [params]);

  const savePlace = async () => {
    if (!session) {
      Alert.alert('로그인이 필요합니다', '장소를 저장하려면 로그인해 주세요.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => router.push('/login') },
      ]);
      return;
    }
    try {
      const next = await toggleSavedPlace(place);
      setSaved(next);
    } catch (error) {
      Alert.alert('저장 실패', error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.');
    }
  };

  const sharePlace = async () => {
    await Share.share({
      title: place.name,
      message: [place.name, place.category, place.address ?? '', '오늘어디에서 확인'].filter(Boolean).join('\n'),
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <MotionPressable accessibilityLabel="뒤로 가기" onPress={() => router.back()} style={styles.headerButton}><Text style={styles.headerButtonText}>‹</Text></MotionPressable>
          <Text style={styles.headerTitle}>장소 상세</Text>
          <MotionPressable accessibilityLabel="장소 공유" onPress={() => void sharePlace()} style={styles.headerButton}><Text style={styles.headerShare}>↗</Text></MotionPressable>
        </View>

        <View style={styles.heroImage}>
          <PlaceImage
            name={place.name}
            imageUrl={place.imageUrl}
            attribution={place.imageAttribution}
            copyrightCode={place.imageCopyrightCode}
            modificationAllowed={place.imageModificationAllowed}
          />
        </View>

        <View style={styles.summary}>
          <View style={styles.titleRow}>
            <View style={styles.titleCopy}>
              <Text style={styles.title}>{place.name}</Text>
              <Text style={styles.open}>{place.openingState === 'open' ? '영업 중' : place.category} · {place.openingHoursText ?? '운영시간 확인 필요'}</Text>
            </View>
            <MotionPressable accessibilityLabel={saved ? '찜 해제' : '찜하기'} onPress={() => void savePlace()} style={[styles.bookmark, saved && styles.bookmarkActive]}><Text style={[styles.bookmarkText, saved && styles.bookmarkTextActive]}>{saved ? '♥' : '♡'}</Text></MotionPressable>
          </View>
          <Text style={styles.address}>● {place.address ?? '주소 정보가 없습니다.'}</Text>
        </View>

        <View style={styles.tabs}>
          <Text style={[styles.tab, styles.tabActive]}>정보</Text>
          <Text style={styles.tab}>메뉴</Text>
          <Text style={styles.tab}>리뷰</Text>
          <Text style={styles.tab}>사진</Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}><Text style={styles.infoLabel}>대표 정보</Text><Text style={styles.infoValue}>{place.category}</Text></View>
          <View style={styles.infoCard}><Text style={styles.infoLabel}>영업시간</Text><Text style={styles.infoValue}>{place.openingHoursText ?? '공식 정보 확인 필요'}</Text></View>
          <View style={styles.infoCard}><Text style={styles.infoLabel}>편의정보</Text><Text style={styles.infoValue}>상세 정보에서 확인</Text></View>
        </View>

        <View style={styles.mapPreview}>
          <Text style={styles.mapLabel}>찾아가는 길</Text>
          <View style={styles.mapRoadOne} /><View style={styles.mapRoadTwo} />
          <View style={styles.pin}><Text style={styles.pinText}>●</Text></View>
        </View>

        <View style={styles.actions}>
          <RouteMapChooser place={place} />
          <MotionPressable onPress={() => void sharePlace()} style={styles.shareButton}><Text style={styles.shareButtonText}>공유</Text></MotionPressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingBottom: 28 },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  headerButtonText: { color: '#171717', fontSize: 34, lineHeight: 36 },
  headerShare: { color: '#171717', fontSize: 23, fontWeight: '900' },
  headerTitle: { color: '#171717', fontSize: 17, fontWeight: '900' },
  heroImage: { height: 205, overflow: 'hidden', backgroundColor: '#f0f0f0' },
  summary: { paddingHorizontal: 16, paddingTop: 13 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  titleCopy: { flex: 1 },
  title: { color: '#171717', fontSize: 23, fontWeight: '900', letterSpacing: -0.8 },
  category: { marginTop: 5, color: '#ff3b36', fontSize: 12, fontWeight: '900' },
  bookmark: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 18 },
  bookmarkActive: { borderColor: '#ff3b36', backgroundColor: '#ff3b36' },
  bookmarkText: { color: '#222222', fontSize: 22, fontWeight: '900' },
  bookmarkTextActive: { color: '#ffffff' },
  address: { marginTop: 10, color: '#5f5f5f', fontSize: 12, lineHeight: 18 },
  open: { marginTop: 7, color: '#12924e', fontSize: 12, fontWeight: '900' },
  tabs: { marginTop: 13, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e7e7e7', paddingHorizontal: 16 },
  tab: { flex: 1, paddingVertical: 13, color: '#7a7a7a', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#171717', color: '#171717' },
  infoGrid: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 15 },
  infoCard: { flex: 1, minHeight: 92, borderWidth: 1, borderColor: '#e7e7e7', borderRadius: 13, backgroundColor: '#fafafa', padding: 11 },
  infoLabel: { color: '#7a7a7a', fontSize: 10, fontWeight: '800' },
  infoValue: { marginTop: 8, color: '#242424', fontSize: 11, lineHeight: 16, fontWeight: '800' },
  mapPreview: { height: 120, marginHorizontal: 16, marginTop: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#dce2da', borderRadius: 14, backgroundColor: '#edf3e8' },
  mapLabel: { position: 'absolute', zIndex: 3, top: 11, left: 11, borderRadius: 9, backgroundColor: '#ffffff', color: '#171717', paddingHorizontal: 10, paddingVertical: 7, fontSize: 11, fontWeight: '900' },
  mapRoadOne: { position: 'absolute', width: 320, height: 14, top: 82, left: -20, borderRadius: 7, backgroundColor: '#ffffff', transform: [{ rotate: '-12deg' }] },
  mapRoadTwo: { position: 'absolute', width: 220, height: 14, top: 78, right: -60, borderRadius: 7, backgroundColor: '#ffffff', transform: [{ rotate: '55deg' }] },
  pin: { position: 'absolute', top: 61, left: '58%', width: 33, height: 33, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#ff3b36' },
  pinText: { color: '#ffffff', fontSize: 14 },
  actions: { gap: 8, paddingHorizontal: 16, paddingTop: 10 },
  shareButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 12, backgroundColor: '#ffffff' },
  shareButtonText: { color: '#171717', fontSize: 13, fontWeight: '900' },
});
