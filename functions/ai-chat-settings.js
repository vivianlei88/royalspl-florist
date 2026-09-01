export async function onRequestGet(context) {
    try {
        const SUPABASE_URL = context.env.SUPABASE_URL || 'https://gefqlrmozxbgfhxgngtg.supabase.co';
        const SERVICE_KEY = context.env.SUPABASE_SERVICE_ROLE_KEY || context.env.SUPABASE_Secret_keys;
        
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/ai_chat_settings?select=welcome_message,whatsapp_number,transfer_keywords,max_fail_count,is_active&limit=1`, {
            headers: {
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`
            }
        });
        const data = await resp.json();
        if (data && data.length > 0) {
            return Response.json(data[0]);
        }
        return Response.json({
            welcome_message: '您好！我是 RoyalSpl AI 客服，有什么可以帮您？🌸',
            whatsapp_number: '85265036907',
            transfer_keywords: '人工,客服,真人,投诉,退款,退貨,投訴,#人工',
            max_fail_count: 2,
            is_active: true
        });
    } catch(err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
