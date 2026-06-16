import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/constants/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);

  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);

  const currentAvatarUrl = profile?.avatar_url;
  const displayAvatar = avatarUri ?? currentAvatarUrl;
  const firstChar = (nickname || '?').charAt(0);

  const handlePickImage = async () => {
    setIsPickingImage(true);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    setIsPickingImage(false);
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!nickname.trim()) return Alert.alert('닉네임을 입력해주세요');
    if (nickname.trim().length < 2) return Alert.alert('닉네임은 2글자 이상이어야 합니다');

    setIsSaving(true);
    try {
      let avatarUrl = currentAvatarUrl;

      if (avatarUri) {
        const compressed = await ImageManipulator.manipulateAsync(
          avatarUri,
          [{ resize: { width: 400 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
        );
        const response = await fetch(compressed.uri);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const filename = `avatar_${user.id}_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filename, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('avatars').getPublicUrl(filename);
        avatarUrl = data.publicUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ nickname: nickname.trim(), avatar_url: avatarUrl })
        .eq('id', user.id);

      if (error) throw error;

      setProfile({ ...profile!, nickname: nickname.trim(), avatar_url: avatarUrl ?? null });
      Alert.alert('저장되었습니다');
      router.back();
    } catch (e: any) {
      Alert.alert('저장 실패', e.message ?? '잠시 후 다시 시도해주세요');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>프로필 수정</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving}>
          <Text style={[styles.saveText, isSaving && styles.saveDisabled]}>저장</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* 아바타 */}
          <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage} disabled={isPickingImage}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{firstChar}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditIcon}>📷</Text>
            </View>
          </TouchableOpacity>

          {/* 닉네임 */}
          <View style={styles.section}>
            <Text style={styles.label}>닉네임</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder="닉네임을 입력하세요"
              placeholderTextColor={colors.textTertiary}
              maxLength={20}
            />
            <Text style={styles.charCount}>{nickname.length}/20</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {isSaving && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cardBackground },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  cancelText: { fontSize: 15, color: colors.textSecondary },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  saveText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  saveDisabled: { opacity: 0.4 },

  scroll: { alignItems: 'center', paddingTop: 32, paddingHorizontal: 24 },

  avatarContainer: { position: 'relative', marginBottom: 32 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarText: { fontSize: 36, fontWeight: '700', color: '#fff' },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.divider,
  },
  avatarEditIcon: { fontSize: 16 },

  section: { width: '100%' },
  label: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  input: {
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  charCount: { fontSize: 11, color: colors.textTertiary, textAlign: 'right', marginTop: 4 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
