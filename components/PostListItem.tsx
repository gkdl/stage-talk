import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, tagColors } from '@/constants/theme';

interface Props {
  boardLabel: string;
  tag: string;
  title: string;
  author: string;
  timeAgo: string;
  likesCount: number;
  commentsCount: number;
  onPress: () => void;
  extraTags?: string[];
}

function TagPill({ label }: { label: string }) {
  const tc = tagColors[label] ?? { bg: '#F3F4F6', text: '#6B7280' };
  return (
    <View style={[styles.pill, { backgroundColor: tc.bg }]}>
      <Text style={[styles.pillText, { color: tc.text }]}>{label}</Text>
    </View>
  );
}

export default function PostListItem({
  boardLabel,
  tag,
  title,
  author,
  timeAgo,
  likesCount,
  commentsCount,
  onPress,
  extraTags,
}: Props) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.board}>{boardLabel}</Text>
      <View style={styles.tagRow}>
        <TagPill label={tag} />
        {extraTags?.map((t) => <TagPill key={t} label={t} />)}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={styles.author}>{author}</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.time}>{timeAgo}</Text>
        <View style={styles.metaRight}>
          <Text style={styles.likes}>♥ {likesCount}</Text>
          <Text style={styles.comments}>💬 {commentsCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 70,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    justifyContent: 'center',
  },
  board: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'nowrap',
    marginBottom: 4,
  },
  pill: {
    borderRadius: 100,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '500',
  },
  title: {
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  author: { fontSize: 11, color: colors.textTertiary },
  dot: { fontSize: 11, color: '#D1D5DB', marginHorizontal: 3 },
  time: { fontSize: 11, color: colors.textTertiary },
  metaRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  likes: { fontSize: 11, color: colors.primary, fontWeight: '500' },
  comments: { fontSize: 11, color: colors.textTertiary },
});
