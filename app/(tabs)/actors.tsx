import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';
import { useActorPosts } from '@/hooks/useActorPosts';
import { useDebounce } from '@/hooks/useDebounce';
import { formatRelativeTime } from '@/utils/formatTime';

type SortType = 'likes_count' | 'created_at';

const ACTOR_COLORS = [
  '#7C3AED', '#2563EB', '#D97706', '#059669', '#DC2626',
  '#9333EA', '#1D4ED8', '#B45309', '#047857', '#B91C1C',
];

function getActorColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return ACTOR_COLORS[Math.abs(hash) % ACTOR_COLORS.length];
}

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  '후기':     { bg: '#FEE2E2', text: '#991B1B' },
  '질문':     { bg: '#DBEAFE', text: '#1E40AF' },
  '정보':     { bg: '#D1FAE5', text: '#065F46' },
  '잡담':     { bg: '#FEF9C3', text: '#713F12' },
};

interface PostItem {
  id: string;
  title: string;
  tag: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  actors?: { name: string } | null;
  profiles: { nickname: string; avatar_url: string | null };
}

function ActorPostItem({ item, onPress }: { item: PostItem; onPress: () => void }) {
  const actorName = item.actors?.name ?? '배우';
  const firstChar = actorName.charAt(0);
  const bgColor = getActorColor(actorName);
  const tagColor = TAG_COLORS[item.tag] ?? { bg: '#F3F4F6', text: '#6B7280' };

  return (
    <Pressable style={styles.postItem} onPress={onPress}>
      <View style={styles.actorRow}>
        <View style={[styles.actorAvatar, { backgroundColor: bgColor }]}>
          <Text style={styles.actorAvatarText}>{firstChar}</Text>
        </View>
        <Text style={styles.actorName}>{actorName}</Text>
        <View style={[styles.tagPill, { backgroundColor: tagColor.bg }]}>
          <Text style={[styles.tagText, { color: tagColor.text }]}>{item.tag}</Text>
        </View>
      </View>
      <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{item.profiles.nickname}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.metaText}>{formatRelativeTime(item.created_at)}</Text>
        <View style={styles.metaSpacer} />
        <Text style={styles.likeText}>♥ {item.likes_count}</Text>
        <Text style={styles.commentText}>  💬 {item.comments_count}</Text>
      </View>
    </Pressable>
  );
}

export default function ActorsScreen() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState<SortType>('likes_count');
  const search = useDebounce(searchInput, 400);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useActorPosts(search, sort);

  const posts = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: PostItem }) => (
      <ActorPostItem
        item={item}
        onPress={() => router.push(`/post/${item.id}`)}
      />
    ),
    [router],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>배우</Text>
      </View>

      {/* 검색바 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="배우 이름으로 검색"
            placeholderTextColor={colors.textTertiary}
            value={searchInput}
            onChangeText={setSearchInput}
            returnKeyType="search"
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={() => setSearchInput('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 정렬 탭 */}
      <View style={styles.sortBar}>
        {(['likes_count', 'created_at'] as SortType[]).map((s) => (
          <TouchableOpacity key={s} style={styles.sortTab} onPress={() => setSort(s)}>
            <Text style={[styles.sortTabText, sort === s && styles.sortTabActive]}>
              {s === 'likes_count' ? '인기글' : '최신글'}
            </Text>
            {sort === s && <View style={styles.sortUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.divider} />

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts as PostItem[]}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage
              ? () => <ActivityIndicator color={colors.primary} style={{ padding: 16 }} />
              : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {search ? `"${search}" 관련 게시글이 없습니다` : '게시글이 없습니다'}
              </Text>
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

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/write?board=actor')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>✏️</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },

  searchContainer: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 36,
    gap: 6,
  },
  searchIcon: { fontSize: 13 },
  searchInput: { flex: 1, fontSize: 13, color: colors.textPrimary, padding: 0 },
  clearBtn: { fontSize: 12, color: colors.textTertiary, paddingHorizontal: 4 },

  sortBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    height: 36,
  },
  sortTab: {
    marginRight: 24,
    justifyContent: 'center',
    position: 'relative',
  },
  sortTabText: { fontSize: 12, color: colors.textSecondary },
  sortTabActive: { color: colors.primary, fontWeight: '600' },
  sortUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },

  divider: { height: 1, backgroundColor: colors.divider },

  postItem: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    minHeight: 70,
  },
  actorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  actorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actorAvatarText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  actorName: { fontSize: 11, fontWeight: '600', color: colors.textPrimary },
  tagPill: {
    borderRadius: 100,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: { fontSize: 10, fontWeight: '500' },

  postTitle: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: { fontSize: 11, color: colors.textTertiary },
  metaDot: { fontSize: 11, color: '#D1D5DB', marginHorizontal: 3 },
  metaSpacer: { flex: 1 },
  likeText: { fontSize: 11, fontWeight: '500', color: colors.primary },
  commentText: { fontSize: 11, color: colors.textTertiary },

  separator: { height: 1, backgroundColor: colors.divider },

  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: colors.textSecondary },

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 96,
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
  fabIcon: { fontSize: 24 },
});
