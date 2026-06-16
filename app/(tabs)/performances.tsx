import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';
import { usePerformances } from '@/hooks/usePerformances';
import PerformanceCard from '@/components/PerformanceCard';
import { Performance } from '@/types/database';

type Genre = 'all' | 'musical' | 'play';
type Tab = 'list' | 'tips';

const GENRE_FILTERS: { label: string; value: Genre }[] = [
  { label: '전체', value: 'all' },
  { label: '뮤지컬', value: 'musical' },
  { label: '연극', value: 'play' },
];

export default function PerformancesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [genre, setGenre] = useState<Genre>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } =
    usePerformances(genre, debouncedSearch);

  const performances = data?.pages.flat() ?? [];

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearch(text);
      if (searchTimer) clearTimeout(searchTimer);
      const t = setTimeout(() => setDebouncedSearch(text), 400);
      setSearchTimer(t);
    },
    [searchTimer],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: Performance }) => (
      <PerformanceCard
        item={item}
        onPress={() => router.push(`/performance/${item.id}` as never)}
      />
    ),
    [router],
  );

  const ListEmpty = useCallback(
    () =>
      isLoading ? null : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {debouncedSearch ? `"${debouncedSearch}" 검색 결과가 없어요` : '등록된 공연이 없어요'}
          </Text>
        </View>
      ),
    [isLoading, debouncedSearch],
  );

  const ListFooter = useCallback(
    () =>
      isFetchingNextPage ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
      ) : null,
    [isFetchingNextPage],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>공연</Text>
      </View>

      {/* 검색바 */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="공연명 검색"
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={handleSearchChange}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); }}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 상단 탭: 공연 목록 / 정보·팁 */}
      <View style={styles.tabRow}>
        <TouchableOpacity onPress={() => setActiveTab('list')} style={styles.tab}>
          <Text style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}>
            공연 목록
          </Text>
          {activeTab === 'list' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('tips')} style={styles.tab}>
          <Text style={[styles.tabText, activeTab === 'tips' && styles.tabTextActive]}>
            정보·팁
          </Text>
          {activeTab === 'tips' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
      </View>
      <View style={styles.tabDivider} />

      {activeTab === 'list' ? (
        <>
          {/* 장르 필터 */}
          <View style={styles.filterRow}>
            {GENRE_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.value}
                style={[styles.filterPill, genre === f.value && styles.filterPillActive]}
                onPress={() => setGenre(f.value)}
              >
                <Text
                  style={[styles.filterText, genre === f.value && styles.filterTextActive]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 공연 리스트 */}
          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <FlatList
              data={performances}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.3}
              ListEmptyComponent={ListEmpty}
              ListFooterComponent={ListFooter}
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
        </>
      ) : (
        <View style={styles.tipsEmpty}>
          <Text style={styles.emptyText}>정보·팁 게시판은 준비 중이에요</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    backgroundColor: colors.cardBackground,
    height: 56,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  searchWrap: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 14, marginRight: 6 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  clearBtn: {
    fontSize: 13,
    color: colors.textTertiary,
    paddingHorizontal: 4,
  },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 20,
  },
  tab: {
    marginRight: 24,
    paddingBottom: 10,
    position: 'relative',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textTertiary,
  },
  tabTextActive: {
    fontWeight: '600',
    color: colors.primary,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  tabDivider: {
    height: 1,
    backgroundColor: colors.divider,
  },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterPill: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.cardBackground,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },

  listContent: {
    paddingTop: 4,
    paddingBottom: 16,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  tipsEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
