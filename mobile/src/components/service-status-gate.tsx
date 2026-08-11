import * as Linking from 'expo-linking';
import { usePathname, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MotionPressable } from '@/components/motion-pressable';
import { appConfig } from '@/lib/config';
import { fetchMobileServiceStatus, type MobileServiceStatus } from '@/lib/service-status';

function dateTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(date);
}

function scheduleText(status: MobileServiceStatus) {
  const start = dateTime(status.startsAt);
  const end = dateTime(status.endsAt);
  if (start && end) return `${start} ~ ${end}`;
  if (end) return `${end}까지`;
  if (start) return `${start}부터`;
  return null;
}

export function ServiceStatusGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<MobileServiceStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [dismissedPartial, setDismissedPartial] = useState<string | null>(null);

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading) setChecking(true);
    try {
      const nextStatus = await fetchMobileServiceStatus();
      setStatus(nextStatus);
      setDismissedPartial((current) => current === nextStatus.updatedAt ? current : null);
    } catch {
      // 상태 API 장애만으로 앱을 잠그지 않습니다.
      setStatus(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    const initialCheck = setTimeout(() => void refresh(), 0);
    const interval = setInterval(() => void refresh(), 60_000);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refresh();
    });
    return () => {
      clearTimeout(initialCheck);
      clearInterval(interval);
      subscription.remove();
    };
  }, [refresh]);

  if (checking && !status) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <View style={styles.brandMark}><Text style={styles.brandMarkText}>K</Text></View>
        <ActivityIndicator color="#ff3b36" />
        <Text style={styles.loadingText}>서비스 상태를 확인하고 있어요.</Text>
      </SafeAreaView>
    );
  }

  const updateRequired = status?.update.required === true;
  const maintenance = status?.mode === 'maintenance';
  const partial = status?.mode === 'partial' && dismissedPartial !== status.updatedAt;
  const pathFeature = pathname.startsWith('/explore')
    ? ['place_search', '장소 찾기'] as const
    : pathname.startsWith('/office')
      ? ['office_dining', '직장인 식사'] as const
      : pathname.startsWith('/saved')
        ? ['saved_places', '저장한 장소'] as const
        : null;
  const disabledFeature = pathFeature && status?.featureFlags[pathFeature[0]] === false ? pathFeature[1] : null;

  if (!status || (!updateRequired && !maintenance && !partial && !disabledFeature)) return children;

  const kind = updateRequired ? 'update' : maintenance ? 'maintenance' : disabledFeature ? 'feature' : 'partial';
  const title = updateRequired ? '필수 업데이트 안내' : disabledFeature ? `${disabledFeature} 기능을 잠시 중지했습니다` : status.title;
  const message = updateRequired
    ? `안정적인 서비스 이용을 위해 오늘어디 ${status.update.minimumVersion} 이상 버전으로 업데이트해 주세요.`
    : disabledFeature ? '운영자가 기능을 점검하고 있습니다. 다른 기능은 정상적으로 이용할 수 있습니다.' : status.message;
  const schedule = scheduleText(status);

  const openUpdate = async () => {
    const updateUrl = status.update.url || new URL('/download', appConfig.webUrl).toString();
    await Linking.openURL(updateUrl);
  };

  return (
    <SafeAreaView style={[styles.noticeScreen, kind === 'maintenance' && styles.maintenanceScreen]}>
      <View style={styles.noticeTop}>
        <View style={[styles.statusDot, kind === 'partial' && styles.partialDot]} />
        <Text style={styles.brand}>오늘어디</Text>
      </View>
      <View style={styles.noticeCard}>
        <Text style={styles.eyebrow}>{kind === 'update' ? 'APP UPDATE' : kind === 'partial' ? 'PARTIAL MAINTENANCE' : kind === 'feature' ? 'FEATURE PAUSED' : 'SERVICE MAINTENANCE'}</Text>
        <Text style={styles.noticeTitle}>{title}</Text>
        <Text style={styles.noticeMessage}>{message}</Text>
        {schedule && !updateRequired ? (
          <View style={styles.schedule}><Text style={styles.scheduleLabel}>점검 시간</Text><Text style={styles.scheduleValue}>{schedule}</Text></View>
        ) : null}
        {!updateRequired && status.affectedFeatures.length > 0 ? (
          <View style={styles.features}>
            <Text style={styles.featuresLabel}>영향받는 기능</Text>
            <View style={styles.featureList}>{status.affectedFeatures.map((feature) => <Text key={feature} style={styles.feature}>{feature}</Text>)}</View>
          </View>
        ) : null}
        {updateRequired ? (
          <MotionPressable accessibilityRole="button" onPress={() => void openUpdate()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>업데이트하기</Text>
          </MotionPressable>
        ) : disabledFeature ? (
          <MotionPressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>홈으로 돌아가기</Text>
          </MotionPressable>
        ) : (
          <MotionPressable accessibilityRole="button" disabled={checking} onPress={() => void refresh(true)} style={[styles.primaryButton, checking && styles.disabled]}>
            {checking ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>다시 확인</Text>}
          </MotionPressable>
        )}
        {partial ? (
          <MotionPressable accessibilityRole="button" onPress={() => setDismissedPartial(status.updatedAt)} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>확인하고 계속 이용</Text>
          </MotionPressable>
        ) : null}
        <Text style={styles.help}>{disabledFeature ? '운영 상태가 정상화되면 별도 업데이트 없이 다시 이용할 수 있습니다.' : '점검 종료 후 다시 확인하면 정상적으로 이용할 수 있습니다.'}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: '#f7f7f4' },
  brandMark: { width: 54, height: 54, marginBottom: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#ff3b36' },
  brandMarkText: { color: '#ffffff', fontSize: 24, fontWeight: '900' },
  loadingText: { color: '#71716d', fontSize: 12, fontWeight: '700' },
  noticeScreen: { flex: 1, paddingHorizontal: 20, backgroundColor: '#f7f7f4' },
  maintenanceScreen: { backgroundColor: '#f5f3ed' },
  noticeTop: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 9 },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff3b36', boxShadow: '0 0 0 5px rgba(255,59,54,0.12)' },
  partialDot: { backgroundColor: '#d99b12', boxShadow: '0 0 0 5px rgba(217,155,18,0.12)' },
  brand: { color: '#101010', fontSize: 15, fontWeight: '900' },
  noticeCard: { width: '100%', maxWidth: 560, marginVertical: 'auto', alignSelf: 'center', borderWidth: 1, borderColor: '#deded8', borderRadius: 26, backgroundColor: '#ffffff', padding: 24 },
  eyebrow: { color: '#ff3b36', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  noticeTitle: { marginTop: 10, color: '#101010', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  noticeMessage: { marginTop: 12, color: '#5f5f59', fontSize: 14, lineHeight: 22 },
  schedule: { marginTop: 22, borderRadius: 15, backgroundColor: '#f3f3ef', padding: 15 },
  scheduleLabel: { color: '#71716d', fontSize: 10, fontWeight: '800' },
  scheduleValue: { marginTop: 5, color: '#101010', fontSize: 13, fontWeight: '900', lineHeight: 20 },
  features: { marginTop: 18 },
  featuresLabel: { color: '#71716d', fontSize: 10, fontWeight: '800' },
  featureList: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  feature: { overflow: 'hidden', borderRadius: 999, color: '#8a5210', backgroundColor: '#fff1d8', paddingHorizontal: 10, paddingVertical: 7, fontSize: 10, fontWeight: '900' },
  primaryButton: { minHeight: 52, marginTop: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#ff3b36' },
  primaryButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  secondaryButton: { minHeight: 48, marginTop: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#d8d8d2', borderRadius: 14 },
  secondaryButtonText: { color: '#454541', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.6 },
  help: { marginTop: 15, color: '#8b8b85', fontSize: 10, lineHeight: 16, textAlign: 'center' },
});
