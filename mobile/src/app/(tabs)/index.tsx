import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LiveWeatherCard } from '@/components/live-weather-card';
import { MotionPressable } from '@/components/motion-pressable';
import { SeasonalFoods } from '@/components/seasonal-foods';
import { appConfig } from '@/lib/config';
import { koreaRegionDistricts } from '@/lib/korea-regions';

const journeyCards = [
  { number: '01', label: '혼자', title: '내 취향대로 가볍게', description: '혼밥, 조용한 카페와 혼자 둘러보기 좋은 장소만 모아보세요.' },
  { number: '02', label: '커플', title: '데이트 장소 찾기', description: '네이버 검색 반응이 많은 카페·맛집·데이트 명소를 우선 확인하세요.' },
  { number: '03', label: '친구', title: '모임에 맞는 장소', description: '여럿이 방문하기 좋은 맛집, 축제와 즐길 거리를 확인하세요.' },
  { number: '04', label: '가족', title: '온 가족이 함께', description: '아이와 부모님까지 편하게 즐길 수 있는 장소를 찾아보세요.' },
] as const;

const privacyCards = [
  { number: '01', title: '필요한 정보만 처리', description: '소셜 로그인 정보는 회원 식별과 서비스 제공 목적으로만 사용합니다.' },
  { number: '02', title: '회원별 접근 제한', description: '저장 장소와 최근 본 장소는 로그인한 본인만 확인할 수 있습니다.' },
  { number: '03', title: '탈퇴 시 안전하게 삭제', description: '법령상 보관 의무가 있는 경우를 제외하고 개인정보와 저장 데이터를 삭제합니다.' },
] as const;

const homeRegions = ['전국', ...Object.keys(koreaRegionDistricts)];

