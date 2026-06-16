import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';

const INQUIRY_EMAIL = 'support@gwanggeuk.app';

export default function InquiryScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>문의하기</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.content}>
        <Text style={styles.desc}>불편한 점이나 개선 요청 사항이 있다면{'\n'}이메일로 문의해주세요</Text>
        <TouchableOpacity
          style={styles.emailBtn}
          onPress={() => Linking.openURL(`mailto:${INQUIRY_EMAIL}`)}
        >
          <Text style={styles.emailBtnText}>이메일 문의하기</Text>
        </TouchableOpacity>
        <Text style={styles.email}>{INQUIRY_EMAIL}</Text>
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
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  desc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  emailBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  emailBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  email: { fontSize: 12, color: colors.textTertiary },
});
