export async function onRequestPost(context) {
    try {
        const { message, history, productInfo } = await context.request.json();
        
        const API_KEY = context.env.DOUBAO_API_KEY;
        const ENDPOINT_ID = context.env.DOUBAO_ENDPOINT_ID;
        const BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
        
        if (!API_KEY || !ENDPOINT_ID) {
            return Response.json({ error: 'AI 服务未配置' }, { status: 500 });
        }
        
        // 构建系统提示词
        let systemPrompt = `你是 RoyalSpl Florist 香港花店的 AI 客服，使用繁体中文回答。
品牌：RoyalSpl Florist，高端花店，深圳和香港配送。
主要产品：韩式花束、日式花艺、法式田园风、花店手打感花束。
回答规则：
1. 用繁体中文，语气亲切专业
2. 关于价格、配送、产品的问题，如果用户提供了商品信息，基于商品信息回答
3. 不知道的问题不要编造，建议转人工客服
4. 回答简洁，不超过100字
5. 可以推荐相关产品`;
        
        if (productInfo) {
            systemPrompt += `\n\n当前浏览的商品信息：${JSON.stringify(productInfo)}`;
        }
        
        // 构建消息
        let messages = [{ role: 'system', content: systemPrompt }];
        if (history && Array.isArray(history)) {
            messages = messages.concat(history.slice(-6)); // 保留最近6轮
        }
        messages.push({ role: 'user', content: message });
        
        const resp = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: ENDPOINT_ID,
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
