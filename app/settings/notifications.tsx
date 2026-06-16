import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { colors } from '@/constants/theme';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [commentNotif, setCommentNotif] = useState(true);
  const [likeNotif, setLikeNotif] = useState(true);
  const [castingNotif, setCastingNotif] = useState(true);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림 설정</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.group}>
        <View style={styles.item}>
          <Text style={styles.itemLabel}>댓글 알림</Text>
          <Switch value={commentNotif} onValueChange={setCommentNotif} trackColor={{ true: colors.primary }} />
        </View>
        <View style={styles.divider} />
        <View style={styles.item}>
          <Text style={styles.itemLabel}>좋아요 알림</Text>
          <Switch value={likeNotif} onValueChange={setLikeNotif} trackColor={{ true: colors.primary }} />
        </View>
        <View style={styles.divider} />
        <View style={styles.item}>
          <Text style={styles.itemLabel}>캐스팅 업데이트 알림</Text>
          <Switch value={castingNotif} onValueChange={setCastingNotif} trackColor={{ true: colors.primary }} />
        </View>
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
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemLabel: { fontSize: 15, color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.divider },
});
