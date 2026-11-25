// 臨時清理端點：按電郵刪除指定會員的 profiles 記錄（不刪 auth 賬號）。
// 安全保護：必須攜帶 x-admin-key；僅接受明確列出的電郵清單。
export async function onRequestPost(context) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
    };
    if (context.request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }
    try {
        const adminKey = context.request.headers.get('x-admin-key') || '';
        if (adminKey !== 'royalspl2024') {
            return Response.json({ error: 'unauthorized' }, { status: 403, headers: corsHeaders });
        }
        const { emails } = await context.request.json();
        if (!Array.isArray(emails) || emails.length === 0) {
            return Response.json({ error: 'emails[] required' }, { status: 400, headers: corsHeaders });
        }
        const SUPABASE_URL = context.env.SUPABASE_URL || 'https://gefqlrmozxbgfhxgngtg.supabase.co';
        const SERVICE_KEY = context.env.SUPABASE_SERVICE_ROLE_KEY || context.env.SUPABASE_Secret_keys;
        if (!SERVICE_KEY) {
            return Response.json({ error: 'missing service key' }, { status: 500, headers: corsHeaders });
        }
        const headers = {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
        };
        const norm = e => String(e || '').trim().toLowerCase();
        const want = emails.map(norm).filter(Boolean);

        const lookup = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,email`, { headers });
        const rows = await lookup.json();
        const toDelete = (Array.isArray(rows) ? rows : []).filter(r => want.includes(norm(r.email)));
        const ids = toDelete.map(r => r.id);

        let deleted = 0; const errors = [];
        for (const id of ids) {
            const del = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}`, {
                method: 'DELETE', headers,
            });
            if (del.ok) deleted++;
            else errors.push({ id, status: del.status, body: (await del.text()).slice(0, 200) });
        }
        return Response.json({ success: true, requested: want.length, deleted, matched: toDelete.length, errors }, { headers: corsHeaders });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
    }
}
