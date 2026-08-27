import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MotionPressable } from '@/components/motion-pressable';
import { appConfig } from '@/lib/config';
import { koreaRegionDistricts } from '@/lib/korea-regions';
import courseSettingImage from '../../../assets/images/course-setting-3d.png';

const homeRegions = ['전국', ...Object.keys(koreaRegionDistricts)];
const relationships = [
  { label: '혼자', icon: '♙' },
  { label: '커플', icon: '♥' },
  { label: '친구', icon: '♟' },
  { label: '가족', icon: '⌂' },
] as const;
const categories = [
  { label: '맛집', icon: '🍴', category: '맛집', color: '#ff2f2f' },
  { label: '카페', icon: '☕', category: '카페', color: '#7a3f16' },
  { label: '관광지', icon: '▣', category: '관광지', color: '#1167c6' },
  { label: '축제', icon: '✣', category: '축제', color: '#f18c16' },
] as const;

function resolveHomeLocation(input: string, selectedRegion: string, selectedDistrict: string, selectedLocality: string) {
  let remaining = input.trim();
  let region = selectedRegion;
  let district = selectedDistrict;
  let locality = selectedLocality;
  const matchedRegion = homeRegions
    .filter((item) => item !== '전국')
    .find((item) => remaining.replace(/\s+/g, '').includes(item.replace(/\s+/g, '')));
  if (matchedRegion) {
    region = matchedRegion;
    district = '전체';
    locality = '';
    remaining = remaining.replace(matchedRegion, ' ');
  }
  const districtPool = region === '전국'
    ? Object.entries(koreaRegionDistricts).flatMap(([regionName, districts]) => districts.map((districtName) => ({ regionName, districtName })))
    : (koreaRegionDistricts[region] ?? []).map((districtName) => ({ regionName: region, districtName }));
  const matches = districtPool.filter(({ districtName }) => remaining.replace(/\s+/g, '').includes(districtName.replace(/\s+/g, '')));
  const matchedDistrict = matches.length > 0 && new Set(matches.map((item) => item.regionName)).size === 1 ? matches[0] : null;
  if (matchedDistrict) {
    region = matchedDistrict.regionName;
    district = matchedDistrict.districtName;
    locality = '';
    remaining = remaining.replace(matchedDistrict.districtName, ' ');
  }
  const localityToken = remaining.split(/\s+/).find((token) => /[읍면동리]$/.test(token));
  if (localityToken) {
    locality = localityToken;
    remaining = remaining.replace(localityToken, ' ');
  }
  return {
    region,
    district,
    locality,
    query: remaining.replace(/\s+/g, ' ').trim().replace(/^(맛집|음식점|장소)$/, ''),
  };
}

function displayRegion(region: string) {
  const labels: Record<string, string> = {
    서울: '서울특별시', 부산: '부산광역시', 대구: '대구광역시', 인천: '인천광역시',
    광주: '광주광역시', 대전: '대전광역시', 울산: '울산광역시', 세종: '세종특별자치시',
    경기: '경기도', 강원: '강원특별자치도', 충북: '충청북도', 충남: '충청남도',
    전북: '전북특별자치도', 전남: '전라남도', 경북: '경상북도', 경남: '경상남도', 제주: '제주특별자치도',
  };
  return labels[region] ?? region;
}

