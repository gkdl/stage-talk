import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';
import { ContentBlock } from '@/types/database';

async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1280 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

async function uploadImage(uri: string, bucket: string): Promise<string> {
  const compressedUri = await compressImage(uri);

  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const path = filename;

  const response = await fetch(compressedUri);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

interface CreatePostInput {
  board: 'performance' | 'actor' | 'tips';
  performance_id?: string;
  actor_id?: string;
  tag: string;
  title: string;
  content_blocks: ContentBlock[];
  user_id: string;
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const { mutateAsync: createPost, isPending } = useMutation({
    mutationFn: async (input: CreatePostInput) => {
      const { error } = await supabase.from('posts').insert({
        type: 'general',
        board: input.board,
        performance_id: input.performance_id ?? null,
        actor_id: input.actor_id ?? null,
        tag: input.tag,
        title: input.title,
        content_blocks: input.content_blocks,
        user_id: input.user_id,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      if (variables.performance_id) {
        queryClient.invalidateQueries({ queryKey: ['performance-posts', variables.performance_id] });
      }
      if (variables.actor_id) {
        queryClient.invalidateQueries({ queryKey: ['actor-posts', variables.actor_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  async function pickAndUploadImages(
    existingBlocks: ContentBlock[],
    insertAt: number,
  ): Promise<ContentBlock[]> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 1,
    });

    if (result.canceled) return existingBlocks;

    const assets = result.assets.slice(0, 10);
    setIsUploading(true);
    setUploadProgress(0);

    const uploadedUrls: string[] = [];
    for (let i = 0; i < assets.length; i++) {
      const url = await uploadImage(assets[i].uri, 'post-images');
      uploadedUrls.push(url);
      setUploadProgress(Math.round(((i + 1) / assets.length) * 100));
    }

    setIsUploading(false);
    setUploadProgress(0);

    const imageBlocks: ContentBlock[] = uploadedUrls.map((url) => ({ type: 'image', url }));
    const newBlocks = [...existingBlocks];
    newBlocks.splice(insertAt, 0, ...imageBlocks);
    return newBlocks;
  }

  return { createPost, isPending, pickAndUploadImages, uploadProgress, isUploading };
}
