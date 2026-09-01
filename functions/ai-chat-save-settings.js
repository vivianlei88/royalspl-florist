export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        const SUPABASE_URL = context.env.SUPABASE_URL || 'https://gefqlrmozxbgfhxgngtg.supabase.co';
        const SERVICE_KEY = context.env.SUPABASE_SERVICE_ROLE_KEY || context.env.SUPABASE_Secret_keys;
        
        const headers = {
            'apikey': SERVICE_KEY,
            'Authorization': 'Bearer ' + SERVICE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
        
        // 检查是否已有记录
        const checkResp = await fetch(SUPABASE_URL + '/rest/v1/ai_chat_settings?select=id&limit=1', { headers });
        const existing = await checkResp.json();
        
        let result;
        if (existing && existing.length > 0) {
            // 更新
            const id = existing[0].id;
            body.updated_at = new Date().toISOString();
            const updateResp = await fetch(SUPABASE_URL + '/rest/v1/ai_chat_settings?id=eq.' + id, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(body)
            });
            result = await updateResp.json();
        } else {
            // 插入
            const insertResp = await fetch(SUPABASE_URL + '/rest/v1/ai_chat_settings', {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });
            result = await insertResp.json();
        }
        
        return Response.json({ success: true, data: result });
    } catch(err) {
        return Response.json({ success: false, error: err.message }, { status: 500 });
    }
}
