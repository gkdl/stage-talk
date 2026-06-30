import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { colors } from '@/constants/theme';
import { Performance } from '@/types/database';

interface Props {
  item: Performance;
  onPress: () => void;
}

const genrePill = {
  musical: { bg: '#EDE9FE', text: '#5B21B6', label: '뮤지컬', icon: '🎭' },
  play:    { bg: '#FEF3C7', text: '#92400E', label: '연극', icon: '🎬' },
};

const statusPill = {
  ongoing:  { bg: '#6EE7B7', text: '#065F46', label: '공연중' },
  upcoming: { bg: '#DBEAFE', text: '#1E40AF', label: '개막예정' },
  ended:    { bg: '#F3F4F6', text: '#6B7280', label: '종료' },
};

function formatDate(d: string) {
  return d ? d.replace(/-/g, '.') : '';
}

export default function PerformanceCard({ item, onPress }: Props) {
  const genre = genrePill[item.genre as 'musical' | 'play'] ?? genrePill.musical;
  const status = statusPill[item.status as 'ongoing' | 'upcoming' | 'ended'] ?? statusPill.ended;
  const hasPoster = !!item.poster_url;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* 포스터 — 이미지가 있으면 표시, 없으면(수동 등록 등) 장르색 폴백 */}
      {hasPoster ? (
        <Image
          source={{ uri: item.poster_url! }}
          style={styles.poster}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.poster, styles.posterFallback, { backgroundColor: genre.bg }]}>
          <Text style={styles.posterFallbackIcon}>{genre.icon}</Text>
          <Text style={[styles.posterFallbackText, { color: genre.text }]}>{genre.label}</Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.left}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.venue} numberOfLines={1}>{item.venue}</Text>
          <Text style={styles.date}>
            {formatDate(item.start_date)} ~ {formatDate(item.end_date)}
          </Text>
        </View>
        <View style={styles.pills}>
          <View style={[styles.pill, { backgroundColor: genre.bg }]}>
            <Text style={[styles.pillText, { color: genre.text }]}>{genre.label}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: status.bg, marginTop: 6 }]}>
            <Text style={[styles.pillText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    height: 96,
  },
  poster: {
    width: 64,
    height: '100%',
    backgroundColor: '#F3F4F6',
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterFallbackIcon: {
    fontSize: 22,
  },
  posterFallbackText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  left: {
    flex: 1,
    paddingRight: 8,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  venue: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  date: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  pills: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 0,
  },
  pill: {
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 46,
    alignItems: 'center',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
