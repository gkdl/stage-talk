-- Storage 버킷 생성 (Supabase 대시보드 SQL Editor에서 실행)

-- post-images 버킷 (게시글 이미지, 공개)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  5242880, -- 5MB
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- comment-images 버킷 (댓글 이미지, 공개)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comment-images',
  'comment-images',
  true,
  5242880, -- 5MB
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- avatars 버킷 (프로필 아바타, 공개)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Storage RLS 정책

-- post-images: 로그인 유저만 업로드, 전체 읽기
create policy "post_images_read" on storage.objects
  for select using (bucket_id = 'post-images');

create policy "post_images_upload" on storage.objects
  for insert with check (
    bucket_id = 'post-images' and auth.uid() is not null
  );

create policy "post_images_delete" on storage.objects
  for delete using (
    bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- comment-images: 로그인 유저만 업로드, 전체 읽기
create policy "comment_images_read" on storage.objects
  for select using (bucket_id = 'comment-images');

create policy "comment_images_upload" on storage.objects
  for insert with check (
    bucket_id = 'comment-images' and auth.uid() is not null
  );

create policy "comment_images_delete" on storage.objects
  for delete using (
    bucket_id = 'comment-images' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- avatars: 본인만 업로드, 전체 읽기
create policy "avatars_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_upload" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and auth.uid() is not null
  );

create policy "avatars_update" on storage.objects
  for update using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );
