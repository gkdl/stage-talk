import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleKakaoLogin = async () => {
    setIsLoading(true);
    try {
      // Supabase OAuth + 딥링크 콜백으로 처리
      // 실제 카카오 연동은 Supabase 대시보드에서 Kakao provider 설정 필요
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao' as any,
        options: {
          redirectTo: 'gwanggeuk://auth/callback',
        },
      });

      if (error) throw error;
      // OAuth URL이 열리면 딥링크로 콜백됨 (_layout.tsx의 onAuthStateChange가 처리)
    } catch (e: any) {
      Alert.alert('로그인 실패', e.message ?? '잠시 후 다시 시도해주세요');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 닫기 버튼 */}
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>

      {/* 로고 영역 */}
      <View style={styles.logoArea}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🎭</Text>
        </View>
        <Text style={styles.appName}>관극</Text>
        <Text style={styles.appDesc}>뮤지컬·연극 커뮤니티</Text>
      </View>

      {/* 버튼 영역 */}
      <View style={styles.btnArea}>
        <TouchableOpacity
          style={styles.kakaoBtn}
          onPress={handleKakaoLogin}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#3C1E1E" />
          ) : (
            <>
              <Text style={styles.kakaoIcon}>💬</Text>
              <Text style={styles.kakaoBtnText}>카카오로 계속하기</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.terms}>
          로그인 시 <Text style={styles.termsLink}>이용약관</Text>과{' '}
          <Text style={styles.termsLink}>개인정보처리방침</Text>에 동의합니다
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cardBackground },

  closeBtn: { alignSelf: 'flex-end', padding: 16 },
  closeBtnText: { fontSize: 18, color: colors.textSecondary },

  logoArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoEmoji: { fontSize: 48 },
  appName: { fontSize: 32, fontWeight: '700', color: colors.textPrimary },
  appDesc: { fontSize: 15, color: colors.textSecondary },

  btnArea: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 16,
  },
  kakaoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE500',
    height: 52,
    borderRadius: 12,
    gap: 8,
  },
  kakaoIcon: { fontSize: 20 },
  kakaoBtnText: { fontSize: 15, fontWeight: '600', color: '#3C1E1E' },

  terms: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: { color: colors.primary, textDecorationLine: 'underline' },
});
