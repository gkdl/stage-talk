-- 신규 가입(auth.users insert) 시 profiles 행 자동 생성
-- 카카오 OAuth 메타데이터에서 닉네임/프로필 이미지를 추출한다.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'nickname',
      new.raw_user_meta_data->>'user_name',
      '사용자'
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 트리거 생성 이전에 가입한 기존 유저 backfill
insert into public.profiles (id, nickname, avatar_url)
select
  u.id,
  coalesce(
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'nickname',
    u.raw_user_meta_data->>'user_name',
    '사용자'
  ),
  coalesce(
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture'
  )
from auth.users u
on conflict (id) do nothing;
