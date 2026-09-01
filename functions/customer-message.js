export async function onRequestPost(context) {
    try {
        const { name, phone, message } = await context.request.json();
        
        const SUPABASE_URL = context.env.SUPABASE_URL || 'https://gefqlrmozxbgfhxgngtg.supabase.co';
        const SERVICE_KEY = context.env.SUPABASE_SERVICE_ROLE_KEY || context.env.SUPABASE_Secret_keys;
        
        if (!name || !phone || !message) {
            return Response.json({ error: '请填写完整信息' }, { status: 400 });
        }
        
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/customer_messages`, {
            method: 'POST',
            headers: {
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                name: name,
                phone: phone,
                message: message,
                status: 'unread',
                source: 'ai_chat'
            })
        });
        
        if (resp.ok) {
            return Response.json({ success: true });
        } else {
            const err = await resp.text();
            return Response.json({ error: '保存失败: ' + err }, { status: 500 });
        }
    } catch(err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