const homeShortcuts = [
  { label: '맛집', icon: '식', category: '맛집', background: '#ffe4e1', color: '#c52d28' },
  { label: '카페', icon: '잔', category: '카페', background: '#fff0cf', color: '#9a620d' },
  { label: '관광지', icon: '길', category: '관광지', background: '#dff5eb', color: '#176a4d' },
  { label: '축제', icon: '별', category: '축제', background: '#eee4ff', color: '#673ba5' },
] as const;

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 370;
  const tablet = width >= 640;
  const [homeRegion, setHomeRegion] = useState('전국');
  const [homeDistrict, setHomeDistrict] = useState('전체');
  const [homeQuery, setHomeQuery] = useState('');

  const explore = (category: string, query = '') => {
    router.push({ pathname: '/(tabs)/explore', params: { category, district: homeDistrict, region: homeRegion, query } });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.container, compact && styles.containerCompact]}>
        <View style={styles.discoveryHero}>
          <Text style={styles.discoveryEyebrow}>오늘어디 PLACE DISCOVERY</Text>
          <Text style={styles.discoveryTitle}>오늘, 어디로{`\n`}갈까요?</Text>
          <Text style={styles.discoveryDescription}>맛집부터 카페·축제·관광지까지 한 번에 찾아보세요.</Text>

          <View style={styles.discoverySearchCard}>
            <Text style={styles.discoverySearchLabel}>장소·지역·음식 검색</Text>
            <View style={styles.discoverySearchRow}>
              <TextInput
                accessibilityLabel="홈 장소 검색"
                onChangeText={setHomeQuery}
                onSubmitEditing={() => explore('전체', homeQuery.trim())}
                placeholder="성수 파스타, 제주 오션뷰 카페"
                placeholderTextColor="#8f8f89"
                returnKeyType="search"
                style={styles.discoverySearchInput}
                value={homeQuery}
              />
              <MotionPressable accessibilityRole="button" onPress={() => explore('전체', homeQuery.trim())} style={styles.discoverySearchButton}><Text style={styles.discoverySearchButtonText}>검색</Text></MotionPressable>
            </View>
            <Text style={styles.discoveryRegionLabel}>어디에서 찾을까요?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.discoveryRegionRow}>
              {homeRegions.map((item) => <MotionPressable key={item} accessibilityRole="button" onPress={() => { setHomeRegion(item); setHomeDistrict('전체'); }} style={[styles.discoveryRegionButton, homeRegion === item && styles.discoveryRegionButtonActive]}><Text style={[styles.discoveryRegionText, homeRegion === item && styles.discoveryRegionTextActive]}>{item}</Text></MotionPressable>)}
            </ScrollView>
            {homeRegion !== '전국' ? <><Text style={styles.discoveryDistrictLabel}>시·군·구</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.discoveryRegionRow}>
              {['전체', ...(koreaRegionDistricts[homeRegion] ?? [])].map((item) => <MotionPressable key={item} accessibilityRole="button" onPress={() => setHomeDistrict(item)} style={[styles.discoveryRegionButton, homeDistrict === item && styles.discoveryRegionButtonActive]}><Text style={[styles.discoveryRegionText, homeDistrict === item && styles.discoveryRegionTextActive]}>{item === '전체' ? `${homeRegion} 전체` : item}</Text></MotionPressable>)}
            </ScrollView></> : null}
          </View>
        </View>

        <View style={styles.homeShortcuts}>
          {homeShortcuts.map((item) => <MotionPressable key={item.label} accessibilityRole="button" onPress={() => explore(item.category)} style={styles.homeShortcut}><View style={[styles.homeShortcutIcon, { backgroundColor: item.background }]}><Text style={[styles.homeShortcutIconText, { color: item.color }]}>{item.icon}</Text></View><Text style={styles.homeShortcutLabel}>{item.label}</Text></MotionPressable>)}
          <MotionPressable accessibilityRole="button" onPress={() => void Linking.openURL(`${appConfig.webUrl}/recommend`)} style={styles.homeShortcut}><View style={[styles.homeShortcutIcon, { backgroundColor: '#e2ecff' }]}><Text style={[styles.homeShortcutIconText, { color: '#3157c8' }]}>코</Text></View><Text style={styles.homeShortcutLabel}>코스 설정</Text></MotionPressable>
          <MotionPressable accessibilityRole="button" onPress={() => router.push('/(tabs)/office')} style={styles.homeShortcut}><View style={[styles.homeShortcutIcon, { backgroundColor: '#eaffaa' }]}><Text style={[styles.homeShortcutIconText, { color: '#334600' }]}>회</Text></View><Text style={styles.homeShortcutLabel}>직장인 식사</Text></MotionPressable>
        </View>

        <View style={styles.quickPicks}>
          <Text style={styles.eyebrow}>QUICK PICKS</Text>
          <Text style={styles.quickPicksTitle}>상황별로 빠르게 찾기</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPicksRow}>
            <MotionPressable onPress={() => explore('카페', '데이트 카페')} style={styles.quickPick}><Text style={styles.quickPickText}>데이트 카페</Text></MotionPressable>
            <MotionPressable onPress={() => explore('관광지', '가족 나들이')} style={styles.quickPick}><Text style={styles.quickPickText}>가족 나들이</Text></MotionPressable>
            <MotionPressable onPress={() => explore('맛집', '혼밥')} style={styles.quickPick}><Text style={styles.quickPickText}>혼밥</Text></MotionPressable>
            <MotionPressable onPress={() => explore('축제', '축제')} style={styles.quickPick}><Text style={styles.quickPickText}>이번 주 축제</Text></MotionPressable>
          </ScrollView>
        </View>

        <View style={styles.heroFrame}>
          <LiveWeatherCard />

          <View style={styles.journeyPanel}>
            <Text style={styles.eyebrow}>오늘어디 JOURNEY</Text>
            <Text style={styles.journeyHeading}>누구와 가나요?</Text>
            <Text style={styles.journeyIntro}>예약 중심이 아니라 함께하는 사람과 목적에 맞춰 전국의 장소를 탐색합니다.</Text>

            <View style={styles.journeyGrid}>
              {journeyCards.map((journey) => (
                <MotionPressable
                  accessibilityRole="button"
                  key={journey.label}
                  onPress={() => explore('전체')}
                  style={[styles.journeyCard, tablet && styles.journeyCardTablet]}
                >
                  <Text style={styles.journeyNumber}>{journey.number}</Text>
                  <Text style={styles.journeyPill}>{journey.label}</Text>
                  <Text style={styles.journeyTitle}>{journey.title}</Text>
                  <Text style={styles.journeyDescription}>{journey.description}</Text>
                  <Text style={styles.journeyAction}>지도에서 찾기 →</Text>
                </MotionPressable>
              ))}
            </View>
          </View>
        </View>

        <SeasonalFoods />

        <View style={styles.privacy}>
          <Text style={styles.privacyEyebrow}>PRIVACY &amp; SAFETY</Text>
          <Text style={styles.privacyTitle}>개인정보를 소중하게 보호합니다.</Text>
          <Text style={styles.privacyText}>서비스 제공에 필요한 최소한의 정보만 처리하고, 이용 목적이 끝난 정보는 안전하게 삭제합니다.</Text>
          <View style={styles.privacyGrid}>
            {privacyCards.map((item) => (
              <View key={item.number} style={styles.privacyCard}>
                <Text style={styles.privacyNumber}>{item.number}</Text>
                <Text style={styles.privacyCardTitle}>{item.title}</Text>
                <Text style={styles.privacyCardText}>{item.description}</Text>
              </View>
            ))}
          </View>
          <View style={styles.privacyFooter}>
            <Text style={styles.copyright}>© 2026 오늘어디</Text>
            <MotionPressable onPress={() => void Linking.openURL(`${appConfig.webUrl}/privacy`)} style={styles.footerLink}><Text style={styles.footerLinkText}>개인정보처리방침 →</Text></MotionPressable>
            <MotionPressable onPress={() => void Linking.openURL(`${appConfig.webUrl}/sources`)} style={styles.footerLink}><Text style={styles.footerLinkText}>데이터 출처·저작권 →</Text></MotionPressable>
            <MotionPressable onPress={() => router.push('/(tabs)/account')} style={styles.footerLink}><Text style={styles.footerLinkText}>개인정보·계정 관리 →</Text></MotionPressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f7f4' },
  container: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 38 },
  containerCompact: { paddingHorizontal: 12 },
  discoveryHero: { padding: 22, borderRadius: 26, backgroundColor: '#ff3b36', shadowColor: '#a51d19', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.24, shadowRadius: 20, elevation: 7 },
  discoveryEyebrow: { color: '#fff5b4', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 }, discoveryTitle: { marginTop: 12, color: '#ffffff', fontSize: 45, lineHeight: 43, fontWeight: '900', letterSpacing: -2 }, discoveryDescription: { marginTop: 12, color: '#fff2ef', fontSize: 12, lineHeight: 19, fontWeight: '700' },
  discoverySearchCard: { marginTop: 23, padding: 14, borderRadius: 19, backgroundColor: '#ffffff' }, discoverySearchLabel: { color: '#101010', fontSize: 11, fontWeight: '900' }, discoverySearchRow: { minHeight: 52, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 7 }, discoverySearchInput: { flex: 1, minHeight: 52, borderWidth: 1, borderColor: '#d6d6d0', borderRadius: 14, backgroundColor: '#fafaf8', color: '#101010', paddingHorizontal: 12, fontSize: 11, fontWeight: '700' }, discoverySearchButton: { minWidth: 61, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#101010' }, discoverySearchButtonText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
  discoveryRegionLabel: { marginTop: 16, color: '#101010', fontSize: 10, fontWeight: '900' }, discoveryDistrictLabel: { marginTop: 12, color: '#101010', fontSize: 10, fontWeight: '900' }, discoveryRegionRow: { gap: 6, paddingTop: 9, paddingBottom: 2 }, discoveryRegionButton: { minHeight: 34, justifyContent: 'center', borderWidth: 1, borderColor: '#deded8', borderRadius: 999, backgroundColor: '#ffffff', paddingHorizontal: 12 }, discoveryRegionButtonActive: { borderColor: '#ff3b36', backgroundColor: '#ff3b36' }, discoveryRegionText: { color: '#5f5f5a', fontSize: 10, fontWeight: '900' }, discoveryRegionTextActive: { color: '#ffffff' },
  homeShortcuts: { marginTop: -12, marginHorizontal: 10, paddingTop: 27, paddingBottom: 16, flexDirection: 'row', flexWrap: 'wrap', borderBottomLeftRadius: 22, borderBottomRightRadius: 22, backgroundColor: '#ffffff', shadowColor: '#111111', shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.08, shadowRadius: 15, elevation: 3 }, homeShortcut: { width: '33.333%', minHeight: 85, alignItems: 'center', justifyContent: 'center', gap: 7 }, homeShortcutIcon: { width: 49, height: 49, alignItems: 'center', justifyContent: 'center', borderRadius: 17 }, homeShortcutIconText: { fontSize: 14, fontWeight: '900' }, homeShortcutLabel: { color: '#101010', fontSize: 10, fontWeight: '900' },
  quickPicks: { marginTop: 34 }, quickPicksTitle: { marginTop: 6, color: '#101010', fontSize: 20, fontWeight: '900' }, quickPicksRow: { gap: 7, paddingTop: 12, paddingBottom: 3 }, quickPick: { minHeight: 39, justifyContent: 'center', borderWidth: 1, borderColor: '#d8d8d2', borderRadius: 999, backgroundColor: '#ffffff', paddingHorizontal: 15 }, quickPickText: { color: '#101010', fontSize: 10, fontWeight: '900' },
  heroFrame: { padding: 10, borderWidth: 1, borderColor: '#deded8', borderRadius: 28, backgroundColor: '#ffffff', shadowColor: '#1f1914', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.13, shadowRadius: 22, elevation: 7 },
  journeyPanel: { marginTop: 12, padding: 20, borderWidth: 1, borderColor: '#deded8', borderRadius: 19, backgroundColor: '#f8f8f5' },
  eyebrow: { color: '#ff3b36', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  journeyHeading: { marginTop: 7, color: '#111111', fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: -1.4 },
  journeyIntro: { marginTop: 8, color: '#42423f', fontSize: 12, fontWeight: '600', lineHeight: 20 },
  journeyGrid: { marginTop: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  journeyCard: { width: '100%', minHeight: 170, padding: 18, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: '#deded8', borderRadius: 18, backgroundColor: '#ffffff', shadowColor: '#111111', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  journeyCardTablet: { width: '48%' },
  journeyNumber: { position: 'absolute', top: 12, right: 14, color: '#c9c9c3', fontSize: 30, fontWeight: '900' },
  journeyPill: { alignSelf: 'flex-start', overflow: 'hidden', borderRadius: 999, color: '#ffffff', backgroundColor: '#ff3b36', paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: '900' },
  journeyTitle: { marginTop: 13, color: '#111111', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  journeyDescription: { marginTop: 7, maxWidth: '88%', color: '#444440', fontSize: 11, fontWeight: '600', lineHeight: 18 },
  journeyAction: { marginTop: 'auto', paddingTop: 14, color: '#111111', fontSize: 11, fontWeight: '900' },
  categorySection: { marginTop: 44 },
  sectionTitle: { marginTop: 9, color: '#111111', fontSize: 32, lineHeight: 38, fontWeight: '900', letterSpacing: -1.5 },
  sectionDescription: { marginTop: 10, color: '#454541', fontSize: 13, fontWeight: '600', lineHeight: 21 },
  categoryGrid: { marginTop: 24, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 18 },
  categoryCard: { width: '48%', height: 250, padding: 17, position: 'relative', justifyContent: 'flex-start', borderWidth: 1, borderBottomWidth: 6, borderRadius: 22, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.22, shadowRadius: 12, elevation: 7 },
  categoryAccent: { width: 5, height: 66, position: 'absolute', top: 67, left: -1, borderTopRightRadius: 999, borderBottomRightRadius: 999 },
  categoryNumber: { minWidth: 40, alignSelf: 'flex-start', overflow: 'hidden', borderWidth: 1, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.82)', paddingHorizontal: 10, paddingVertical: 5, fontSize: 10, lineHeight: 14, fontWeight: '900', textAlign: 'center' },
  categoryCopy: { marginTop: 18, alignItems: 'flex-start' },
  categoryEnglish: { width: '100%', fontSize: 10, lineHeight: 14, fontWeight: '900', letterSpacing: 0.65, textAlign: 'left' },
  categoryTitle: { marginTop: 7, color: '#111111', fontSize: 23, lineHeight: 30, fontWeight: '900', letterSpacing: -1, textAlign: 'left' },
  categoryBottomRow: { flex: 1, width: '100%', marginTop: 10, alignItems: 'stretch' },
  categoryDescription: { width: '100%', color: '#444440', fontSize: 11, fontWeight: '700', lineHeight: 17, textAlign: 'left' },
  categoryArrow: { width: 44, height: 44, marginTop: 'auto', alignSelf: 'flex-end', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 22, shadowColor: '#111111', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 6, elevation: 4 },
  categoryArrowText: { color: '#ffffff', fontSize: 20, lineHeight: 24, fontWeight: '900', textAlign: 'center' },
  comingSection: { marginTop: 52, marginHorizontal: -16, padding: 16, backgroundColor: '#101010' },
  comingSoon: { minHeight: 360, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#30302e', borderRadius: 28, backgroundColor: '#191918', padding: 28 },
  dots: { width: 72, height: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: '#617524', borderRadius: 24, backgroundColor: '#202414' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#caff2c' },
  comingLabel: { marginTop: 24, color: '#caff2c', fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  comingTitle: { marginTop: 14, color: '#ffffff', fontSize: 31, fontWeight: '900', lineHeight: 36, letterSpacing: -1.4, textAlign: 'center' },
  comingDescription: { marginTop: 18, color: '#c8c8c2', fontSize: 13, fontWeight: '600', lineHeight: 23, textAlign: 'center' },
  comingStatus: { marginTop: 28, overflow: 'hidden', borderWidth: 1, borderColor: '#40403d', borderRadius: 999, color: '#b8b8b3', paddingHorizontal: 15, paddingVertical: 9, fontSize: 10, fontWeight: '800' },
  privacy: { marginTop: 42, borderRadius: 28, backgroundColor: '#101010', padding: 22 },
  privacyEyebrow: { color: '#caff2c', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  privacyTitle: { marginTop: 10, color: '#ffffff', fontSize: 28, fontWeight: '900', lineHeight: 34, letterSpacing: -1.1 },
  privacyText: { marginTop: 10, color: '#d2d2cd', fontSize: 12, fontWeight: '600', lineHeight: 20 },
  privacyGrid: { marginTop: 22, gap: 10 },
  privacyCard: { padding: 17, borderWidth: 1, borderColor: '#333330', borderRadius: 17, backgroundColor: '#1b1b1a' },
  privacyNumber: { color: '#caff2c', fontSize: 10, fontWeight: '900' },
  privacyCardTitle: { marginTop: 10, color: '#ffffff', fontSize: 17, fontWeight: '900' },
  privacyCardText: { marginTop: 7, color: '#c8c8c2', fontSize: 11, fontWeight: '600', lineHeight: 18 },
  privacyFooter: { marginTop: 22, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#3a3a38', paddingTop: 12 },
  copyright: { marginBottom: 8, color: '#8b8b85', fontSize: 10 },
  footerLink: { minHeight: 44, justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#30302e' },
  footerLinkText: { color: '#f0f0eb', fontSize: 12, fontWeight: '800' },
});
