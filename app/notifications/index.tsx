import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/constants/theme';
import { formatRelativeTime } from '@/utils/formatTime';

function useNotifications() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 1000 * 60,
  });
}

function useMarkAllRead() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });
}

const TYPE_ICON: Record<string, string> = {
  comment: '💬',
  like: '♥',
  follow: '⭐',
  casting: '📅',
  system: '📢',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { data: notifications = [], isLoading, refetch, isRefetching } = useNotifications();
  const { mutate: markAllRead } = useMarkAllRead();

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <Pressable
        style={[styles.notifItem, !item.is_read && styles.notifUnread]}
        onPress={() => {
          if (item.post_id) router.push(`/post/${item.post_id}`);
        }}
      >
        <Text style={styles.notifIcon}>{TYPE_ICON[item.type] ?? '🔔'}</Text>
        <View style={styles.notifContent}>
          <Text style={styles.notifBody}>{item.body}</Text>
          <Text style={styles.notifTime}>{formatRelativeTime(item.created_at)}</Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </Pressable>
    ),
    [router],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableHeaderBack onPress={() => router.back()} />
        <Text style={styles.headerTitle}>알림</Text>
        <Pressable onPress={() => markAllRead()}>
          <Text style={styles.markRead}>모두 읽음</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>알림이 없습니다</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function TouchableHeaderBack({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.backBtn}>
      <Text style={styles.backBtnText}>←</Text>
    </Pressable>
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
  backBtn: { paddingRight: 12 },
  backBtnText: { fontSize: 20, color: colors.textPrimary },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  markRead: { fontSize: 13, color: colors.primary },

  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  notifUnread: { backgroundColor: '#F5F3FF' },
  notifIcon: { fontSize: 20, marginTop: 1 },
  notifContent: { flex: 1 },
  notifBody: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  notifTime: { fontSize: 11, color: colors.textTertiary, marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },

  separator: { height: 1, backgroundColor: colors.divider },

  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: colors.textSecondary },
});
