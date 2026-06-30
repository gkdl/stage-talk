import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/constants/theme';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [deleting, setDeleting] = useState(false);

  // 플랫폼 공용 확인창 (RNW의 Alert 다중버튼 미지원 → 웹은 window.confirm)
  const confirmDelete = (): Promise<boolean> => {
    const msg =
      '탈퇴하면 프로필·게시글·댓글·관람 기록 등 회원님의 모든 데이터가 영구 삭제되며 복구할 수 없습니다.\n\n정말 탈퇴하시겠어요?';
    if (Platform.OS === 'web') {
      return Promise.resolve(typeof window !== 'undefined' ? window.confirm(msg) : false);
    }
    return new Promise((resolve) => {
      Alert.alert('회원 탈퇴', msg, [
        { text: '취소', style: 'cancel', onPress: () => resolve(false) },
        { text: '탈퇴', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
  };

  const handleWithdraw = async () => {
    if (deleting) return;
    if (!(await confirmDelete())) return;
    setDeleting(true);
    try {
      // 서버(Edge Function)에서 계정 삭제 → 연결 데이터가 on delete cascade로 함께 삭제됨
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      await supabase.auth.signOut();
      setSession(null);
      router.replace('/');
    } catch {
      Alert.alert('오류', '탈퇴 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>계정 설정</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.group}>
        <TouchableOpacity style={styles.item} onPress={handleWithdraw} disabled={deleting}>
          {deleting ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <Text style={styles.withdrawText}>회원 탈퇴</Text>
          )}
        </TouchableOpacity>
      </View>
      <Text style={styles.desc}>
        탈퇴 시 회원님의 모든 데이터(프로필, 게시글, 댓글, 관람 기록 등)가 영구적으로 삭제되며 복구할 수 없습니다.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backBtn: { fontSize: 20, color: colors.textPrimary, width: 40 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  group: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  item: { paddingHorizontal: 16, paddingVertical: 16, alignItems: 'flex-start', minHeight: 52, justifyContent: 'center' },
  withdrawText: { fontSize: 15, color: colors.danger },
  desc: { fontSize: 12, color: colors.textTertiary, lineHeight: 18, marginHorizontal: 20, marginTop: 12 },
});
