-- pg_cron 설정 (Supabase 대시보드 SQL Editor에서 실행)
-- pg_cron 확장이 활성화되어 있어야 합니다
-- Supabase 대시보드 → Database → Extensions → pg_cron 활성화 후 실행

-- KOPIS 동기화 매일 새벽 3시 (KST = UTC+9, 즉 UTC 18:00)
select cron.schedule(
  'sync-kopis-daily',
  '0 18 * * *',
  $$
  select net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/sync-kopis',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
