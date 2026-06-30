-- posts/comments에서 profiles를 embed(조인)할 수 있도록 FK 관계 추가
-- 기존: user_id -> auth.users (PostgREST가 profiles를 못 찾아 PGRST200 발생)
-- profiles.id 자체가 auth.users(id)를 참조하므로 무결성은 그대로 유지된다.

alter table posts
  add constraint posts_user_id_profiles_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

alter table comments
  add constraint comments_user_id_profiles_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

-- PostgREST 스키마 캐시 갱신
notify pgrst, 'reload schema';
