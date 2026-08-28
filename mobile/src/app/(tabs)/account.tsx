import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MotionPressable } from '@/components/motion-pressable';
import { useSession } from '@/context/session-context';
import { appleAuthorizationCodeForDeletion, clearAppleAuthState } from '@/lib/apple-auth';
import { deleteAccount } from '@/lib/api';
import { appConfig } from '@/lib/config';
import { getMobileOperationVisitorId } from '@/lib/operations';
import {
  clearMobileLocalData,
  getAnalyticsConsent,
  setAnalyticsConsent,
  type AnalyticsConsent,
} from '@/lib/privacy-preferences';
import { supabase } from '@/lib/supabase';

function providerLabel(provider: unknown) {
  return ({ google: 'Google', kakao: '카카오', naver: '네이버', apple: 'Apple' } as Record<string, string>)[String(provider)] || '소셜';
}

const supportEmail = 'jjs092200@gmail.com';

function supportGmailUrl(type: 'inquiry' | 'feedback') {
  const isFeedback = type === 'feedback';
  const subject = isFeedback ? '[오늘어디 피드백]' : '[오늘어디 문의]';
  const body = isFeedback
    ? '오늘어디 이용 중 느낀 점이나 개선 의견을 적어 주세요.\n\n사용 기기:\n의견:'
    : '오늘어디 이용 중 궁금한 점이나 문제를 적어 주세요.\n\n사용 기기:\n문의 내용:';
  return `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(supportEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function isInternalNaverEmail(email: string | null | undefined) {
  return Boolean(email && /^naver_[a-f0-9]+@auth\.koreapick\.duckdns\.org$/i.test(email));
}

export default function AccountScreen() {
  const { loading, session } = useSession();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [analyticsConsent, setAnalyticsConsentState] = useState<AnalyticsConsent>(null);
  const [analyticsSaving, setAnalyticsSaving] = useState(false);
  const [analyticsMessage, setAnalyticsMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    void getAnalyticsConsent().then((value) => {
      if (!cancelled) setAnalyticsConsentState(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut({ scope: 'local' });
  };

  const updateAnalyticsConsent = async (value: Exclude<AnalyticsConsent, null>) => {
    if (analyticsSaving) return;
    setAnalyticsSaving(true);
    setAnalyticsMessage('');
    try {
      await setAnalyticsConsent(value, session?.user.id);
      setAnalyticsConsentState(value);
      setAnalyticsMessage(
        value === 'granted'
          ? '서비스 개선 데이터 제공을 허용했습니다.'
          : '서비스 개선 데이터 제공을 중단하고 기존 기록 삭제를 요청했습니다.',
      );
    } catch {
      setAnalyticsMessage('설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setAnalyticsSaving(false);
    }
  };

  const removeAccount = async () => {
    if (confirmText !== '회원탈퇴' || deleting || !session) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const isApple = session.user.app_metadata.provider === 'apple'
        || session.user.identities?.some((identity) => identity.provider === 'apple');
      const appleCode = isApple ? await appleAuthorizationCodeForDeletion() : undefined;
      const visitorId = await getMobileOperationVisitorId();
      const result = await deleteAccount({ appleAuthorizationCode: appleCode, visitorId });
      await supabase.auth.signOut({ scope: 'local' });
      await clearAppleAuthState();
      await clearMobileLocalData();
      setDeleteOpen(false);
      setConfirmText('');
      if (result.appleRevocation === 'manual_required') {
        Alert.alert(
          '계정 삭제 완료',
          '오늘어디 계정은 삭제됐습니다. Apple 계정 설정에서 오늘어디 연결도 해제해 주세요.',
          [
            { text: '나중에' },
            { text: 'Apple 설정 열기', onPress: () => void Linking.openURL('https://account.apple.com/account/manage') },
          ],
        );
      } else {
        Alert.alert('회원탈퇴 완료', '오늘어디 계정과 삭제 대상 데이터가 처리되었습니다.');
      }
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : '회원탈퇴 처리 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#ff3b36" /></View>;
  }

  const metadata = session?.user.user_metadata ?? {};
  const provider = session?.user.app_metadata.provider;
  const isNaverAccount = provider === 'naver';
  const profileImage = typeof metadata.avatar_url === 'string' && metadata.avatar_url
    ? metadata.avatar_url
    : typeof metadata.picture === 'string' && metadata.picture
      ? metadata.picture
      : null;
  const rawContactEmail = typeof metadata.contact_email === 'string' && metadata.contact_email.trim()
    ? metadata.contact_email.trim()
    : null;
  const contactEmail = rawContactEmail && !isInternalNaverEmail(rawContactEmail)
    ? rawContactEmail
    : null;
  const authEmail = session?.user.email && !isInternalNaverEmail(session.user.email)
    ? session.user.email
    : null;
  const visibleEmail = contactEmail || authEmail;
  const accountEmailText = isNaverAccount
    ? visibleEmail
      ? `연락처 이메일 · ${visibleEmail}`
      : '연락처 이메일 미제공'
    : visibleEmail || '이메일 비공개 계정';
  const providerText = isNaverAccount
    ? '네이버 로그인 · 연결됨'
    : `${providerLabel(provider)} 로그인 · 안전하게 연결됨`;
  const displayName = session?.user.user_metadata.full_name
    || session?.user.user_metadata.name
    || '오늘어디 사용자';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>오늘어디</Text>
        <Text style={styles.title}>내 계정</Text>

        {session ? (
          <View style={styles.card}>
            {profileImage ? (
              <Image accessibilityLabel="프로필 사진" source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}><Text style={styles.avatarText}>?</Text></View>
            )}
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{accountEmailText}</Text>
            <Text style={[styles.provider, isNaverAccount && styles.naverProvider]}>{providerText}</Text>
            {isNaverAccount ? (
              <Text style={styles.providerNotice}>
                네이버에서 동의한 프로필 정보만 계정 표시와 로그인에 사용합니다.
              </Text>
            ) : null}
            <MotionPressable accessibilityRole="button" onPress={() => void logout()} style={styles.outlineButton}>
              <Text style={styles.outlineText}>로그아웃</Text>
            </MotionPressable>
            <MotionPressable accessibilityRole="button" onPress={() => setDeleteOpen(true)} style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>회원탈퇴</Text>
            </MotionPressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>로그인하고 장소를 저장하세요</Text>
            <Text style={styles.cardDescription}>카카오·네이버·Google·Apple 계정을 연결할 수 있습니다.</Text>
            <MotionPressable accessibilityRole="button" onPress={() => router.push('/login')} style={styles.loginButton}>
              <Text style={styles.loginText}>로그인 / 회원가입</Text>
            </MotionPressable>
          </View>
        )}

        {session && isNaverAccount ? (
          <View style={styles.naverUsageCard}>
            <View style={styles.naverUsageHeader}>
              <View style={styles.naverBadge}><Text style={styles.naverBadgeText}>N</Text></View>
              <View style={styles.naverUsageHeadingCopy}>
                <Text style={styles.naverUsageTitle}>네이버 제공 정보 활용처</Text>
                <Text style={styles.naverUsageSubtitle}>네이버 로그인 시 제공된 정보는 아래 용도로만 사용합니다.</Text>
              </View>
            </View>

            <View style={styles.naverUsageRow}>
              <View style={styles.naverUsageLabelWrap}>
                <Text style={styles.naverUsageLabel}>이름·닉네임</Text>
                <Text style={styles.naverUsageState}>현재 표시: {displayName}</Text>
              </View>
              <Text style={styles.naverUsageValue}>내 계정의 사용자 이름 표시 및 회원 식별</Text>
            </View>

            <View style={styles.naverUsageRow}>
              <View style={styles.naverUsageLabelWrap}>
                <Text style={styles.naverUsageLabel}>이메일</Text>
                <Text style={styles.naverUsageState}>{visibleEmail ? '제공됨' : '미제공'}</Text>
              </View>
              <Text style={styles.naverUsageValue}>연락처 이메일 표시 및 계정 관련 안내에 사용(제공된 경우)</Text>
            </View>

            <View style={styles.naverUsageRow}>
              <View style={styles.naverUsageLabelWrap}>
                <Text style={styles.naverUsageLabel}>프로필 이미지</Text>
                <Text style={styles.naverUsageState}>{profileImage ? '제공됨' : '미제공'}</Text>
              </View>
              <Text style={styles.naverUsageValue}>내 계정 프로필 사진 표시(제공된 경우)</Text>
            </View>

            <View style={[styles.naverUsageRow, styles.naverUsageRowLast]}>
              <View style={styles.naverUsageLabelWrap}>
                <Text style={styles.naverUsageLabel}>네이버 고유 식별자</Text>
                <Text style={styles.naverUsageState}>내부 안전 처리</Text>
              </View>
              <Text style={styles.naverUsageValue}>로그인 회원 식별 및 동일 계정의 중복 가입 방지</Text>
            </View>

            <Text style={styles.naverUsageFootnote}>
              이용자가 네이버 동의 화면에서 허용한 항목만 처리하며, 제공되지 않은 선택 정보는 임의로 생성하거나 외부에 공개하지 않습니다.
            </Text>
          </View>
        ) : null}

        <View style={styles.analyticsCard}>
          <View style={styles.analyticsHeading}>
            <Text style={styles.analyticsTitle}>서비스 개선 데이터</Text>
            <Text style={styles.analyticsState}>
              {analyticsConsent === 'granted'
                ? '현재 허용됨'
                : analyticsConsent === 'denied'
                  ? '현재 허용 안 함'
                  : '선택하지 않음'}
            </Text>
          </View>
          <Text style={styles.analyticsDescription}>
            검색·장소 이용 이벤트와 앱 성능·오류 정보를 최대 90일 동안 품질 개선에 사용합니다. 광고 추적과 정밀 위치에는 사용하지 않습니다.
          </Text>
          <View style={styles.analyticsActions}>
            <MotionPressable
              accessibilityLabel="서비스 개선 데이터 허용 안 함"
              accessibilityRole="button"
              accessibilityState={{ disabled: analyticsSaving, selected: analyticsConsent === 'denied' }}
              disabled={analyticsSaving}
              onPress={() => void updateAnalyticsConsent('denied')}
              style={[
                styles.analyticsChoice,
                analyticsConsent === 'denied' && styles.analyticsChoiceDenied,
                analyticsSaving && styles.analyticsChoiceDisabled,
              ]}
            >
              <Text
                style={[
                  styles.analyticsChoiceText,
                  analyticsConsent === 'denied' && styles.analyticsChoiceTextDenied,
                ]}
              >
                허용 안 함
              </Text>
            </MotionPressable>
            <MotionPressable
              accessibilityLabel="서비스 개선 데이터 허용"
              accessibilityRole="button"
              accessibilityState={{ disabled: analyticsSaving, selected: analyticsConsent === 'granted' }}
              disabled={analyticsSaving}
              onPress={() => void updateAnalyticsConsent('granted')}
              style={[
                styles.analyticsChoice,
                analyticsConsent === 'granted' && styles.analyticsChoiceGranted,
                analyticsSaving && styles.analyticsChoiceDisabled,
              ]}
            >
              <Text
                style={[
                  styles.analyticsChoiceText,
                  analyticsConsent === 'granted' && styles.analyticsChoiceTextGranted,
                ]}
              >
                허용
              </Text>
            </MotionPressable>
          </View>
          {analyticsMessage ? <Text style={styles.analyticsMessage}>{analyticsMessage}</Text> : null}
        </View>

        <View style={styles.links}>
          <MotionPressable onPress={() => void Linking.openURL(`${appConfig.webUrl}/terms`)}><Text style={styles.link}>이용약관</Text></MotionPressable>
          <MotionPressable onPress={() => void Linking.openURL(`${appConfig.webUrl}/privacy`)}><Text style={styles.link}>개인정보처리방침</Text></MotionPressable>
          <MotionPressable onPress={() => void Linking.openURL(`${appConfig.webUrl}/account-deletion`)}><Text style={styles.link}>회원탈퇴 안내</Text></MotionPressable>
          <MotionPressable onPress={() => void Linking.openURL(supportGmailUrl('inquiry'))}><Text style={styles.link}>문의 접수</Text></MotionPressable>
          <MotionPressable onPress={() => void Linking.openURL(supportGmailUrl('feedback'))}><Text style={styles.link}>피드백 보내기</Text></MotionPressable>
          <MotionPressable onPress={() => void Linking.openURL(`${appConfig.webUrl}/support`)}><Text style={styles.link}>고객지원 안내</Text></MotionPressable>
        </View>

        {deleteOpen ? (
          <View style={styles.deleteCard}>
            <Text style={styles.deleteTitle}>계정을 영구 삭제할까요?</Text>
            <Text style={styles.deleteDescription}>
              프로필과 개인 데이터가 삭제되며 복구할 수 없습니다. 계속하려면 회원탈퇴를 입력하세요.
            </Text>
            <TextInput
              accessibilityLabel="회원탈퇴 확인 문구"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!deleting}
              onChangeText={setConfirmText}
              placeholder="회원탈퇴"
              style={styles.deleteInput}
              value={confirmText}
            />
            {deleteError ? <Text style={styles.deleteError}>{deleteError}</Text> : null}
            <View style={styles.deleteActions}>
              <MotionPressable
                disabled={deleting}
                onPress={() => { setDeleteOpen(false); setConfirmText(''); setDeleteError(''); }}
                style={styles.cancelDelete}
              >
                <Text style={styles.cancelDeleteText}>취소</Text>
              </MotionPressable>
              <MotionPressable
                disabled={confirmText !== '회원탈퇴' || deleting}
                onPress={() => void removeAccount()}
                style={[styles.confirmDelete, (confirmText !== '회원탈퇴' || deleting) && styles.disabledDelete]}
              >
                <Text style={styles.confirmDeleteText}>{deleting ? '삭제 중...' : '영구 탈퇴'}</Text>
              </MotionPressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f7f4' },
  container: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 34 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7f7f4' },
  eyebrow: { color: '#ff3b36', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { marginTop: 5, color: '#101010', fontSize: 28, fontWeight: '900' },
  card: { marginTop: 22, alignItems: 'center', borderRadius: 24, backgroundColor: '#ffffff', padding: 24 },
  avatar: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 32, backgroundColor: '#ff3b36' },
  avatarImage: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#f1f1ee' },
  avatarText: { color: '#ffffff', fontSize: 24, fontWeight: '900' },
  name: { marginTop: 14, color: '#101010', fontSize: 20, fontWeight: '900' },
  email: { marginTop: 5, color: '#71716d', fontSize: 13, textAlign: 'center' },
  provider: { marginTop: 8, color: '#ff3b36', fontSize: 12, fontWeight: '800' },
  naverProvider: { color: '#03c75a' },
  providerNotice: { marginTop: 8, color: '#71716d', fontSize: 11, lineHeight: 17, textAlign: 'center' },
  cardTitle: { color: '#101010', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  cardDescription: { marginTop: 8, color: '#71716d', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  loginButton: { width: '100%', marginTop: 20, alignItems: 'center', borderRadius: 14, backgroundColor: '#ff3b36', paddingVertical: 15 },
  loginText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  outlineButton: { width: '100%', marginTop: 22, alignItems: 'center', borderWidth: 1, borderColor: '#dadad4', borderRadius: 14, paddingVertical: 14 },
  outlineText: { color: '#454541', fontSize: 14, fontWeight: '800' },
  deleteButton: { width: '100%', marginTop: 10, alignItems: 'center', borderRadius: 14, paddingVertical: 13 },
  deleteButtonText: { color: '#a43232', fontSize: 13, fontWeight: '800' },
  naverUsageCard: { marginTop: 18, borderWidth: 1, borderColor: '#d6f3e2', borderRadius: 20, backgroundColor: '#ffffff', padding: 18 },
  naverUsageHeader: { flexDirection: 'row', alignItems: 'center' },
  naverBadge: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#03c75a' },
  naverBadgeText: { color: '#ffffff', fontSize: 21, fontWeight: '900' },
  naverUsageHeadingCopy: { flex: 1, paddingLeft: 11 },
  naverUsageTitle: { color: '#101010', fontSize: 17, fontWeight: '900' },
  naverUsageSubtitle: { marginTop: 3, color: '#71716d', fontSize: 11, lineHeight: 17 },
  naverUsageRow: { marginTop: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e6e6e1', paddingBottom: 13 },
  naverUsageRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  naverUsageLabelWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  naverUsageLabel: { color: '#242421', fontSize: 13, fontWeight: '900' },
  naverUsageState: { color: '#03a94c', fontSize: 11, fontWeight: '800' },
  naverUsageValue: { marginTop: 5, color: '#61615c', fontSize: 12, lineHeight: 18 },
  naverUsageFootnote: { marginTop: 15, borderRadius: 12, backgroundColor: '#f4fbf6', color: '#4f6357', fontSize: 11, lineHeight: 17, paddingHorizontal: 12, paddingVertical: 10 },
  analyticsCard: { marginTop: 18, borderWidth: 1, borderColor: '#e2e2dc', borderRadius: 20, backgroundColor: '#ffffff', padding: 18 },
  analyticsHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  analyticsTitle: { flex: 1, color: '#101010', fontSize: 17, fontWeight: '900' },
  analyticsState: { color: '#5f5f5a', fontSize: 11, fontWeight: '800' },
  analyticsDescription: { marginTop: 9, color: '#686863', fontSize: 12, lineHeight: 19 },
  analyticsActions: { marginTop: 14, flexDirection: 'row', gap: 10 },
  analyticsChoice: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#d8d8d2', borderRadius: 12, backgroundColor: '#ffffff', paddingVertical: 12 },
  analyticsChoiceGranted: { borderColor: '#1976d2', backgroundColor: '#eef6ff' },
  analyticsChoiceDenied: { borderColor: '#777771', backgroundColor: '#f2f2ef' },
  analyticsChoiceDisabled: { opacity: 0.55 },
  analyticsChoiceText: { color: '#555550', fontSize: 13, fontWeight: '800' },
  analyticsChoiceTextGranted: { color: '#0f5fae' },
  analyticsChoiceTextDenied: { color: '#333330' },
  analyticsMessage: { marginTop: 11, color: '#565651', fontSize: 11, lineHeight: 17 },
  links: { marginTop: 18, borderRadius: 20, backgroundColor: '#ffffff', paddingHorizontal: 18 },
  link: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#dadad4', color: '#454541', fontSize: 14, fontWeight: '700', paddingVertical: 16 },
  deleteCard: { marginTop: 18, borderWidth: 1, borderColor: '#f0caca', borderRadius: 20, backgroundColor: '#fffafa', padding: 18 },
  deleteTitle: { color: '#7d2424', fontSize: 18, fontWeight: '900' },
  deleteDescription: { marginTop: 8, color: '#694545', fontSize: 13, lineHeight: 20 },
  deleteInput: { marginTop: 15, borderWidth: 1, borderColor: '#dcbaba', borderRadius: 12, backgroundColor: '#ffffff', color: '#2b2525', paddingHorizontal: 13, paddingVertical: 12 },
  deleteError: { marginTop: 10, color: '#a43232', fontSize: 12, lineHeight: 18 },
  deleteActions: { marginTop: 14, flexDirection: 'row', gap: 10 },
  cancelDelete: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#d6d6d6', borderRadius: 12, paddingVertical: 12 },
  cancelDeleteText: { color: '#555555', fontSize: 13, fontWeight: '800' },
  confirmDelete: { flex: 1, alignItems: 'center', borderRadius: 12, backgroundColor: '#a43232', paddingVertical: 12 },
  disabledDelete: { opacity: 0.4 },
  confirmDeleteText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
});
