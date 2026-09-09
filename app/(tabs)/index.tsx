import { useState, useCallback, useMemo } from 'react';
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
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';
import { useHomePosts, HomeSort } from '@/hooks/useHomePosts';
import { usePerformances } from '@/hooks/usePerformances';
import PerformanceCard from '@/components/PerformanceCard';
import { useAuthStore } from '@/store/authStore';
import { dedupeById } from '@/utils/dedupeById';
import { formatRelativeTime } from '@/utils/formatTime';

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  '후기(스포없음)': { bg: '#F3F4F6', text: '#6B7280' },
  '후기(스포있음)': { bg: '#FEE2E2', text: '#991B1B' },
  '후기':           { bg: '#FEE2E2', text: '#991B1B' },
  '질문':           { bg: '#DBEAFE', text: '#1E40AF' },
  '정보':           { bg: '#D1FAE5', text: '#065F46' },
  '잡담':           { bg: '#FEF9C3', text: '#713F12' },
  '팁':             { bg: '#D1FAE5', text: '#065F46' },
};

interface PostItem {
  id: string;
  board: string;
  tag: string;
  title: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  performances?: { title: string } | null;
  actors?: { name: string } | null;
  profiles: { nickname: string; avatar_url: string | null };
}

function getBoardLabel(item: PostItem): string {
  if (item.board === 'performance' && item.performances?.title) {
    return item.performances.title;
  }
  if (item.board === 'actor' && item.actors?.name) {
    return `배우 · ${item.actors.name}`;
  }
  if (item.board === 'tips') return '공연 정보·팁';
  return '';
}

function HomePostItem({ item, onPress }: { item: PostItem; onPress: () => void }) {
  const boardLabel = getBoardLabel(item);
  const tagColor = TAG_COLORS[item.tag] ?? { bg: '#F3F4F6', text: '#6B7280' };

  return (
    <Pressable style={styles.postItem} onPress={onPress}>
      {boardLabel ? <Text style={styles.boardLabel}>{boardLabel}</Text> : null}
      <View style={styles.titleRow}>
        <View style={[styles.tagPill, { backgroundColor: tagColor.bg }]}>
          <Text style={[styles.tagText, { color: tagColor.text }]}>{item.tag}</Text>
        </View>
        <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
      </View>
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

const SORT_TABS: { key: HomeSort; label: string }[] = [
  { key: 'likes_count', label: '인기글' },
  { key: 'created_at', label: '최신글' },
  { key: 'following', label: '내 관심' },
];

// 글이 없을 때(런칭 초기 등) 홈에 "지금 공연 중인 작품"을 추천해 빈 화면 방지
function HomeEmptyState() {
  const router = useRouter();
  // 전체를 임박순으로 → 공연중이 먼저, 그다음 개막 임박 순
  const { data } = usePerformances('all', 'all', 'imminent', '');
  const perfs = (data?.pages.flat() ?? []).slice(0, 8);

  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyEmoji}>🎭</Text>
      <Text style={styles.emptyTitle}>아직 후기가 없어요</Text>
      <Text style={styles.emptySub}>관심 있는 공연을 골라 첫 관람 후기를 남겨보세요</Text>

      {perfs.length > 0 && (
        <View style={styles.recSection}>
          <Text style={styles.recTitle}>지금 볼 만한 공연</Text>
          {perfs.map((p) => (
            <PerformanceCard
              key={p.id}
              item={p}
              onPress={() => router.push(`/performance/${p.id}` as never)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [sort, setSort] = useState<HomeSort>('likes_count');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } =
    useHomePosts(sort);

  const posts = useMemo(
    () => dedupeById(data?.pages.flatMap((p) => p.items) ?? []),
    [data],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: PostItem }) => (
      <HomePostItem item={item} onPress={() => router.push(`/post/${item.id}`)} />
    ),
    [router],
  );

  const showFollowingEmpty = sort === 'following' && !user;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>스테이지톡</Text>
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => router.push('/notifications')}
        >
          <Text style={styles.bellEmoji}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* 정렬 탭 */}
      <View style={styles.sortBar}>
        {SORT_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.sortTab}
            onPress={() => setSort(tab.key)}
          >
            <Text style={[styles.sortTabText, sort === tab.key && styles.sortTabActive]}>
              {tab.label}
            </Text>
            {sort === tab.key && <View style={styles.sortUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.divider} />

      {showFollowingEmpty ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>로그인 후 관심 배우·공연의 글을 볼 수 있어요</Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.loginBtnText}>로그인하기</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading ? (
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
            sort === 'following' ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>관심 배우나 공연을 팔로우해보세요</Text>
              </View>
            ) : (
              <HomeEmptyState />
            )
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    backgroundColor: colors.cardBackground,
    height: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  bellButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellEmoji: { fontSize: 16 },

  sortBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    height: 40,
  },
  sortTab: {
    marginRight: 24,
    justifyContent: 'center',
    position: 'relative',
  },
  sortTabText: { fontSize: 13, color: colors.textSecondary },
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
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 70,
    justifyContent: 'center',
  },
  boardLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 6,
  },
  tagPill: {
    borderRadius: 100,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginTop: 1,
  },
  tagText: { fontSize: 10, fontWeight: '500' },
  postTitle: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
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

  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },

  emptyWrap: { paddingTop: 40, paddingBottom: 24 },
  emptyEmoji: { fontSize: 44, textAlign: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: 6 },
  emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 28, paddingHorizontal: 32 },
  recSection: { marginTop: 4 },
  recTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginHorizontal: 20, marginBottom: 12 },
  loginBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  loginBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