export default function HomeScreen() {
  const [region] = useState('서울');
  const [district] = useState('전체');
  const [locality] = useState('');
  const [query, setQuery] = useState('');

  const explore = (category: string, nextQuery = '', nextRegion = region, nextDistrict = district, nextLocality = locality) => {
    router.push({
      pathname: '/(tabs)/explore',
      params: { category, district: nextDistrict, locality: nextLocality, region: nextRegion, query: nextQuery },
    });
  };

  const searchRestaurants = () => {
    const resolved = resolveHomeLocation(query, region, district, locality);
    explore('맛집', resolved.query, resolved.region, resolved.district, resolved.locality);
  };

  const locationLabel = [displayRegion(region), district === '전체' ? '' : district, locality].filter(Boolean).join(' ');

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>오늘어디</Text>
            <Text style={styles.location}>●  {locationLabel || '전국'}⌄</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.weather}>☀️  24° 맑음</Text>
            <Text style={styles.bell}>♧</Text>
          </View>
        </View>

        <View style={styles.search}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            accessibilityLabel="홈 장소 검색"
            onChangeText={setQuery}
            onSubmitEditing={searchRestaurants}
            placeholder="어디로 떠나볼까요?"
            placeholderTextColor="#9b9b9b"
            returnKeyType="search"
            style={styles.searchInput}
            value={query}
          />
        </View>

        <Text style={styles.sectionTitle}>누구와 함께?</Text>
        <View style={styles.relationshipRow}>
          {relationships.map((item) => (
            <MotionPressable key={item.label} onPress={() => explore('전체')} style={styles.relationshipChip}>
              <Text style={[styles.relationshipIcon, item.label === '커플' && styles.relationshipHeart]}>{item.icon}</Text>
              <Text style={styles.relationshipText}>{item.label}</Text>
            </MotionPressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>어떤 곳을 찾으세요?</Text>
        <View style={styles.categoryRow}>
          {categories.map((item) => (
            <MotionPressable key={item.label} onPress={() => explore(item.category)} style={styles.categoryButton}>
              <View style={styles.categoryIconCircle}>
                <Text style={[styles.categoryIconText, { color: item.color }]}>{item.icon}</Text>
              </View>
              <Text style={styles.categoryText}>{item.label}</Text>
            </MotionPressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>지금 여기, 인기 장소</Text>
        <MotionPressable accessibilityRole="button" onPress={() => explore('전체')} style={styles.mapPreview}>
          <View style={[styles.mapBlock, styles.mapBlockOne]} />
          <View style={[styles.mapBlock, styles.mapBlockTwo]} />
          <View style={[styles.mapBlock, styles.mapBlockThree]} />
          <View style={[styles.mapRoad, styles.roadOne]} />
          <View style={[styles.mapRoad, styles.roadTwo]} />
          <View style={[styles.mapRoad, styles.roadThree]} />
          <View style={[styles.river]} />
          <View style={[styles.pin, styles.pinOne]}><Text style={styles.pinDot}>●</Text></View>
          <View style={[styles.pin, styles.pinTwo]}><Text style={styles.pinDot}>●</Text></View>
          <View style={[styles.pin, styles.pinThree]}><Text style={styles.pinDot}>●</Text></View>
          <View style={[styles.pin, styles.pinFour]}><Text style={styles.pinDot}>●</Text></View>
          <View style={[styles.pin, styles.pinFive]}><Text style={styles.pinDot}>●</Text></View>
        </MotionPressable>

        <View style={styles.featureRow}>
          <MotionPressable accessibilityLabel="코스 설정" accessibilityRole="button" onPress={() => void Linking.openURL(appConfig.webUrl + '/recommend')} style={[styles.featureCard, styles.courseCard]}>
            <Text style={styles.featureTitle}>코스 설정</Text>
            <Text style={styles.featureText}>테마 맞춤 코스로{`\n`}알차게 여행하기</Text>
            <Image accessibilityIgnoresInvertColors alt="지도 위 출발지와 목적지가 표시된 코스 설정" resizeMode="contain" source={courseSettingImage} style={styles.courseImage} />
          </MotionPressable>
          <MotionPressable onPress={() => router.push('/(tabs)/office')} style={[styles.featureCard, styles.officeCard]}>
            <Text style={styles.featureTitleLight}>직장인 식사</Text>
            <Text style={styles.featureTextLight}>빠르고 만족스러운{`\n`}점심·회식 찾기</Text>
            <View style={styles.officeVisual}><Text style={styles.officeCity}>▥▥▥</Text><Text style={styles.officePlate}>🍴</Text></View>
          </MotionPressable>
          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>사계절 추천</Text>
            <Text style={styles.featureText}>계절마다 딱 맞는{`\n`}장소를 추천해요</Text>
            <Text style={styles.seasonVisual}>🌸🌿</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 18 },
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: '#111111', fontSize: 27, fontWeight: '900', letterSpacing: -1.3 },
  location: { marginTop: 7, color: '#252525', fontSize: 11, fontWeight: '800' },
  headerRight: { alignItems: 'flex-end', gap: 8 },
  weather: { color: '#333333', fontSize: 11, fontWeight: '800' },
  bell: { color: '#111111', fontSize: 21, fontWeight: '900' },
  search: { minHeight: 43, marginTop: 9, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e2e2', borderRadius: 11, backgroundColor: '#ffffff', paddingHorizontal: 12 },
  searchIcon: { color: '#252525', fontSize: 20, marginRight: 7 },
  searchInput: { flex: 1, minHeight: 42, color: '#171717', fontSize: 13, paddingVertical: 0 },
  sectionTitle: { marginTop: 18, marginBottom: 10, color: '#171717', fontSize: 13, fontWeight: '900' },
  relationshipRow: { flexDirection: 'row', gap: 7 },
  relationshipChip: { flex: 1, minHeight: 37, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: '#e4e4e4', borderRadius: 9, backgroundColor: '#ffffff' },
  relationshipIcon: { color: '#222222', fontSize: 15, fontWeight: '900' },
  relationshipHeart: { color: '#ff2f2f' },
  relationshipText: { color: '#272727', fontSize: 10, fontWeight: '800' },
  categoryRow: { flexDirection: 'row', gap: 9 },
  categoryButton: { flex: 1, alignItems: 'center', gap: 7 },
  categoryIconCircle: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e6e6e6', borderRadius: 26, backgroundColor: '#ffffff' },
  categoryIconText: { fontSize: 23, fontWeight: '900' },
  categoryText: { color: '#242424', fontSize: 10, fontWeight: '900' },
  mapPreview: { height: 116, overflow: 'hidden', borderWidth: 1, borderColor: '#e3e5df', borderRadius: 8, backgroundColor: '#eaf2e5' },
  mapBlock: { position: 'absolute', backgroundColor: '#d9ead0', borderRadius: 3 },
  mapBlockOne: { width: 90, height: 38, left: 22, top: 16 },
  mapBlockTwo: { width: 72, height: 42, right: 48, top: 14 },
  mapBlockThree: { width: 105, height: 27, left: 118, bottom: 12 },
  mapRoad: { position: 'absolute', height: 9, borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 5, backgroundColor: '#ffffff' },
  roadOne: { width: 360, left: -24, top: 48, transform: [{ rotate: '-9deg' }] },
  roadTwo: { width: 260, left: 35, top: 83, transform: [{ rotate: '31deg' }] },
  roadThree: { width: 230, right: -20, top: 35, transform: [{ rotate: '72deg' }] },
  river: { position: 'absolute', width: 250, height: 26, right: -42, bottom: -3, borderRadius: 15, backgroundColor: '#cde7f5', transform: [{ rotate: '-9deg' }] },
  pin: { position: 'absolute', width: 24, height: 30, alignItems: 'center', justifyContent: 'center', borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 14, backgroundColor: '#ff2f2f', transform: [{ rotate: '45deg' }], elevation: 3 },
  pinDot: { color: '#ffffff', fontSize: 7, transform: [{ rotate: '-45deg' }] },
  pinOne: { top: 20, left: '23%' },
  pinTwo: { top: 61, left: '9%' },
  pinThree: { top: 36, left: '48%' },
  pinFour: { top: 16, left: '73%' },
  pinFive: { top: 67, left: '69%' },
  featureRow: { marginTop: 13, flexDirection: 'row', gap: 7 },
  featureCard: { flex: 1, height: 145, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 9, backgroundColor: '#ffffff', padding: 10 },
  courseCard: { backgroundColor: '#fffafa' },
  officeCard: { borderColor: '#17324f', backgroundColor: '#17324f' },
  featureTitle: { color: '#171717', fontSize: 12, fontWeight: '900' },
  featureTitleLight: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  featureText: { marginTop: 4, color: '#626262', fontSize: 8, lineHeight: 12, fontWeight: '700' },
  featureTextLight: { marginTop: 4, color: '#d9e1e9', fontSize: 8, lineHeight: 12, fontWeight: '700' },
  courseImage: { width: 76, height: 76, alignSelf: 'center', marginTop: 'auto', marginBottom: -8 },
  officeVisual: { marginTop: 'auto', minHeight: 62, alignItems: 'center', justifyContent: 'flex-end' },
  officeCity: { color: '#0e2238', fontSize: 28, letterSpacing: -5 },
  officePlate: { position: 'absolute', right: 3, bottom: 1, fontSize: 26 },
  seasonVisual: { marginTop: 'auto', fontSize: 31, textAlign: 'center' },
});
