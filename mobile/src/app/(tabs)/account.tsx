import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useSession } from '@/context/session-context';
import { appleAuthorizationCodeForDeletion, clearAppleAuthState } from '@/lib/apple-auth';
import { deleteAccount } from '@/lib/api';
import { appConfig } from '@/lib/config';
import { supabase } from '@/lib/supabase';

function providerLabel(provider: unknown) {
  return ({ google: 'Google', kakao: '카카오', naver: '네이버', apple: 'Apple' } as Record<string, string>)[String(provider)] || '소셜';
}

const supportEmail = 'jjs092200@gmail.com';

function supportGmailUrl(type: 'inquiry' | 'feedback') {
  const isFeedback = type === 'feedback';
  const subject = isFeedback ? '[오늘어디 테스트 피드백]' : '[오늘어디 테스트 문의]';
  const body = isFeedback
    ? '오늘어디 테스트 중 느낀 점이나 개선 의견을 적어 주세요.\n\n사용 기기:\n의견:'
    : '오늘어디 이용 중 궁금한 점이나 문제를 적어 주세요.\n\n사용 기기:\n문의 내용:';
  return `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(supportEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function AccountScreen() {
  const { loading, session } = useSession();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const logout = async () => {
    await supabase.auth.signOut({ scope: 'local' });
  };

  const removeAccount = async () => {
    if (confirmText !== '회원탈퇴' || deleting || !session) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const isApple = session.user.app_metadata.provider === 'apple'
        || session.user.identities?.some((identity) => identity.provider === 'apple');
      const appleCode = isApple ? await appleAuthorizationCodeForDeletion() : undefined;
      const result = await deleteAccount(appleCode);
      await supabase.auth.signOut({ scope: 'local' });
      await clearAppleAuthState();
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
    return <View style={styles.center}><ActivityIndicator color="#146b45" /></View>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>오늘어디</Text>
        <Text style={styles.title}>내 계정</Text>

        {session ? (
          <View style={styles.card}>
            <View style={styles.avatar}><Text style={styles.avatarText}>?</Text></View>
            <Text style={styles.name}>
              {session.user.user_metadata.full_name || session.user.user_metadata.name || '오늘어디 사용자'}
            </Text>
            <Text style={styles.email}>{session.user.email || '이메일 비공개 계정'}</Text>
            <Text style={styles.provider}>
              {providerLabel(session.user.app_metadata.provider)} 로그인 · 모바일 보안 세션
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void logout()} style={styles.outlineButton}>
              <Text style={styles.outlineText}>로그아웃</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setDeleteOpen(true)} style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>회원탈퇴</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>로그인하고 장소를 저장하세요</Text>
            <Text style={styles.cardDescription}>카카오·네이버·Google·Apple 계정을 연결할 수 있습니다.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/login')} style={styles.loginButton}>
              <Text style={styles.loginText}>로그인 / 회원가입</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.links}>
          <Pressable onPress={() => void Linking.openURL(`${appConfig.webUrl}/terms`)}><Text style={styles.link}>이용약관</Text></Pressable>
          <Pressable onPress={() => void Linking.openURL(`${appConfig.webUrl}/privacy`)}><Text style={styles.link}>개인정보처리방침</Text></Pressable>
          <Pressable onPress={() => void Linking.openURL(`${appConfig.webUrl}/account-deletion`)}><Text style={styles.link}>회원탈퇴 안내</Text></Pressable>
          <Pressable onPress={() => void Linking.openURL(supportGmailUrl('inquiry'))}><Text style={styles.link}>문의 접수</Text></Pressable>
          <Pressable onPress={() => void Linking.openURL(supportGmailUrl('feedback'))}><Text style={styles.link}>피드백 보내기</Text></Pressable>
          <Pressable onPress={() => void Linking.openURL(`${appConfig.webUrl}/support`)}><Text style={styles.link}>고객지원 안내</Text></Pressable>
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
              <Pressable
                disabled={deleting}
                onPress={() => { setDeleteOpen(false); setConfirmText(''); setDeleteError(''); }}
                style={styles.cancelDelete}
              >
                <Text style={styles.cancelDeleteText}>취소</Text>
              </Pressable>
              <Pressable
                disabled={confirmText !== '회원탈퇴' || deleting}
                onPress={() => void removeAccount()}
                style={[styles.confirmDelete, (confirmText !== '회원탈퇴' || deleting) && styles.disabledDelete]}
              >
                <Text style={styles.confirmDeleteText}>{deleting ? '삭제 중...' : '영구 탈퇴'}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f8f6' },
  container: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 34 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f8f6' },
  eyebrow: { color: '#146b45', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { marginTop: 5, color: '#17211c', fontSize: 30, fontWeight: '900' },
  card: { marginTop: 22, alignItems: 'center', borderRadius: 24, backgroundColor: '#ffffff', padding: 24 },
  avatar: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 32, backgroundColor: '#146b45' },
  avatarText: { color: '#ffffff', fontSize: 24, fontWeight: '900' },
  name: { marginTop: 14, color: '#1b2821', fontSize: 20, fontWeight: '900' },
  email: { marginTop: 5, color: '#69756e', fontSize: 13 },
  provider: { marginTop: 8, color: '#146b45', fontSize: 12, fontWeight: '800' },
  cardTitle: { color: '#1b2821', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  cardDescription: { marginTop: 8, color: '#69756e', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  loginButton: { width: '100%', marginTop: 20, alignItems: 'center', borderRadius: 14, backgroundColor: '#146b45', paddingVertical: 15 },
  loginText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  outlineButton: { width: '100%', marginTop: 22, alignItems: 'center', borderWidth: 1, borderColor: '#ccd8d1', borderRadius: 14, paddingVertical: 14 },
  outlineText: { color: '#3f4e45', fontSize: 14, fontWeight: '800' },
  deleteButton: { width: '100%', marginTop: 10, alignItems: 'center', borderRadius: 14, paddingVertical: 13 },
  deleteButtonText: { color: '#a43232', fontSize: 13, fontWeight: '800' },
  links: { marginTop: 18, borderRadius: 20, backgroundColor: '#ffffff', paddingHorizontal: 18 },
  link: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8e4', color: '#405047', fontSize: 14, fontWeight: '700', paddingVertical: 16 },
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
