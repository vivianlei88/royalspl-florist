export async function onRequestPost(context) {
  const request = context.request;
  const env = context.env;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { page_name } = await request.json();
    
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_Secret_keys || env.SUPABASE_PUBLISHABLE_KEY;

    // 記錄瀏覽
    await fetch(supabaseUrl + '/rest/v1/page_views', {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': 'Bearer ' + supabaseKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page_name: page_name || '未知頁面' }),
    });

    // 創建訪客通知
    await fetch(supabaseUrl + '/rest/v1/visitor_notifications', {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': 'Bearer ' + supabaseKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: '訪客瀏覽了：' + (page_name || '未知頁面'), is_read: false }),
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}