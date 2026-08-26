import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MotionPressable } from '@/components/motion-pressable';
import { PlaceImage } from '@/components/place-image';
import { RouteMapChooser } from '@/components/route-map-chooser';
import { useSession } from '@/context/session-context';
import type { TourPlace } from '@/lib/api';
import { openRouteMap } from '@/lib/map-links';
import { toggleSavedPlace } from '@/lib/place-library';

export default function PlaceDetailScreen() {
  const params = useLocalSearchParams<{
    id?: string; name?: string; category?: string; address?: string; phone?: string;
    latitude?: string; longitude?: string; imageUrl?: string;
    imageAttribution?: string; imageCopyrightCode?: string; imageModificationAllowed?: string;
    openingHoursText?: string; openingState?: string;
  }>();
  const { session } = useSession();
  const [saved, setSaved] = useState(false);

  const place = useMemo<TourPlace>(() => {
    const address = String(params.address ?? '');
    const addressParts = address.split(/\s+/);
    const openingState = params.openingState === 'open' || params.openingState === 'closed'
      ? params.openingState
      : 'unknown';
    return {
      id: String(params.id ?? ''),
      name: String(params.name ?? '장소 정보'),
      region: addressParts[0] || '전국',
      city: addressParts[1] || null,
      category: String(params.category ?? '장소'),
      address: address || null,
      phone: params.phone ? String(params.phone) : null,
      latitude: Number(params.latitude ?? 0),
      longitude: Number(params.longitude ?? 0),
      imageUrl: params.imageUrl ? String(params.imageUrl) : null,
      imageThumbnailUrl: params.imageUrl ? String(params.imageUrl) : null,
      imageCopyrightCode: params.imageCopyrightCode === 'Type1' || params.imageCopyrightCode === 'Type3'
        ? params.imageCopyrightCode
        : null,
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

  const callPlace = async () => {
    const phone = place.phone?.trim();
    if (!phone) {
      Alert.alert('전화번호 정보 없음', '공공데이터에 등록된 매장 전화번호가 없습니다.');
      return;
    }
    await Linking.openURL('tel:' + phone.replace(/[^0-9+]/g, ''));
  };

  const sharePlace = async () => {
    await Share.share({
      title: place.name,
      message: [
        place.name,
        place.category,
        place.address ?? '',
        place.phone ? '전화 ' + place.phone : '',
        '오늘어디에서 확인',
      ].filter(Boolean).join('\n'),
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <MotionPressable accessibilityLabel="뒤로 가기" onPress={() => router.back()} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>‹</Text>
          </MotionPressable>
          <Text style={styles.headerTitle}>장소 상세</Text>
          <MotionPressable accessibilityLabel="장소 공유" onPress={() => void sharePlace()} style={styles.headerButton}>
            <Text style={styles.headerShare}>↗</Text>
          </MotionPressable>
        </View>

        <View style={styles.heroImage}>
          {!place.imageUrl ? <View style={styles.heroFallback}><Text style={styles.heroFallbackIcon}>🍽️</Text></View> : null}
          <PlaceImage
            name={place.name}
            imageUrl={place.imageUrl}
            attribution={place.imageAttribution}
            copyrightCode={place.imageCopyrightCode}
            modificationAllowed={place.imageModificationAllowed}
            height={205}
            borderRadius={0}
          />
        </View>

        <View style={styles.summary}>
          <View style={styles.titleRow}>
            <View style={styles.titleCopy}>
              <Text style={styles.title}>{place.name}</Text>
              <Text style={styles.open}>
                {place.openingState === 'open' ? '영업 중' : place.category}
                <Text style={styles.hours}> · {place.openingHoursText ?? '운영시간 확인 필요'}</Text>
              </Text>
            </View>
            <MotionPressable
              accessibilityLabel={saved ? '저장 해제' : '저장'}
              onPress={() => void savePlace()}
              style={[styles.bookmark, saved && styles.bookmarkActive]}
            >
              <Text style={[styles.bookmarkText, saved && styles.bookmarkTextActive]}>{saved ? '♥' : '♡'}</Text>
            </MotionPressable>
          </View>
          <Text style={styles.address}>● {place.address ?? '주소 정보가 없습니다.'}</Text>
          <Text style={styles.phoneLine}>☎ {place.phone || '공공데이터 전화번호 없음'}</Text>
        </View>

        <View style={styles.tabs}>
          <Text style={[styles.tab, styles.tabActive]}>정보</Text>
          <Text style={styles.tab}>메뉴</Text>
          <Text style={styles.tab}>리뷰</Text>
          <Text style={styles.tab}>사진</Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>대표 정보</Text>
            <Text style={styles.infoIcon}>🍲</Text>
            <Text numberOfLines={2} style={styles.infoValue}>{place.category}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>영업시간</Text>
            <Text style={styles.infoIcon}>◷</Text>
            <Text numberOfLines={3} style={styles.infoValue}>{place.openingHoursText ?? '공식 정보 확인 필요'}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>편의정보</Text>
            <Text style={styles.infoIcon}>⌂</Text>
            <Text numberOfLines={3} style={styles.infoValue}>상세 정보에서 확인</Text>
          </View>
        </View>

        <View style={styles.mapPreview}>
          <Text style={styles.mapLabel}>찾아가는 길</Text>
          <View style={styles.mapRoadOne} />
          <View style={styles.mapRoadTwo} />
          <View style={styles.mapRoadThree} />
          <View style={styles.pin}><Text style={styles.pinText}>●</Text></View>
        </View>

        <View style={styles.quickActions}>
          <MotionPressable
            accessibilityLabel="네이버 길찾기"
            onPress={() => void openRouteMap('naver', place)}
            style={styles.quickAction}
          >
            <Text style={[styles.quickIcon, styles.quickIconRed]}>➤</Text>
            <Text style={styles.quickText}>길찾기</Text>
          </MotionPressable>
          <MotionPressable accessibilityLabel="전화" onPress={() => void callPlace()} style={styles.quickAction}>
            <Text style={styles.quickIcon}>☎</Text>
            <Text style={styles.quickText}>전화</Text>
          </MotionPressable>
          <MotionPressable accessibilityLabel={saved ? '저장 해제' : '저장'} onPress={() => void savePlace()} style={styles.quickAction}>
            <Text style={[styles.quickIcon, saved && styles.quickIconRed]}>{saved ? '♥' : '♡'}</Text>
            <Text style={styles.quickText}>저장</Text>
          </MotionPressable>
          <MotionPressable accessibilityLabel="공유" onPress={() => void sharePlace()} style={styles.quickAction}>
            <Text style={styles.quickIcon}>↗</Text>
            <Text style={styles.quickText}>공유</Text>
          </MotionPressable>
        </View>

        <View style={styles.primaryAction}>
          <RouteMapChooser place={place} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingBottom: 24 },
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  headerButtonText: { color: '#171717', fontSize: 32, lineHeight: 34 },
  headerShare: { color: '#171717', fontSize: 21, fontWeight: '900' },
  headerTitle: { color: '#171717', fontSize: 17, fontWeight: '900' },
  heroImage: { height: 205, overflow: 'hidden', backgroundColor: '#ece7df' },
  heroFallback: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e5d6c4' },
  heroFallbackIcon: { fontSize: 62 },
  summary: { paddingHorizontal: 15, paddingTop: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  titleCopy: { flex: 1 },
  title: { color: '#171717', fontSize: 23, fontWeight: '900', letterSpacing: -0.7 },
  open: { marginTop: 5, color: '#21a251', fontSize: 11, fontWeight: '900' },
  hours: { color: '#404040', fontWeight: '700' },
  bookmark: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dedede', borderRadius: 19 },
  bookmarkActive: { borderColor: '#ff3b36', backgroundColor: '#ff3b36' },
  bookmarkText: { color: '#222222', fontSize: 20, fontWeight: '900' },
  bookmarkTextActive: { color: '#ffffff' },
  address: { marginTop: 8, color: '#5f5f5f', fontSize: 11, lineHeight: 17 },
  phoneLine: { marginTop: 4, color: '#5f5f5f', fontSize: 10, lineHeight: 16 },
  tabs: { marginTop: 12, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e6e6e6', paddingHorizontal: 14 },
  tab: { flex: 1, paddingVertical: 12, color: '#777777', fontSize: 11, fontWeight: '800', textAlign: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#171717', color: '#171717' },
  infoGrid: { flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingTop: 12 },
  infoCard: { flex: 1, minHeight: 105, borderWidth: 1, borderColor: '#e7e7e7', borderRadius: 9, backgroundColor: '#ffffff', padding: 9 },
  infoLabel: { color: '#5f5f5f', fontSize: 9, fontWeight: '900' },
  infoIcon: { marginTop: 8, fontSize: 20 },
  infoValue: { marginTop: 5, color: '#242424', fontSize: 9, lineHeight: 13, fontWeight: '800' },
  mapPreview: { height: 112, marginHorizontal: 14, marginTop: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#dfe4dc', borderRadius: 9, backgroundColor: '#edf3e8' },
  mapLabel: { position: 'absolute', zIndex: 3, top: 9, left: 9, borderRadius: 7, backgroundColor: '#ffffff', color: '#171717', paddingHorizontal: 9, paddingVertical: 6, fontSize: 9, fontWeight: '900' },
  mapRoadOne: { position: 'absolute', width: 320, height: 11, top: 73, left: -20, borderRadius: 6, backgroundColor: '#ffffff', transform: [{ rotate: '-12deg' }] },
  mapRoadTwo: { position: 'absolute', width: 230, height: 11, top: 61, right: -55, borderRadius: 6, backgroundColor: '#ffffff', transform: [{ rotate: '55deg' }] },
  mapRoadThree: { position: 'absolute', width: 210, height: 7, top: 30, left: 30, borderRadius: 4, backgroundColor: '#ffffff', transform: [{ rotate: '11deg' }] },
  pin: { position: 'absolute', top: 49, left: '58%', width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#ff3b36' },
  pinText: { color: '#ffffff', fontSize: 12 },
  quickActions: { marginHorizontal: 14, marginTop: 8, flexDirection: 'row', borderWidth: 1, borderColor: '#e4e4e4', borderRadius: 9, backgroundColor: '#ffffff' },
  quickAction: { flex: 1, minHeight: 55, alignItems: 'center', justifyContent: 'center', gap: 3, borderRightWidth: 1, borderRightColor: '#eeeeee' },
  quickIcon: { color: '#222222', fontSize: 17, fontWeight: '900' },
  quickIconRed: { color: '#ff3b36' },
  quickText: { color: '#2a2a2a', fontSize: 9, fontWeight: '900' },
  primaryAction: { paddingHorizontal: 14, paddingTop: 8 },
});
