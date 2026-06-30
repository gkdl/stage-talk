-- 공연 포스터 이미지 URL
-- KOPIS 동기화 시 채워지고, 수동 등록 공연은 직접 업로드한 URL을 넣거나 비워둘 수 있다(폴백 표시).

alter table performances
  add column if not exists poster_url text;

notify pgrst, 'reload schema';
