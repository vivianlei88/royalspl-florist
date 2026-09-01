export async function onRequestPost(context) {
    try {
        const { message, history, productInfo } = await context.request.json();
        
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
        let language = 'zh-Hant';
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
                language = settings[0].language || 'zh-Hant';
                if (settings[0].is_active === false) {
                    return Response.json({ reply: '抱歉，AI 客服目前未啟用，請點擊「轉人工客服」聯繫我們。' });
                }
            }
        } catch(e) {
            console.error('读取设置失败:', e);
        }
        
        // 默认提示词
        if (!systemPrompt) {
            systemPrompt = `你是 RoyalSpl Florist 香港花店的 AI 客服，使用繁体中文回答。
品牌：RoyalSpl Florist，香港本地高端花店。
主要产品：韩式花束、日式花艺、法式田园风、花店手打感花束。
回答规则：
1. 用繁体中文，语气亲切专业
2. 关于价格、配送、产品的问题，如果用户提供了商品信息，基于商品信息回答
3. 不知道的问题不要编造，建议转人工客服
4. 回答简洁，不超过100字
5. 可以推荐相关产品`;
        }
        
        // 根据语言调整
        if (language === 'yue') {
            systemPrompt += '\n\n請用廣東話/粵語口語回答。';
        } else if (language === 'en') {
            systemPrompt += '\n\nPlease answer in English.';
        } else if (language === 'auto') {
            systemPrompt += '\n\n請根據用戶使用的語言自動切換回答語言（繁體中文/粵語/英文）。';
        }
        
        if (productInfo) {
            systemPrompt += `\n\n当前浏览的商品信息：${JSON.stringify(productInfo)}`;
        }
        
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
                max_tokens: 500,
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
