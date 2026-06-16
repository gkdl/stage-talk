import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface PushPayload {
  user_id: string;
  type: 'new_post' | 'casting_update' | 'comment';
  title: string;
  body: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  const payload: PushPayload = await req.json();
  const { user_id, type, title, body, data } = payload;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 알림 기록 저장
  await supabase.from('notifications').insert({
    user_id,
    type,
    performance_id: data?.performance_id ?? null,
    post_id: data?.post_id ?? null,
    is_read: false,
  });

  // TODO: Expo Push Token을 profiles 테이블에서 조회 후 발송
  // const { data: profile } = await supabase
  //   .from('profiles')
  //   .select('push_token')
  //   .eq('id', user_id)
  //   .single();
  // if (profile?.push_token) {
  //   await fetch('https://exp.host/--/api/v2/push/send', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       to: profile.push_token,
  //       title,
  //       body: `${body}\n공식 공지가 아닌 커뮤니티 업데이트 알림입니다`,
  //       data,
  //     }),
  //   });
  // }

  console.log('Push notification queued:', { user_id, type, title, body });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
