export async function onRequestPost(context) {
    try {
        const { message, history, productInfo, userEmail, userOrders } = await context.request.json();
        
        const API_KEY = context.env.DOUBAO_SEED_2_0_MINI_API_KEY;
        const MODEL_ID = 'doubao-seed-2-0-mini-260428';
        const BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
        const SUPABASE_URL = context.env.SUPABASE_URL || 'https://gefqlrmozxbgfhxgngtg.supabase.co';
        const SERVICE_KEY = context.env.SUPABASE_SERVICE_ROLE_KEY || context.env.SUPABASE_Secret_keys;
        
        if (!API_KEY) {
            return Response.json({ error: 'AI 服务未配置' }, { status: 500 });
        }
        
        // 从数据库读取设置
        let systemPrompt = '';
        let language = 'auto';
        try {
            const resp = await fetch(`${SUPABASE_URL}/rest/v1/ai_chat_settings?select=system_prompt,language,is_active&limit=1`, {
                headers: {
                    'apikey': SERVICE_KEY,
                    'Authorization': `Bearer ${SERVICE_KEY}`
                }
            });
            const settings = await resp.json();
            if (settings && settings.length > 0) {
                systemPrompt = settings[0].system_prompt || '';
                language = settings[0].language || 'auto';
                if (settings[0].is_active === false) {
                    return Response.json({ reply: '抱歉，AI 客服目前未啟用，請點擊「轉人工客服」聯繫我們。' });
                }
            }
        } catch(e) {
            console.error('读取设置失败:', e);
        }
        
        // 默认提示词
        if (!systemPrompt) {
            systemPrompt = `你是 RoyalSpl Florist 香港花店的 AI 客服。
品牌：RoyalSpl Florist，香港本地高端花店。
主要产品：韩式花束、日式花艺、法式田园风、花店手打感花束。
回答规则：
1. 语气亲切专业
2. 不知道的问题不要编造，建议转人工客服
3. 回答简洁，不超过100字`;
        }
        
        // 多语言规则
        systemPrompt += '\n\n【多语言规则】请根据用户输入的语言自动切换回答语言：用户用繁体中文就用繁体中文回答，用广东话/粤语就用广东话回答，用英文就用英文回答。不要主动切换语言，跟随用户的语言。';
        
        // 商品推荐能力
        systemPrompt += '\n\n【商品推荐】如果用户询问推荐商品、想买花、有什么花束、送礼推荐等，从下方商品列表中推荐最合适的商品，并给出商品链接（格式：商品名称 - 价格 - 链接：/product-detail.html?id=商品ID）。如果商品列表为空，告诉用户可以浏览我们的商品页面 /products.html。';
        
        // 查询热门商品
        let productsContext = '';
        try {
            const prodResp = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,name_zh,name_en,price,category&is_active=eq.true&order=created_at.desc&limit=15`, {
                headers: {
                    'apikey': SERVICE_KEY,
                    'Authorization': `Bearer ${SERVICE_KEY}`
                }
            });
            const products = await prodResp.json();
            if (products && products.length > 0) {
                productsContext = '\n\n【可推荐商品列表】\n' + products.map(p => 
                    `ID:${p.id} | ${p.name_zh || p.name_en} | HK$${p.price} | 分类:${p.category || ''}`
                ).join('\n');
            }
        } catch(e) { console.error('查询商品失败:', e); }
        
        // 当前浏览商品
        if (productInfo) {
            productsContext += `\n\n【用户当前浏览的商品】ID:${productInfo.id} | ${productInfo.name} | ${productInfo.price || ''}`;
        }
        
        // 用户订单信息
        if (userOrders && userOrders.length > 0) {
            systemPrompt += '\n\n【订单查询】用户询问订单状态、我的订单、订单进度时，从下方订单列表中查找并回答。订单详情链接格式：/order-detail.html?id=订单ID';
            productsContext += '\n\n【用户最近订单】\n' + userOrders.map(o => 
                `订单号:${o.order_code || o.id} | 状态:${o.status} | 金额:HK$${o.total} | 日期:${o.created_at?.substring(0,10) || ''} | 链接:/order-detail.html?id=${o.id}`
            ).join('\n');
        } else if (userEmail) {
            systemPrompt += '\n\n用户已登录，邮箱：' + userEmail + '。如果用户询问订单但没有订单信息，告诉用户暂时没有订单记录，可以去选购商品。';
        }
        
        systemPrompt += productsContext;
        
        // 构建消息
        let messages = [{ role: 'system', content: systemPrompt }];
        if (history && Array.isArray(history)) {
            messages = messages.concat(history.slice(-6));
        }
        messages.push({ role: 'user', content: message });
        
        const resp = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL_ID,
                messages: messages,
                max_tokens: 800,
                temperature: 0.7
            })
        });
        
        const data = await resp.json();
        if (data.choices && data.choices[0]) {
            return Response.json({ 
                reply: data.choices[0].message.content,
                usage: data.usage
            });
        } else {
            return Response.json({ error: data.error?.message || 'AI 回复失败' }, { status: 500 });
        }
    } catch(err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
