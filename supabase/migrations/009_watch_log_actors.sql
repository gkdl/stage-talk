-- 관람기록 ↔ 배우 다대다 연결 (한 기록에 배우 여러 명)
-- "최애 배우"를 텍스트 파싱 대신 DB 집계로 정확·빠르게 뽑기 위함.

create table if not exists watch_log_actors (
  watch_log_id uuid references watch_logs on delete cascade,
  actor_id uuid references actors on delete cascade,
  primary key (watch_log_id, actor_id)
);

create index if not exists idx_wla_actor on watch_log_actors(actor_id);
create index if not exists idx_wla_log on watch_log_actors(watch_log_id);

alter table watch_log_actors enable row level security;

-- 본인 관람기록에 연결된 것만 접근 (watch_logs 소유권 기준)
create policy "wla_select" on watch_log_actors for select using (
  exists (select 1 from watch_logs w where w.id = watch_log_id and w.user_id = auth.uid())
);
create policy "wla_insert" on watch_log_actors for insert with check (
  exists (select 1 from watch_logs w where w.id = watch_log_id and w.user_id = auth.uid())
);
create policy "wla_delete" on watch_log_actors for delete using (
  exists (select 1 from watch_logs w where w.id = watch_log_id and w.user_id = auth.uid())
);

-- 최애 배우 집계 (caller의 데이터만, p_from 이후로 기간 제한 가능)
-- security invoker(기본) → RLS가 적용되어 본인 데이터만 집계됨
create or replace function favorite_actor(p_from date default null)
returns table (actor_id uuid, name text, cnt bigint)
language sql
stable
set search_path = public
as $$
  select a.id, a.name, count(*)::bigint as cnt
  from watch_log_actors wla
  join watch_logs w on w.id = wla.watch_log_id
  join actors a on a.id = wla.actor_id
  where w.user_id = auth.uid()
    and (p_from is null or w.watch_date >= p_from)
  group by a.id, a.name
  order by cnt desc, a.name asc
  limit 1;
$$;

notify pgrst, 'reload schema';
