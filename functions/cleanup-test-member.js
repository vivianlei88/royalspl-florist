// 臨時內部工具：清理收錄功能測試殘留的 auth 用戶與 profile（email 前綴 sync-test-）。
// 鑒權：x-admin-key；用完後可刪除本文件。
export async function onRequestPost(context) {
    const request = context.request;
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    const adminKey = request.headers.get('x-admin-key') || '';
    if (adminKey !== 'royalspl2024') {
        return Response.json({ error: 'unauthorized' }, { status: 403, headers: corsHeaders });
    }

    try {
        const SUPABASE_URL = context.env.SUPABASE_URL || 'https://gefqlrmozxbgfhxgngtg.supabase.co';
        const SERVICE_KEY = context.env.SUPABASE_SERVICE_ROLE_KEY || context.env.SUPABASE_Secret_keys;
        const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

        // 1. 列出並刪除測試 auth 用戶（profile 由外鍵級聯刪除）
        const uResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?perPage=1000`, { headers });
        const uData = await uResp.json();
        const users = (uData && (uData.users || uData)) || [];
        const testUsers = users.filter(u => u.email && String(u.email).startsWith('sync-test-'));
        let deletedAuth = 0;
        for (const u of testUsers) {
            const d = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${u.id}`, { method: 'DELETE', headers });
            if (d.ok) deletedAuth++;
        }

        // 2. 兜底刪除未級聯的測試 profile
        const pResp = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=like.sync-test-*`, {
            method: 'DELETE',
            headers: { ...headers, Prefer: 'return=representation' },
        });
        const pData = await pResp.json();
        const deletedProfiles = Array.isArray(pData) ? pData.length : 0;

        return Response.json({ success: true, deletedAuth, deletedProfiles }, { headers: corsHeaders });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
    }
}
