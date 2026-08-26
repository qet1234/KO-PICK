import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MotionPressable } from '@/components/motion-pressable';
import { appConfig } from '@/lib/config';
import { koreaRegionDistricts } from '@/lib/korea-regions';

const homeRegions = ['전국', ...Object.keys(koreaRegionDistricts)];
const relationships = [
  { label: '혼자', icon: '♙' }, { label: '커플', icon: '♥' },
  { label: '친구', icon: '♟' }, { label: '가족', icon: '⌂' },
] as const;
const categories = [
  { label: '맛집', icon: '🍴', category: '맛집', background: '#fff1ef' },
  { label: '카페', icon: '☕', category: '카페', background: '#fff7ed' },
  { label: '관광지', icon: '▣', category: '관광지', background: '#eff6ff' },
  { label: '축제', icon: '✣', category: '축제', background: '#fff5e8' },
] as const;

function resolveHomeLocation(input: string, selectedRegion: string, selectedDistrict: string, selectedLocality: string) {
  let remaining = input.trim();
  let region = selectedRegion;
  let district = selectedDistrict;
  let locality = selectedLocality;
  const matchedRegion = homeRegions.filter((item) => item !== '전국').find((item) => remaining.replace(/\s+/g, '').includes(item.replace(/\s+/g, '')));
  if (matchedRegion) {
    region = matchedRegion; district = '전체'; locality = ''; remaining = remaining.replace(matchedRegion, ' ');
  }
  const districtPool = region === '전국'
    ? Object.entries(koreaRegionDistricts).flatMap(([regionName, districts]) => districts.map((districtName) => ({ regionName, districtName })))
    : (koreaRegionDistricts[region] ?? []).map((districtName) => ({ regionName: region, districtName }));
  const matches = districtPool.filter(({ districtName }) => remaining.replace(/\s+/g, '').includes(districtName.replace(/\s+/g, '')));
  const matchedDistrict = matches.length > 0 && new Set(matches.map((item) => item.regionName)).size === 1 ? matches[0] : null;
  if (matchedDistrict) {
    region = matchedDistrict.regionName; district = matchedDistrict.districtName; locality = ''; remaining = remaining.replace(matchedDistrict.districtName, ' ');
  }
  const localityToken = remaining.split(/\s+/).find((token) => /[읍면동리]$/.test(token));
  if (localityToken) {
    locality = localityToken; remaining = remaining.replace(localityToken, ' ');
  }
  return { region, district, locality, query: remaining.replace(/\s+/g, ' ').trim().replace(/^(맛집|음식점|장소)$/, '') };
}

