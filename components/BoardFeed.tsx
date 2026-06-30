import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';
import { useBoardPosts, BoardGenre, BoardSort } from '@/hooks/useBoardPosts';
import PostListItem from '@/components/PostListItem';
import { formatRelativeTime } from '@/utils/formatTime';
import { dedupeById } from '@/utils/dedupeById';

interface BoardPost {
  id: string;
  tag: string;
  title: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  performances?: { title: string; genre: string } | null;
  profiles: { nickname: string; avatar_url: string | null };
}

const GENRE_FILTERS: { label: string; value: BoardGenre }[] = [
  { label: '전체', value: 'all' },
  { label: '뮤지컬', value: 'musical' },
  { label: '연극', value: 'play' },
];

const SORT_TABS: { label: string; value: BoardSort }[] = [
  { label: '인기글', value: 'likes_count' },
  { label: '최신글', value: 'created_at' },
];

// 공연(연극·뮤지컬) 게시글 피드 — 공연 탭의 "게시판" 서브탭에서 사용.
export default function BoardFeed() {
  const router = useRouter();
  const [genre, setGenre] = useState<BoardGenre>('all');
  const [sort, setSort] = useState<BoardSort>('likes_count');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } =
    useBoardPosts(genre, sort);

  const posts = useMemo(
    () => dedupeById(data?.pages.flatMap((p) => p.items as unknown as BoardPost[]) ?? []),
    [data],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: BoardPost }) => (
      <PostListItem
        boardLabel={item.performances?.title ?? '공연'}
        tag={item.tag}
        title={item.title}
        author={item.profiles?.nickname ?? '알 수 없음'}
        timeAgo={formatRelativeTime(item.created_at)}
        likesCount={item.likes_count}
        commentsCount={item.comments_count}
        onPress={() => router.push(`/post/${item.id}`)}
      />
    ),
    [router],
  );

  return (
    <View style={styles.container}>
      {/* 장르 필터 */}
      <View style={styles.filterRow}>
        {GENRE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterPill, genre === f.value && styles.filterPillActive]}
            onPress={() => setGenre(f.value)}
          >
            <Text style={[styles.filterText, genre === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        {SORT_TABS.map((s) => (
          <TouchableOpacity key={s.value} onPress={() => setSort(s.value)} style={styles.sortBtn}>
            <Text style={[styles.sortText, sort === s.value && styles.sortTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={
            isFetchingNextPage
              ? () => <ActivityIndicator color={colors.primary} style={{ padding: 16 }} />
              : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>아직 게시글이 없어요</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 8,
  },
  filterPill: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.cardBackground,
  },
  filterPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },
  filterTextActive: { color: '#FFFFFF' },
  sortBtn: { paddingHorizontal: 4 },
  sortText: { fontSize: 12, color: colors.textTertiary },
  sortTextActive: { color: colors.primary, fontWeight: '600' },
  separator: { height: 1, backgroundColor: colors.divider },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: colors.textSecondary },
});
