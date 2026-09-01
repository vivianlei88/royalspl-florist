export async function onRequestPost(context) {
    try {
        const { members } = await context.request.json();
        const SUPABASE_URL = context.env.SUPABASE_URL || 'https://gefqlrmozxbgfhxgngtg.supabase.co';
        const SERVICE_ROLE_KEY = context.env.SUPABASE_SERVICE_ROLE_KEY || context.env.SUPABASE_Secret_keys;
        
        if (!SERVICE_ROLE_KEY) {
            return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY 未配置' }, { status: 500 });
        }
        
        let results = { success: 0, failed: 0, errors: [] };
        
        for (const member of members) {
            try {
                // 1. 创建 auth 用户
                const authResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
                    method: 'POST',
                    headers: {
                        'apikey': SERVICE_ROLE_KEY,
                        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: member.email,
                        password: 'Temp' + Date.now() + '!',
                        email_confirm: true,
                        user_metadata: { full_name: member.full_name }
                    })
                });
                const authData = await authResp.json();
                if (!authResp.ok) throw new Error(authData.msg || authData.error || '创建用户失败');
                
                const userId = authData.id;
                
                // 2. 创建 profile
                const profileResp = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
                    method: 'POST',
                    headers: {
                        'apikey': SERVICE_ROLE_KEY,
                        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        id: userId,
                        full_name: member.full_name,
                        email: member.email,
                        phone: member.phone,
                        phone2: member.phone2,
                        shipping_address: member.shipping_address,
                        billing_address: member.billing_address,
                        member_status: member.member_status || 'active',
                        tags: member.tags,
                        source: member.source || 'CSV匯入',
                        email_subscription: member.email_subscription || '未訂閱',
                        sms_subscription: member.sms_subscription || '未訂閱',
                        language: member.language || 'zh',
                        last_active: member.last_active || new Date().toISOString(),
                        created_at: member.created_at || new Date().toISOString()
                    })
                });
                if (!profileResp.ok) {
                    const errText = await profileResp.text();
                    throw new Error('创建profile失败: ' + errText);
                }
                
                // 3. 发送重置密码邮件
                await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
                    method: 'POST',
                    headers: {
                        'apikey': SERVICE_ROLE_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: member.email })
                });
                
                results.success++;
            } catch(err) {
                results.failed++;
                results.errors.push({ email: member.email, error: err.message });
            }
        }
        
        return Response.json(results);
    } catch(err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