export default function HomeScreen() {
  const [region, setRegion] = useState('서울');
  const [district, setDistrict] = useState('전체');
  const [locality, setLocality] = useState('');
  const [query, setQuery] = useState('');

  const explore = (category: string, nextQuery = '', nextRegion = region, nextDistrict = district, nextLocality = locality) => {
    router.push({ pathname: '/(tabs)/explore', params: { category, district: nextDistrict, locality: nextLocality, region: nextRegion, query: nextQuery } });
  };
  const searchRestaurants = () => {
    const resolved = resolveHomeLocation(query, region, district, locality);
    explore('맛집', resolved.query, resolved.region, resolved.district, resolved.locality);
  };
  const locationLabel = [region, district === '전체' ? '' : district, locality].filter(Boolean).join(' ');

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View><Text style={styles.brand}>오늘어디</Text><Text style={styles.location}>● {locationLabel || '전국'}⌄</Text></View>
          <View style={styles.headerRight}><Text style={styles.weather}>☀️ 24° 맑음</Text><View style={styles.bell}><Text style={styles.bellText}>♧</Text></View></View>
        </View>

        <View style={styles.search}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput accessibilityLabel="홈 장소 검색" onChangeText={setQuery} onSubmitEditing={searchRestaurants} placeholder="어디로 떠나볼까요?" placeholderTextColor="#9a9a9a" returnKeyType="search" style={styles.searchInput} value={query} />
          <MotionPressable accessibilityRole="button" onPress={searchRestaurants} style={styles.searchButton}><Text style={styles.searchButtonText}>검색</Text></MotionPressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionRow}>
          {homeRegions.map((item) => <MotionPressable accessibilityRole="button" key={item} onPress={() => { setRegion(item); setDistrict('전체'); setLocality(''); }} style={[styles.regionChip, region === item && styles.regionChipActive]}><Text style={[styles.regionChipText, region === item && styles.regionChipTextActive]}>{item}</Text></MotionPressable>)}
        </ScrollView>
        {region !== '전국' ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.districtRow}>
          {['전체', ...(koreaRegionDistricts[region] ?? [])].map((item) => <MotionPressable accessibilityRole="button" key={item} onPress={() => { setDistrict(item); setLocality(''); }} style={[styles.districtChip, district === item && styles.districtChipActive]}><Text style={[styles.districtChipText, district === item && styles.districtChipTextActive]}>{item === '전체' ? region + ' 전체' : item}</Text></MotionPressable>)}
        </ScrollView> : null}
        {district !== '전체' ? <TextInput accessibilityLabel="읍면동 입력" onChangeText={(value) => setLocality(value.slice(0, 40))} placeholder="읍·면·동 입력 (예: 역삼동)" placeholderTextColor="#9a9a9a" style={styles.localityInput} value={locality} /> : null}

        <Text style={styles.sectionTitle}>누구와 함께?</Text>
        <View style={styles.relationshipRow}>
          {relationships.map((item) => <MotionPressable accessibilityRole="button" key={item.label} onPress={() => explore('전체')} style={styles.relationshipChip}><Text style={styles.relationshipIcon}>{item.icon}</Text><Text style={styles.relationshipText}>{item.label}</Text></MotionPressable>)}
        </View>

        <Text style={styles.sectionTitle}>어떤 곳을 찾으세요?</Text>
        <View style={styles.categoryRow}>
          {categories.map((item) => <MotionPressable accessibilityRole="button" key={item.label} onPress={() => explore(item.category)} style={styles.categoryButton}><View style={[styles.categoryIcon, { backgroundColor: item.background }]}><Text style={styles.categoryIconText}>{item.icon}</Text></View><Text style={styles.categoryText}>{item.label}</Text></MotionPressable>)}
        </View>

        <MotionPressable accessibilityRole="button" onPress={() => explore('전체')} style={styles.mapPreview}>
          <View style={styles.mapLabel}><Text style={styles.mapTitle}>지금 여기, 인기 장소</Text><Text style={styles.mapSubtitle}>{locationLabel || '전국'} 지도에서 한눈에 보기</Text></View>
          <View style={[styles.mapRoad, styles.roadOne]} /><View style={[styles.mapRoad, styles.roadTwo]} />
          <View style={[styles.pin, styles.pinOne]}><Text style={styles.pinText}>1</Text></View><View style={[styles.pin, styles.pinTwo]}><Text style={styles.pinText}>2</Text></View><View style={[styles.pin, styles.pinThree]}><Text style={styles.pinText}>3</Text></View><View style={[styles.pin, styles.pinFour]}><Text style={styles.pinText}>4</Text></View><View style={[styles.pin, styles.pinFive]}><Text style={styles.pinText}>5</Text></View>
        </MotionPressable>

        <View style={styles.featureRow}>
          <MotionPressable onPress={() => void Linking.openURL(appConfig.webUrl + '/recommend')} style={styles.featureCard}><Text style={styles.featureIcon}>⌁</Text><Text style={styles.featureTitle}>코스 설정</Text><Text style={styles.featureText}>테마 맞춤 코스로 여행하기</Text></MotionPressable>
          <MotionPressable onPress={() => router.push('/(tabs)/office')} style={[styles.featureCard, styles.featureCardOffice]}><Text style={styles.featureIconLight}>▣</Text><Text style={styles.featureTitleLight}>직장인 식사</Text><Text style={styles.featureTextLight}>점심·회식 빠르게 찾기</Text></MotionPressable>
          <View style={styles.featureCard}><Text style={styles.featureIcon}>✿</Text><Text style={styles.featureTitle}>사계절 추천</Text><Text style={styles.featureText}>계절에 맞는 음식 보기</Text></View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 18 },
  header: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: '#111111', fontSize: 25, fontWeight: '900', letterSpacing: -1.2 },
  location: { marginTop: 6, color: '#333333', fontSize: 11, fontWeight: '800' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 9 }, weather: { color: '#373737', fontSize: 11, fontWeight: '800' }, bell: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  bellText: { color: '#222222', fontSize: 21, fontWeight: '800' },
  search: { minHeight: 44, marginTop: 7, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#dedede', borderRadius: 13, backgroundColor: '#fafafa', paddingLeft: 13, paddingRight: 5 },
  searchIcon: { color: '#4c4c4c', fontSize: 22 },
  searchInput: { flex: 1, minHeight: 42, color: '#171717', paddingHorizontal: 8, fontSize: 13 },
  searchButton: { minWidth: 56, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#ff3b36' },
  searchButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  regionRow: { gap: 7, paddingTop: 12, paddingBottom: 3 },
  regionChip: { minHeight: 34, justifyContent: 'center', borderWidth: 1, borderColor: '#e3e3e3', borderRadius: 999, backgroundColor: '#ffffff', paddingHorizontal: 12 },
  regionChipActive: { borderColor: '#ff3b36', backgroundColor: '#ff3b36' },
  regionChipText: { color: '#5f5f5f', fontSize: 11, fontWeight: '800' },
  regionChipTextActive: { color: '#ffffff' },
  districtRow: { gap: 7, paddingTop: 7, paddingBottom: 3 },
  districtChip: { minHeight: 32, justifyContent: 'center', borderWidth: 1, borderColor: '#e7e7e7', borderRadius: 999, backgroundColor: '#f8f8f8', paddingHorizontal: 11 },
  districtChipActive: { borderColor: '#ff9b97', backgroundColor: '#fff0ee' },
  districtChipText: { color: '#6b6b6b', fontSize: 10, fontWeight: '800' },
  districtChipTextActive: { color: '#d52b26' },
  localityInput: { minHeight: 42, marginTop: 8, borderWidth: 1, borderColor: '#e2e2e2', borderRadius: 11, backgroundColor: '#fafafa', color: '#171717', paddingHorizontal: 12, fontSize: 12 },
  sectionTitle: { marginTop: 17, marginBottom: 9, color: '#171717', fontSize: 15, fontWeight: '900' },
  relationshipRow: { flexDirection: 'row', gap: 7 },
  relationshipChip: { flex: 1, minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: '#e4e4e4', borderRadius: 11, backgroundColor: '#ffffff' },
  relationshipIcon: { color: '#ff3b36', fontSize: 17, fontWeight: '900' },
  relationshipText: { color: '#242424', fontSize: 11, fontWeight: '900' },
  categoryRow: { flexDirection: 'row', gap: 8 },
  categoryButton: { flex: 1, alignItems: 'center', gap: 7 },
  categoryIcon: { width: 59, height: 59, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eeeeee', borderRadius: 30 },
  categoryIconText: { fontSize: 24 },
  categoryText: { color: '#222222', fontSize: 11, fontWeight: '900' },
  mapPreview: { height: 128, marginTop: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#dce2da', borderRadius: 16, backgroundColor: '#edf3e8' },
  mapLabel: { position: 'absolute', zIndex: 4, top: 12, left: 12, borderWidth: 1, borderColor: '#ffffff', borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 11, paddingVertical: 9 },
  mapTitle: { color: '#171717', fontSize: 13, fontWeight: '900' },
  mapSubtitle: { marginTop: 2, color: '#777777', fontSize: 9 },
  mapRoad: { position: 'absolute', height: 15, backgroundColor: '#ffffff', borderColor: '#e3e7df', borderWidth: 1, borderRadius: 8, transform: [{ rotate: '-18deg' }] },
  roadOne: { width: 340, top: 105, left: -25 },
  roadTwo: { width: 260, top: 118, right: -70, transform: [{ rotate: '56deg' }] },
  pin: { position: 'absolute', width: 29, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#ff3b36', shadowColor: '#b61814', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  pinText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },
  pinOne: { top: 82, left: '18%' }, pinTwo: { top: 135, left: '37%' }, pinThree: { top: 72, left: '60%' }, pinFour: { top: 146, left: '74%' }, pinFive: { top: 102, left: '86%' },
  featureRow: { marginTop: 12, flexDirection: 'row', gap: 7 },
  featureCard: { flex: 1, minHeight: 137, borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 14, backgroundColor: '#ffffff', padding: 12 },
  featureCardOffice: { borderColor: '#17324e', backgroundColor: '#17324e' },
  featureIcon: { color: '#ff3b36', fontSize: 28, fontWeight: '900' },
  featureIconLight: { color: '#ffffff', fontSize: 26, fontWeight: '900' },
  featureTitle: { marginTop: 'auto', color: '#171717', fontSize: 12, fontWeight: '900' },
  featureTitleLight: { marginTop: 'auto', color: '#ffffff', fontSize: 12, fontWeight: '900' },
  featureText: { marginTop: 4, color: '#777777', fontSize: 9, lineHeight: 13 },
  featureTextLight: { marginTop: 4, color: '#d8e3ec', fontSize: 9, lineHeight: 13 },
});

