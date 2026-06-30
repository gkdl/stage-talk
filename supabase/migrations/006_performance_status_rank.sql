-- "공연 임박순" 정렬용 상태 우선순위 컬럼
-- status가 영문 텍스트(ended/ongoing/upcoming)라 알파벳순 정렬 시 ended가 맨 앞에 오는 문제 해결.
-- 원하는 순서: 공연중(0) → 공연예정(1) → 종료(2)

alter table performances
  add column if not exists status_rank smallint
  generated always as (
    case status
      when 'ongoing' then 0
      when 'upcoming' then 1
      when 'ended' then 2
      else 3
    end
  ) stored;

notify pgrst, 'reload schema';
