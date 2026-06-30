-- 로그인 사용자가 배우 글 작성 시 배우를 직접 등록할 수 있도록 INSERT 허용
-- (001에는 actors에 read 정책만 있어 클라이언트 insert가 RLS에 막혔음)

create policy "actors_insert" on actors
  for insert with check (auth.uid() is not null);

notify pgrst, 'reload schema';
