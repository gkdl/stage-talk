import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/constants/theme';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const handleWithdraw = () => {
    Alert.alert(
      '회원 탈퇴',
      '탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.\n정말 탈퇴하시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              setSession(null);
              router.replace('/');
            } catch {
              Alert.alert('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
            }
          },
        },
      ],
    );
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
        <TouchableOpacity style={styles.item} onPress={handleWithdraw}>
          <Text style={styles.withdrawText}>회원 탈퇴</Text>
        </TouchableOpacity>
      </View>
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
  item: { paddingHorizontal: 16, paddingVertical: 16 },
  withdrawText: { fontSize: 15, color: colors.danger },
});
