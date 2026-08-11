import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { MotionPressable } from '@/components/motion-pressable';
import { appConfig } from '@/lib/config';
import { getAnalyticsConsent, setAnalyticsConsent } from '@/lib/privacy-preferences';

export function PrivacyConsentGate() {
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getAnalyticsConsent().then((value) => setVisible(value === null));
  }, []);

  const choose = async (value: 'granted' | 'denied') => {
    if (saving) return;
    setSaving(true);
    await setAnalyticsConsent(value);
    setVisible(false);
    setSaving(false);
  };

  return (
    <Modal animationType="fade" onRequestClose={() => void choose('denied')} transparent visible={visible}>
      <View style={styles.root}>
        <View accessibilityViewIsModal style={styles.card}>
          <Text style={styles.eyebrow}>선택 동의</Text>
          <Text style={styles.title}>서비스 개선 데이터</Text>
          <Text style={styles.description}>
            검색·장소 이용 이벤트, 앱 성능과 오류 정보를 90일 동안 처리해 품질을 개선합니다.
            광고 추적이나 정밀 위치에는 사용하지 않으며, 허용하지 않아도 모든 필수 기능을 이용할 수 있습니다.
          </Text>
          <MotionPressable onPress={() => void Linking.openURL(`${appConfig.webUrl}/privacy`)}>
            <Text style={styles.link}>개인정보처리방침 보기</Text>
          </MotionPressable>
          <View style={styles.actions}>
            <MotionPressable disabled={saving} onPress={() => void choose('denied')} style={styles.secondary}>
              <Text style={styles.secondaryText}>필수 기능만 사용</Text>
            </MotionPressable>
            <MotionPressable disabled={saving} onPress={() => void choose('granted')} style={styles.primary}>
              <Text style={styles.primaryText}>허용</Text>
            </MotionPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.48)', padding: 20 },
  card: { width: '100%', maxWidth: 520, borderRadius: 24, backgroundColor: '#ffffff', padding: 22 },
  eyebrow: { color: '#ff3b36', fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  title: { marginTop: 7, color: '#101010', fontSize: 22, fontWeight: '900' },
  description: { marginTop: 12, color: '#555550', fontSize: 14, lineHeight: 22 },
  link: { marginTop: 14, color: '#b32d29', fontSize: 13, fontWeight: '800', textDecorationLine: 'underline' },
  actions: { marginTop: 22, flexDirection: 'row', gap: 10 },
  secondary: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#d8d8d2', borderRadius: 13, paddingVertical: 13 },
  secondaryText: { color: '#454541', fontSize: 13, fontWeight: '800' },
  primary: { flex: 1, alignItems: 'center', borderRadius: 13, backgroundColor: '#ff3b36', paddingVertical: 13 },
  primaryText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
});
