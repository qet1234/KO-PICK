import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MotionPressable } from '@/components/motion-pressable';
import { RouteMapChooser } from '@/components/route-map-chooser';
import { useSession } from '@/context/session-context';
import { appConfig } from '@/lib/config';
import { clearRecentPlaces, libraryPlaceKey, loadPlaceLibrary, toggleSavedPlace, type LibraryPlace, type PlaceLibrary } from '@/lib/place-library';
import { createPlacePoll } from '@/lib/place-polls';

const emptyLibrary: PlaceLibrary = { saved: [], recent: [] };

export default function SavedPlacesScreen() {
  const router = useRouter();
  const { loading: sessionLoading, session } = useSession();
  const [library, setLibrary] = useState<PlaceLibrary>(emptyLibrary);
  const [tab, setTab] = useState<'saved' | 'recent'>('saved');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [title, setTitle] = useState('우리 어디 갈까?');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const refresh = useCallback(async () => {
    setLibrary(await loadPlaceLibrary());
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!session) {
      setLibrary(emptyLibrary);
      setLoading(false);
      return () => { active = false; };
    }
    void loadPlaceLibrary().then((result) => {
      if (active) { setLibrary(result); setLoading(false); }
    });
    return () => { active = false; };
  }, [session]));

  const visible = tab === 'saved' ? library.saved : library.recent;
  const candidatesByKey = new Map([...library.saved, ...library.recent].map((place) => [libraryPlaceKey(place), place]));

  const toggleCandidate = (place: LibraryPlace) => {
    const key = libraryPlaceKey(place);
    setSelectedKeys((current) => {
      if (current.includes(key)) return current.filter((value) => value !== key);
      if (current.length >= 5) {
        Alert.alert('최대 5곳', '함께 고르기 후보는 최대 5곳까지 선택할 수 있습니다.');
        return current;
      }
      return [...current, key];
    });
  };

  const removeSaved = async (place: LibraryPlace) => {
    await toggleSavedPlace({ id: place.sourceId, placeName: place.placeName, category: place.category, region: place.region, city: place.city, address: place.address, latitude: place.latitude, longitude: place.longitude, imageUrl: place.imageUrl, source: place.source });
    setSelectedKeys((current) => current.filter((key) => key !== libraryPlaceKey(place)));
    await refresh();
  };

  const makePoll = async () => {
    if (!session) {
      Alert.alert('로그인이 필요합니다', '투표 링크와 저장 장소를 관리하려면 내 계정에서 로그인해 주세요.');
      return;
    }
    const candidates = selectedKeys.map((key) => candidatesByKey.get(key)).filter((place): place is LibraryPlace => Boolean(place));
    if (candidates.length < 2) {
      Alert.alert('후보를 선택해 주세요', '함께 고를 장소를 2곳 이상 선택해 주세요.');
      return;
    }
    setWorking(true);
    try {
      const result = await createPlacePoll(title.trim(), candidates);
      const shareUrl = `${appConfig.webUrl.replace(/\/$/, '')}/choose/${result.token}`;
      await Share.share({ title: title.trim(), message: `${title.trim()}\n장소 투표에 참여해 주세요.\n${shareUrl}`, url: shareUrl });
    } catch (error) {
      Alert.alert('링크 생성 실패', error instanceof Error ? error.message : '함께 고르기 링크를 만들지 못했습니다.');
    } finally {
      setWorking(false);
    }
  };

  if (!sessionLoading && !session) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.eyebrow}>MY PLACE LIBRARY</Text>
          <Text style={styles.title}>저장한 장소</Text>
          <View style={styles.loginGate}>
            <Text style={styles.loginIcon}>♡</Text>
            <Text style={styles.loginEyebrow}>MEMBER LIBRARY</Text>
            <Text style={styles.loginTitle}>로그인하고 장소를 저장하세요</Text>
            <Text style={styles.loginDescription}>찜한 장소와 최근 본 기록을 계정에 저장하고 다른 기기에서도 이어서 확인할 수 있습니다.</Text>
            <MotionPressable accessibilityRole="button" onPress={() => router.push('/login')} style={styles.loginButton}><Text style={styles.loginButtonText}>로그인 / 회원가입</Text></MotionPressable>
            <MotionPressable accessibilityRole="button" onPress={() => router.push('/(tabs)/explore')}><Text style={styles.guestLink}>로그인 없이 장소 둘러보기 →</Text></MotionPressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>MY PLACE LIBRARY</Text>
        <Text style={styles.title}>저장한 장소</Text>
        <Text style={styles.subtitle}>찜과 최근 본 장소를 다시 확인하고, 후보를 골라 카카오톡 링크로 투표를 공유할 수 있습니다.</Text>

        <View style={styles.tabs}>
          <MotionPressable onPress={() => setTab('saved')} style={[styles.tab, tab === 'saved' && styles.tabActive]}><Text style={[styles.tabText, tab === 'saved' && styles.tabTextActive]}>찜 {library.saved.length}</Text></MotionPressable>
          <MotionPressable onPress={() => setTab('recent')} style={[styles.tab, tab === 'recent' && styles.tabActive]}><Text style={[styles.tabText, tab === 'recent' && styles.tabTextActive]}>최근 {library.recent.length}</Text></MotionPressable>
        </View>

        {tab === 'recent' && library.recent.length > 0 ? (
          <MotionPressable onPress={async () => { await clearRecentPlaces(); await refresh(); }}><Text style={styles.clearText}>최근 기록 전체 삭제</Text></MotionPressable>
        ) : null}

        {loading ? <ActivityIndicator color="#ff3b36" style={styles.loading} /> : visible.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>{tab === 'saved' ? '아직 찜한 장소가 없습니다.' : '최근 본 장소가 없습니다.'}</Text><Text style={styles.emptyText}>장소 찾기에서 카드를 누르거나 하트 버튼을 선택해 보세요.</Text></View>
        ) : visible.map((place) => {
          const key = libraryPlaceKey(place);
          const selected = selectedKeys.includes(key);
          return (
            <View key={key} style={[styles.card, selected && styles.cardSelected]}>
              <MotionPressable onPress={() => toggleCandidate(place)} style={[styles.selectButton, selected && styles.selectButtonActive]}>
                <Text style={[styles.selectText, selected && styles.selectTextActive]}>{selected ? '✓ 후보 선택됨' : '+ 함께 고르기 후보'}</Text>
              </MotionPressable>
              <Text style={styles.category}>{place.category}</Text><Text style={styles.placeName}>{place.placeName}</Text><Text style={styles.address}>{place.address || [place.region, place.city].filter(Boolean).join(' ')}</Text>
              <RouteMapChooser place={{ name: place.placeName, address: place.address, latitude: place.latitude ?? undefined, longitude: place.longitude ?? undefined }} />
              {tab === 'saved' ? <MotionPressable onPress={() => void removeSaved(place)} style={styles.removeButton}><Text style={styles.removeText}>찜 해제</Text></MotionPressable> : null}
            </View>
          );
        })}

        <View style={styles.pollCard}>
          <Text style={styles.pollEyebrow}>CHOOSE TOGETHER</Text><Text style={styles.pollTitle}>함께 고르기</Text>
          <Text style={styles.pollDescription}>장소 2~5곳을 선택하세요. 상대방은 앱 설치나 가입 없이 공유 링크에서 이름만 입력하고 투표할 수 있습니다.</Text>
          <Text style={styles.label}>투표 제목</Text><TextInput value={title} maxLength={80} onChangeText={setTitle} style={styles.input} />
          <Text style={styles.count}><Text style={styles.countStrong}>{selectedKeys.length}</Text> / 5곳 선택</Text>
          <MotionPressable disabled={working || selectedKeys.length < 2 || !title.trim()} onPress={() => void makePoll()} style={[styles.createButton, (working || selectedKeys.length < 2 || !title.trim()) && styles.disabled]}>
            <Text style={styles.createText}>{working ? '링크 만드는 중' : '카카오톡 투표 링크 만들기'}</Text>
          </MotionPressable>
          <Text style={styles.pollNote}>링크 만들기는 로그인이 필요하며 투표 링크는 14일 동안 사용할 수 있습니다.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f7f4' }, container: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 36 },
  eyebrow: { color: '#ff3b36', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { marginTop: 5, color: '#101010', fontSize: 28, fontWeight: '900' }, subtitle: { marginTop: 8, color: '#71716d', fontSize: 12, lineHeight: 19 },
  tabs: { marginTop: 20, flexDirection: 'row', gap: 8 }, tab: { minHeight: 42, justifyContent: 'center', borderWidth: 1, borderColor: '#dadad4', borderRadius: 999, backgroundColor: '#ffffff', paddingHorizontal: 17 }, tabActive: { borderColor: '#ff3b36', backgroundColor: '#ff3b36' }, tabText: { color: '#333333', fontSize: 12, fontWeight: '900' }, tabTextActive: { color: '#ffffff' }, clearText: { marginTop: 13, color: '#71716d', fontSize: 10, fontWeight: '800' }, loading: { marginVertical: 60 },
  empty: { marginTop: 20, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#dadad4', borderRadius: 20, padding: 42 }, emptyTitle: { color: '#101010', fontSize: 15, fontWeight: '900', textAlign: 'center' }, emptyText: { marginTop: 7, color: '#71716d', fontSize: 11, lineHeight: 17, textAlign: 'center' },
  card: { marginTop: 12, borderWidth: 1, borderColor: '#dadad4', borderRadius: 19, backgroundColor: '#ffffff', padding: 16 }, cardSelected: { borderColor: '#ff3b36', backgroundColor: '#fff9f8' }, selectButton: { alignSelf: 'flex-start', minHeight: 34, justifyContent: 'center', borderWidth: 1, borderColor: '#dadad4', borderRadius: 999, paddingHorizontal: 11 }, selectButtonActive: { borderColor: '#ff3b36', backgroundColor: '#fff0ee' }, selectText: { color: '#454541', fontSize: 10, fontWeight: '900' }, selectTextActive: { color: '#ff3b36' }, category: { marginTop: 15, color: '#ff3b36', fontSize: 10, fontWeight: '900' }, placeName: { marginTop: 4, color: '#101010', fontSize: 18, fontWeight: '900' }, address: { marginTop: 5, marginBottom: 13, color: '#71716d', fontSize: 11, lineHeight: 17 }, removeButton: { minHeight: 38, marginTop: 8, alignItems: 'center', justifyContent: 'center' }, removeText: { color: '#9a3b39', fontSize: 11, fontWeight: '800' },
  pollCard: { marginTop: 24, borderRadius: 22, backgroundColor: '#101010', padding: 20 }, pollEyebrow: { color: '#caff2c', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 }, pollTitle: { marginTop: 6, color: '#ffffff', fontSize: 24, fontWeight: '900' }, pollDescription: { marginTop: 7, color: '#bcbcb6', fontSize: 11, lineHeight: 18 }, label: { marginTop: 18, color: '#ffffff', fontSize: 10, fontWeight: '900' }, input: { minHeight: 46, marginTop: 7, borderWidth: 1, borderColor: '#454541', borderRadius: 13, backgroundColor: '#222222', color: '#ffffff', paddingHorizontal: 12 }, count: { marginTop: 14, color: '#bcbcb6', fontSize: 11, fontWeight: '800' }, countStrong: { color: '#caff2c', fontSize: 25, fontWeight: '900' }, createButton: { minHeight: 50, marginTop: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#ff3b36' }, disabled: { opacity: 0.4 }, createText: { color: '#ffffff', fontSize: 13, fontWeight: '900' }, pollNote: { marginTop: 9, color: '#90908b', fontSize: 9, lineHeight: 14 },
  loginGate: { marginTop: 36, alignItems: 'center', borderWidth: 1, borderColor: '#dadad4', borderRadius: 24, backgroundColor: '#ffffff', paddingHorizontal: 24, paddingVertical: 40 }, loginIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#fff0ee', color: '#ff3b36', fontSize: 38, lineHeight: 68, textAlign: 'center' }, loginEyebrow: { marginTop: 20, color: '#ff3b36', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, loginTitle: { marginTop: 7, color: '#101010', fontSize: 21, fontWeight: '900', textAlign: 'center' }, loginDescription: { marginTop: 10, color: '#71716d', fontSize: 12, lineHeight: 19, textAlign: 'center' }, loginButton: { width: '100%', minHeight: 50, marginTop: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#ff3b36' }, loginButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '900' }, guestLink: { marginTop: 17, color: '#555555', fontSize: 11, fontWeight: '800' },
});
