import { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/constants/theme';
import { formatRelativeTime } from '@/utils/formatTime';

function useActor(actorId: string) {
  return useQuery({
    queryKey: ['actor', actorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('actors')
        .select('*')
        .eq('id', actorId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!actorId,
  });
}

function useActorFollow(actorId: string) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: isFollowing = false } = useQuery({
    queryKey: ['actor-follow', actorId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('actor_follows')
        .select('id')
        .eq('user_id', user.id)
        .eq('actor_id', actorId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const { mutate: toggleFollow } = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다');
      if (isFollowing) {
        await supabase
          .from('actor_follows')
          .delete()
          .eq('user_id', user.id)
          .eq('actor_id', actorId);
      } else {
        await supabase
          .from('actor_follows')
          .insert({ user_id: user.id, actor_id: actorId });
      }
    },
    onMutate: () => {
      queryClient.setQueryData(['actor-follow', actorId, user?.id], !isFollowing);
    },
    onError: () => {
      queryClient.setQueryData(['actor-follow', actorId, user?.id], isFollowing);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['actor-follow', actorId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['actor-follows-list', user?.id] });
    },
  });

  return { isFollowing, toggleFollow };
}

function useActorPostList(actorId: string) {
  return useQuery({
    queryKey: ['actor-posts-detail', actorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles!inner(nickname, avatar_url)')
        .eq('actor_id', actorId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!actorId,
  });
}

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  '후기': { bg: '#FEE2E2', text: '#991B1B' },
  '질문': { bg: '#DBEAFE', text: '#1E40AF' },
  '정보': { bg: '#D1FAE5', text: '#065F46' },
  '잡담': { bg: '#FEF9C3', text: '#713F12' },
};

export default function ActorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: actor, isLoading: actorLoading } = useActor(id!);
  const { isFollowing, toggleFollow } = useActorFollow(id!);
  const { data: posts = [], isLoading: postsLoading, refetch, isRefetching } = useActorPostList(id!);

  const actorName = actor?.name ?? '';
  const firstChar = actorName.charAt(0);

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const tagColor = TAG_COLORS[item.tag] ?? { bg: '#F3F4F6', text: '#6B7280' };
      return (
        <Pressable
          style={styles.postItem}
          onPress={() => router.push(`/post/${item.id}`)}
        >
          <View style={styles.tagRow}>
            <View style={[styles.tagPill, { backgroundColor: tagColor.bg }]}>
              <Text style={[styles.tagText, { color: tagColor.text }]}>{item.tag}</Text>
            </View>
          </View>
          <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{item.profiles.nickname}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{formatRelativeTime(item.created_at)}</Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.likeText}>♥ {item.likes_count}</Text>
            <Text style={styles.commentText}>  💬 {item.comments_count}</Text>
          </View>
        </Pressable>
      );
    },
    [router],
  );

  if (actorLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{actorName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={styles.actorCard}>
            <View style={styles.actorAvatar}>
              <Text style={styles.actorAvatarText}>{firstChar}</Text>
            </View>
            <Text style={styles.actorName}>{actorName}</Text>
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={() => toggleFollow()}
            >
              <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                {isFollowing ? '팔로잉' : '팔로우'}
              </Text>
            </TouchableOpacity>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          !postsLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>게시글이 없습니다</Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push(`/write?board=actor&actorId=${id}`)}
      >
        <Text style={styles.fabIcon}>✏️</Text>
      </TouchableOpacity>
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

  actorCard: {
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    paddingVertical: 28,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  actorAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actorAvatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  actorName: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  followBtn: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  followingBtn: { backgroundColor: '#EDE9FE' },
  followBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  followingBtnText: { color: colors.primary },

  postItem: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 70,
  },
  tagRow: { marginBottom: 4 },
  tagPill: { alignSelf: 'flex-start', borderRadius: 100, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontSize: 10, fontWeight: '500' },
  postTitle: { fontSize: 13, color: colors.textPrimary, lineHeight: 18, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 11, color: colors.textTertiary },
  metaDot: { fontSize: 11, color: '#D1D5DB', marginHorizontal: 3 },
  likeText: { fontSize: 11, fontWeight: '500', color: colors.primary },
  commentText: { fontSize: 11, color: colors.textTertiary },

  separator: { height: 1, backgroundColor: colors.divider },
  emptyContainer: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: colors.textSecondary },

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fabIcon: { fontSize: 22 },
});
