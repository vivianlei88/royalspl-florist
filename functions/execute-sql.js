// 一次性/内部用：執行受限制的 DDL（僅 ALTER TABLE），用 Supabase service key 經 /pg/query 執行。
// 安全保護：必須攜帶 x-admin-key 請求頭；僅允許 ALTER TABLE 語句。
export async function onRequestPost(context) {
  const request = context.request;
  const env = context.env;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminKey = request.headers.get('x-admin-key') || '';
    const expectedKey = env.ADMIN_EXEC_KEY || 'royalspl2024';
    if (adminKey !== expectedKey) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { sql } = await request.json();
    if (!sql || typeof sql !== 'string') {
      return new Response(JSON.stringify({ error: 'sql required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 僅允許 ALTER TABLE（防止任意 SQL 濫用）
    if (!/^\s*ALTER\s+TABLE/i.test(sql.trim())) {
      return new Response(JSON.stringify({ error: 'only ALTER TABLE allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = env.SUPABASE_URL || 'https://gefqlrmozxbgfhxgngtg.supabase.co';
    const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_Secret_keys;
    if (!SERVICE_KEY) {
      return new Response(JSON.stringify({ error: 'missing service key' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resp = await fetch(SUPABASE_URL + '/pg/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
      },
      body: JSON.stringify({ query: sql }),
    });

    const result = await resp.json();
    return new Response(JSON.stringify(result), {
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
