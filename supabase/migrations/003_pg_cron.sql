-- pg_cron 설정
-- 사전 준비 (대시보드에서 1회):
--   1) Database → Extensions → pg_cron, pg_net 활성화
--   2) service_role 키를 Vault에 저장 (SQL Editor에서 1회, 키 값은 커밋 금지):
--        select vault.create_secret('<service_role_key>', 'service_role_key');
--
-- 참고: Supabase는 SQL Editor 역할에 ALTER DATABASE 권한이 없어
--       current_setting('app.*') 방식을 쓸 수 없으므로 Vault로 비밀값을 읽는다.
--       프로젝트 URL은 공개값이라 직접 기입한다.

-- KOPIS 동기화 매일 새벽 3시 (KST = UTC+9, 즉 UTC 18:00)
select cron.schedule(
  'sync-kopis-daily',
  '0 18 * * *',
  $$
  select net.http_post(
    url := 'https://ujuynatrdhrkxsekxgex.supabase.co/functions/v1/sync-kopis',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
