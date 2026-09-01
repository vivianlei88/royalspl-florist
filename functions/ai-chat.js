export async function onRequestPost(context) {
    try {
        const { message, history, productInfo, userEmail, userOrders, imageBase64 } = await context.request.json();
        
        const API_KEY = context.env.DOUBAO_SEED_2_0_MINI_API_KEY;
        const MODEL_ID = 'doubao-seed-2-0-mini-260428';
        const BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
        const SUPABASE_URL = context.env.SUPABASE_URL || 'https://gefqlrmozxbgfhxgngtg.supabase.co';
        const SERVICE_KEY = context.env.SUPABASE_SERVICE_ROLE_KEY || context.env.SUPABASE_Secret_keys;
        
        if (!API_KEY) {
            return Response.json({ error: 'AI 服务未配置' }, { status: 500 });
        }
        
        const headers = {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`
        };
        
        // 从数据库读取设置
        let systemPrompt = '';
        let language = 'auto';
        try {
            const resp = await fetch(`${SUPABASE_URL}/rest/v1/ai_chat_settings?select=system_prompt,language,is_active&limit=1`, { headers });
            const settings = await resp.json();
            if (settings && settings.length > 0) {
                systemPrompt = settings[0].system_prompt || '';
                language = settings[0].language || 'auto';
                if (settings[0].is_active === false) {
                    return Response.json({ reply: '抱歉，AI 客服目前未啟用，請點擊「轉人工客服」聯繫我們。' });
                }
            }
        } catch(e) { console.error('读取设置失败:', e); }
        
        // 默认提示词
        if (!systemPrompt) {
            systemPrompt = `你是 RoyalSpl Florist 香港花店的专业 AI 客服。
品牌：RoyalSpl Florist，香港本地高端花店。
主要产品：韩式花束、日式花艺、法式田园风、花店手打感花束。
你是香港花店专家，熟悉各种花材、花语、配送政策。`;
        }
        
        // 多语言规则
        systemPrompt += '\n\n【多语言规则】请根据用户输入的语言自动切换回答语言：用户用繁体中文就用繁体中文回答，用广东话/粤语就用广东话回答，用英文就用英文回答。不要主动切换语言，跟随用户的语言。';
        
        // 输出限制
        systemPrompt += '\n\n【输出限制】只输出文字回答，不要生成图片、视频、代码块或Markdown格式，用纯文本回答。';
        
        // 加载全网站内容作为上下文
        let knowledgeContext = '';
        
        // 1. 加载 Blog 文章
        try {
            const r = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?select=title,content,created_at&is_published=eq.true&order=created_at.desc&limit=10`, { headers });
            const posts = await r.json();
            if (posts && posts.length > 0) {
                knowledgeContext += '\n\n【品牌Blog文章】\n' + posts.map(p => `标题:${p.title}\n内容:${(p.content||'').substring(0,300)}`).join('\n---\n');
            }
        } catch(e) {}
        
        // 2. 加载 FAQ
        try {
            const r = await fetch(`${SUPABASE_URL}/rest/v1/faq_items?select=question,answer&is_published=eq.true&order=sort_order.asc&limit=20`, { headers });
            const faqs = await r.json();
            if (faqs && faqs.length > 0) {
                knowledgeContext += '\n\n【常见问题FAQ】\n' + faqs.map(f => `Q:${f.question}\nA:${f.answer}`).join('\n---\n');
            }
        } catch(e) {}
        
        // 3. 加载联络我们信息
        try {
            const r = await fetch(`${SUPABASE_URL}/rest/v1/contact_settings?select=*&limit=1`, { headers });
            const contact = await r.json();
            if (contact && contact.length > 0) {
                const c = contact[0];
                knowledgeContext += `\n\n【联络我们】电话:${c.phone||''} | 邮箱:${c.email||''} | 地址:${c.address||''} | 营业时间:${c.business_hours||''}`;
            }
        } catch(e) {}
        
        // 4. 加载花材护理知识
        try {
            const r = await fetch(`${SUPABASE_URL}/rest/v1/flower_care?select=title,content&is_active=eq.true&limit=10`, { headers });
            const care = await r.json();
            if (care && care.length > 0) {
                knowledgeContext += '\n\n【花材护理知识】\n' + care.map(c => `标题:${c.title}\n内容:${(c.content||'').substring(0,200)}`).join('\n---\n');
            }
        } catch(e) {}
        
        // 5. 加载商品分类
        try {
            const r = await fetch(`${SUPABASE_URL}/rest/v1/categories?select=id,name_zh,name_en,description&is_active=eq.true&order=sort_order.asc`, { headers });
            const cats = await r.json();
            if (cats && cats.length > 0) {
                knowledgeContext += '\n\n【商品分类】\n' + cats.map(c => `ID:${c.id} | ${c.name_zh||''} ${c.name_en||''} | ${c.description||''}`).join('\n');
            }
        } catch(e) {}
        
        // 6. 加载所有商品（精简）
        try {
            const r = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,name_zh,name_en,price,category,description,flower_materials,scent_notes,occasion_tags,is_active&is_active=eq.true&order=created_at.desc&limit=30`, { headers });
            const products = await r.json();
            if (products && products.length > 0) {
                knowledgeContext += '\n\n【全部商品列表】\n' + products.map(p => 
                    `ID:${p.id} | ${p.name_zh||p.name_en} | HK$${p.price} | 分类:${p.category||''} | 花材:${p.flower_materials||''} | 香气:${p.scent_notes||''} | 场景:${p.occasion_tags||''} | 描述:${(p.description||'').substring(0,100)} | 链接:/product-detail.html?id=${p.id}`
                ).join('\n');
            }
        } catch(e) {}
        
        systemPrompt += knowledgeContext;
        
        // 商品推荐规则
        systemPrompt += '\n\n【商品推荐规则】用户询问推荐商品、想买花、送礼、有什么花束等，从上方商品列表中推荐最合适的商品，并给出链接（格式：商品名称 - HK$价格 - 链接：/product-detail.html?id=商品ID）。可以推荐2-3个选项。';
        
        // 当前浏览商品
        if (productInfo) {
            systemPrompt += `\n\n【用户当前浏览的商品】ID:${productInfo.id} | ${productInfo.name} | ${productInfo.price || ''}`;
        }
        
        // 用户订单和消费分析
        if (userOrders && userOrders.length > 0) {
            systemPrompt += '\n\n【用户订单与消费分析】这是该客户的历史订单，请根据购买记录了解客户的喜好、消费力，提供个性化推荐和服务：\n';
            systemPrompt += userOrders.map(o => 
                `订单号:${o.order_code || o.id} | 状态:${o.status} | 金额:HK$${o.total} | 日期:${o.created_at?.substring(0,10) || ''} | 商品:${JSON.stringify(o.items || []).substring(0,200)} | 链接:/order-detail.html?id=${o.id}`
            ).join('\n');
            systemPrompt += '\n请根据客户过往购买的花材类型、价格区间、购买频率，推荐符合其喜好和消费力的商品。';
        } else if (userEmail) {
            systemPrompt += `\n\n用户已登录，邮箱：${userEmail}，暂时没有订单记录。可以推荐入门级商品。`;
        }
        
        // 构建消息
        let messages = [{ role: 'system', content: systemPrompt }];
        if (history && Array.isArray(history)) {
            messages = messages.concat(history.slice(-6));
        }
        
        // 处理图片输入
        if (imageBase64) {
            messages.push({
                role: 'user',
                content: [
                    { type: 'image_url', image_url: { url: imageBase64 } },
                    { type: 'text', text: message || '请描述这张图片的内容，如果是花束，请识别花材、风格，并推荐类似的商品。' }
                ]
            });
        } else {
            messages.push({ role: 'user', content: message });
        }
        
        const resp = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL_ID,
                messages: messages,
                max_tokens: 1000,
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
