export async function onRequestPost(context) {
    try {
        const { message, history, productInfo, pageContext, userEmail, userOrders, imageBase64 } = await context.request.json();
        
        const SUPABASE_URL = context.env.SUPABASE_URL || 'https://gefqlrmozxbgfhxgngtg.supabase.co';
        const SERVICE_KEY = context.env.SUPABASE_SERVICE_ROLE_KEY || context.env.SUPABASE_Secret_keys;
        
        const headers = {
            'apikey': SERVICE_KEY,
            'Authorization': 'Bearer ' + SERVICE_KEY
        };
        
        let systemPrompt = '';
        let language = 'auto';
        let aiModel = '@cf/mistral/mistral-7b-instruct-v0.1';
        try {
            const resp = await fetch(SUPABASE_URL + '/rest/v1/ai_chat_settings?select=system_prompt,language,is_active,model&limit=1', { headers });
            const settings = await resp.json();
            if (settings && settings.length > 0) {
                systemPrompt = settings[0].system_prompt || '';
                language = settings[0].language || 'auto';
                aiModel = settings[0].model || '@cf/mistral/mistral-7b-instruct-v0.1';
                if (settings[0].is_active === false) {
                    return Response.json({ reply: '抱歉，AI 客服目前未啟用，請點擊「轉人工客服」聯繫我們。' });
                }
            }
        } catch(e) { console.error('读取设置失败:', e); }
        
        if (!systemPrompt) {
            systemPrompt = '你是 RoyalSpl Florist 香港花店的專業 AI 客服。\n品牌：RoyalSpl Florist，香港本地高端花店。\n主要產品：韓式花束、日式花藝、法式田園風、花店手打感花束。\n你是香港花店專家，熟悉各種花材、花語、配送政策。';
        }
        
        // 强制语言规则 - 跟随客人语言
        systemPrompt += '\n\n【語言規則 - 必須嚴格遵守】\n1. 跟隨客人對話嘅語言：客人用粵語/繁體中文 → 用粵語繁體回答；客人用英文 → 用英文回答；客人用普通話 → 用書面中文回答。\n2. 全程用同一種語言，唔好中途切換、唔好中英混雜、唔好先寫英文再翻譯。\n3. 用繁體中文回答時，絕對不能用簡體字。\n4. 客人未明確時，預設用香港廣東話口語 + 繁體字，例如「你好呀」「唔該」「多謝」「嘅」「咁」「喺」「哋」。';
        
        // 日期與配送理解規則
        systemPrompt += '\n\n【日期與配送理解-重要】\n1. 用戶講「X號」「X月X號」「今日」「聽日」「後日」等，係指日期/配送時間，唔係商品編號。\n2. 例如「19號可以送貨嗎」= 問19號當日能否送貨，唔好理解成商品「19」號。\n3. 回答配送問題時，引用配送政策：香港全港送貨，即日鮮花可即日/翌日配送，其他需提前預訂（一般3日）。\n4. 若客人喺商品詳情頁問送貨，默認佢問嘅就係當前瀏覽嗰件商品，直接回答該商品嘅配送安排。';
        
        // 输出限制
        systemPrompt += '\n\n【輸出限制-必須嚴格遵守】\n1. 只輸出文字回答，不要生成圖片、視頻、代碼塊或Markdown格式，用純文本回答。\n2. 回覆必須簡潔精煉：商品推薦時直接列出商品鏈接即可，禁止長篇大論、禁止寫「如需更多資訊請查看產品詳情頁/聯繫客服」這類冗餘客套話。\n3. 推薦商品格式（一字不差）：\n商品名稱 - HK$價格 - 鏈接：/product-detail.html?id=商品ID\n每個推薦後不要附加額外解釋段落。\n4. 回覆總長度控制在150字以內（中文）/100詞以內（英文），除非用戶要求詳細說明。';
        
        // 加载全网站内容（精简版，控制在8K上下文内）
        let knowledgeContext = '';
        
        try {
            const r = await fetch(SUPABASE_URL + '/rest/v1/blog_posts?select=title,content,created_at&is_published=eq.true&order=created_at.desc&limit=5', { headers });
            const posts = await r.json();
            if (posts && posts.length > 0) {
                knowledgeContext += '\n\n【品牌Blog】\n' + posts.map(p => '標題:' + p.title + '\n內容:' + (p.content||'').substring(0,150)).join('\n---\n');
            }
        } catch(e) {}
        
        try {
            const r = await fetch(SUPABASE_URL + '/rest/v1/faq_items?select=question,answer&is_published=eq.true&order=sort_order.asc&limit=10', { headers });
            const faqs = await r.json();
            if (faqs && faqs.length > 0) {
                knowledgeContext += '\n\n【常見問題】\n' + faqs.map(f => 'Q:' + f.question + '\nA:' + (f.answer||'').substring(0,100)).join('\n---\n');
            }
        } catch(e) {}
        
        try {
            const r = await fetch(SUPABASE_URL + '/rest/v1/contact_settings?select=*&limit=1', { headers });
            const contact = await r.json();
            if (contact && contact.length > 0) {
                const c = contact[0];
                knowledgeContext += '\n\n【聯絡我們】電話:' + (c.phone||'') + ' | 電郵:' + (c.email||'') + ' | 地址:' + (c.address||'') + ' | 營業時間:' + (c.business_hours||'');
            }
        } catch(e) {}
        
        try {
            const r = await fetch(SUPABASE_URL + '/rest/v1/flower_care?select=title,content&is_active=eq.true&limit=5', { headers });
            const care = await r.json();
            if (care && care.length > 0) {
                knowledgeContext += '\n\n【花材護理】\n' + care.map(c => '標題:' + c.title + '\n內容:' + (c.content||'').substring(0,100)).join('\n---\n');
            }
        } catch(e) {}
        
        try {
            const r = await fetch(SUPABASE_URL + '/rest/v1/categories?select=id,name_zh,name_en&is_active=eq.true&order=sort_order.asc', { headers });
            const cats = await r.json();
            if (cats && cats.length > 0) {
                knowledgeContext += '\n\n【商品分類】\n' + cats.map(c => 'ID:' + c.id + ' | ' + (c.name_zh||'') + ' ' + (c.name_en||'')).join('\n');
            }
        } catch(e) {}
        
        let validProductIds = []; // 真實商品ID列表，用於過濾AI編造的鏈接
        try {
            const r = await fetch(SUPABASE_URL + '/rest/v1/products?select=id,name_zh,name_en,price,category,specs_flowers,is_active&is_active=eq.true&order=created_at.desc&limit=30', { headers });
            const products = await r.json();
            if (products && products.length > 0) {
                validProductIds = products.map(p => String(p.id));
                knowledgeContext += '\n\n【全部商品】\n' + products.map(p => 
                    'ID:' + p.id + ' | ' + (p.name_zh||p.name_en) + ' | HK$' + p.price + ' | 分類:' + (p.category||'') + ' | 花材:' + (p.specs_flowers||'') + ' | 鏈接:/product-detail.html?id=' + p.id
                ).join('\n');
            }
        } catch(e) {}
        
        systemPrompt += knowledgeContext;
        
        systemPrompt += '\n\n【商品推薦規則-最重要】用戶詢問推薦商品、想買花、送禮、有什麼花束、報預算等，必須從上方【全部商品列表】中挑選具體商品來推薦，嚴禁推薦分類。\n推薦步驟：1) 若用戶報咗預算（如800-1000、600左右），從商品列表中篩選價格符合預算的商品；2) 若無預算，選2-3個最受歡迎/最合適嘅商品。\n每個推薦必須嚴格使用列表中的真實商品ID，鏈接格式（一字不差，只准用相對路徑，嚴禁拼寫任何域名）：\n商品名稱 - HK$真實價格 - 鏈接：/product-detail.html?id=真實商品ID\n示例：\n鬱金香光譜 - HK$460 - 鏈接：/product-detail.html?id=66\n\n【禁止事項】\n1. 嚴禁推薦分類（如法式田園自然風、日式鮮花束等），必須推薦具體商品；\n2. 嚴禁編造或猜測ID，鏈接中的ID必須是商品列表中出現過的；\n3. 嚴禁寫HK$價格暫缺，價格必須用商品列表中的真實價格；\n4. 除非用戶明確問「有咩分類」，先可以用分類頁鏈接：/products.html?category=分類ID。\n5. 嚴禁在鏈接中輸出任何域名（如www.royalspl.shop、royalspl.com等），鏈接必須以/product-detail.html開頭。';
        
        if (productInfo) {
            systemPrompt += '\n\n【用戶當前瀏覽的商品】ID:' + productInfo.id + ' | ' + productInfo.name + ' | ' + (productInfo.price || '');
        }
        if (pageContext) {
            systemPrompt += '\n\n【客人停留頁面】' + (pageContext.pageType || '') + ' | ' + (pageContext.detail || '') + ' | 頁面地址:' + (pageContext.url || '');
            systemPrompt += '\n請結合客人停留的頁面給出貼合情境的回覆：例如客人在商品詳情頁就圍繞該商品講解與推薦搭配；在分類頁就推薦該分類商品；在購物車/結帳頁就協助訂單問題；在首頁就引導選擇。';
            // 後端從URL提取商品ID查庫（前端DOM異步加載時商品名可能缺失，此為兜底）
            const urlProductMatch = (pageContext.url || '').match(/[?&]id=(\d+)/);
            const urlCatMatch = (pageContext.url || '').match(/[?&]category=([^&]+)/);
            let curProductName = (productInfo && productInfo.name) ? productInfo.name : '';
            if ((!productInfo || !productInfo.name) && urlProductMatch) {
                try {
                    const pid = urlProductMatch[1];
                    const pr = await fetch(SUPABASE_URL + '/rest/v1/products?select=id,name_zh,name_en,price,category,specs_flowers,description,is_active&id=eq.' + pid + '&is_active=eq.true&limit=1', { headers });
                    const pdata = await pr.json();
                    if (pdata && pdata.length > 0) {
                        const p = pdata[0];
                        curProductName = (p.name_zh || p.name_en);
                        systemPrompt += '\n\n【用戶當前瀏覽的商品（後端查庫）】ID:' + p.id + ' | 名稱:' + curProductName + ' | 價格:HK$' + p.price + ' | 花材:' + (p.specs_flowers || '') + ' | 鏈接:/product-detail.html?id=' + p.id;
                    }
                } catch(e) {}
            }
            if (urlCatMatch && (pageContext.pageType === '商品分類頁' || !pageContext.detail)) {
                try {
                    const catKey = decodeURIComponent(urlCatMatch[1]);
                    const cr = await fetch(SUPABASE_URL + '/rest/v1/categories?select=id,name_zh,name_en,description&or=(name_zh.eq.' + encodeURIComponent(catKey) + ',name_en.eq.' + encodeURIComponent(catKey) + ',id.eq.' + encodeURIComponent(catKey) + ')&limit=1', { headers });
                    const cdata = await cr.json();
                    if (cdata && cdata.length > 0) {
                        systemPrompt += '\n\n【用戶當前瀏覽的分類（後端查庫）】' + (cdata[0].name_zh || cdata[0].name_en) + (cdata[0].description ? ' | 分類簡介:' + cdata[0].description.substring(0, 100) : '');
                    }
                } catch(e) {}
            }
            // 商品詳情頁：強化「圍繞當前商品回答」指令
            if (pageContext.pageType === '商品詳情頁' || urlProductMatch) {
                systemPrompt += '\n\n【當前頁面是商品詳情頁-必須遵守】\n1. 客人正在瀏覽商品「' + (curProductName || '當前商品') + '」，佢問嘅「呢束花」「呢個」「這個」「呢款」等都係指當前商品。\n2. 回答配送/送貨問題時，直接回答當前商品嘅配送安排，唔好叫客人再提供商品ID或名稱。\n3. 例如問「呢束花19號可以送貨嗎」= 問「' + (curProductName || '當前商品') + '」19號能否送貨，直接回答。';
            }
        }
        
        if (userOrders && userOrders.length > 0) {
            systemPrompt += '\n\n【用戶訂單與消費分析】這是該客戶的歷史訂單，請根據購買記錄了解客戶的喜好、消費力，提供個性化推薦和服務：\n';
            systemPrompt += userOrders.map(o => 
                '訂單號:' + (o.order_code || o.id) + ' | 狀態:' + o.status + ' | 金額:HK$' + (o.total_amount != null ? o.total_amount : '-') + ' | 日期:' + (o.created_at? o.created_at.substring(0,10) : '') + ' | 商品:' + JSON.stringify(o.items || []).substring(0,200) + ' | 鏈接:/order-detail.html?id=' + o.id
            ).join('\n');
            systemPrompt += '\n請根據客戶過往購買的花材類型、價格區間、購買頻率，推薦符合其喜好和消費力的商品。';
        } else if (userEmail) {
            systemPrompt += '\n\n用戶已登錄，電郵：' + userEmail + '，暫時沒有訂單記錄。可以推薦入門級商品。';
        }
        
        let messages = [{ role: 'system', content: systemPrompt }];
        if (history && Array.isArray(history)) {
            messages = messages.concat(history.slice(-6));
        }
        
        if (imageBase64) {
            messages.push({
                role: 'user',
                content: [
                    { type: 'image_url', image_url: { url: imageBase64 } },
                    { type: 'text', text: message || '請描述這張圖片的內容，如果是花束，請識別花材、風格，並推薦類似的商品。' }
                ]
            });
        } else {
            messages.push({ role: 'user', content: message });
        }
        
        // 优先使用 Gemini API（如果配置了）
        const GEMINI_API_KEY = context.env.GEMINI_API_KEY || context.env.GEMINI_KEY || '';
        
        if (GEMINI_API_KEY) {
            try {
                console.log('使用 Gemini API');
                
                // 转换消息格式为 Gemini 格式
                const geminiContents = [];
                const systemMsg = messages.find(m => m.role === 'system');
                const chatMessages = messages.filter(m => m.role !== 'system');
                
                for (let i = 0; i < chatMessages.length; i++) {
                    const m = chatMessages[i];
                    const role = m.role === 'assistant' ? 'model' : 'user';
                    let parts = [];
                    
                    if (typeof m.content === 'string') {
                        parts = [{ text: m.content }];
                    } else if (Array.isArray(m.content)) {
                        parts = m.content.map(p => {
                            if (p.type === 'text') return { text: p.text };
                            if (p.type === 'image_url') return { inlineData: { data: p.image_url.url.replace(/^data:image\/\w+;base64,/, ''), mimeType: 'image/jpeg' } };
                            return { text: '' };
                        });
                    }
                    
                    geminiContents.push({ role: role, parts: parts });
                }
                
                const geminiBody = {
                    contents: geminiContents,
                    generationConfig: {
                        maxOutputTokens: 1000,
                        temperature: 0.7
                    }
                };
                
                if (systemMsg && systemMsg.content) {
                    geminiBody.systemInstruction = {
                        parts: [{ text: systemMsg.content }]
                    };
                }
                
                const geminiResp = await fetch(
                    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(geminiBody)
                    }
                );
                
                const geminiData = await geminiResp.json();
                
                if (geminiData.candidates && geminiData.candidates[0] && 
                    geminiData.candidates[0].content && 
                    geminiData.candidates[0].content.parts &&
                    geminiData.candidates[0].content.parts[0]) {
                    const reply = geminiData.candidates[0].content.parts[0].text;
                    if (reply) {
                        return Response.json({ 
                            reply: reply,
                            model: 'gemini-2.0-flash'
                        });
                    }
                }
                
                console.error('Gemini 返回异常:', JSON.stringify(geminiData).substring(0, 500));
            } catch (e) {
                console.error('Gemini API 调用失败:', e.message);
                // 失败后继续尝试 Cloudflare Workers AI
            }
        }
        
        // 使用Cloudflare Workers AI（每天免费额度）
        // Cloudflare免费模型：mistral-7b-instruct-v0.1（已验证可用）
        const fallbackModels = [
            '@cf/mistral/mistral-7b-instruct-v0.1',
            '@cf/meta/llama-3.1-8b-instruct',
            '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
            '@cf/qwen/qwen1.5-14b-chat-awq'
        ];
        // 确保设置的模型在列表第一位，去重
        const models = [aiModel, ...fallbackModels.filter(m => m !== aiModel)];
        
        let aiResponse = null;
        let lastError = null;
        let usedModel = '';
        
        for (let i = 0; i < models.length; i++) {
            try {
                console.log('尝试模型:', models[i]);
                aiResponse = await context.env.AI.run(models[i], {
                    messages: messages,
                    max_tokens: 1000,
                    temperature: 0.7
                });
                if (aiResponse && (aiResponse.response || (aiResponse.choices && aiResponse.choices[0]))) {
                    console.log('模型成功:', models[i]);
                    usedModel = models[i];
                    break;
                }
            } catch (e) {
                console.error('模型', models[i], '失败:', e.message);
                lastError = e;
                aiResponse = null;
            }
        }
        
        if (!aiResponse) {
            return Response.json({ 
                error: '所有AI模型都调用失败: ' + (lastError ? lastError.message : '未知错误'),
                reply: '抱歉，AI客服暫時無法使用，請稍後再試或點擊「轉人工客服」聯繫我們。'
            }, { status: 500 });
        }
        
        // 兼容两种返回格式：Cloudflare标准格式(response)和OpenAI格式(choices)
        let reply = '';
        if (aiResponse && aiResponse.response) {
            reply = aiResponse.response;
        } else if (aiResponse && aiResponse.choices && aiResponse.choices[0] && aiResponse.choices[0].message) {
            reply = aiResponse.choices[0].message.content;
        }
        
        if (reply) {
            // 后处理：修正AI可能输出的错误域名链接为相对路径
            reply = reply
                .replace(/https?:\/\/(www\.)?royalspl(shop|florist|\.com|\.xyz)[^\/\s]*/gi, '')
                .replace(/https?:\/\/[^\s\/]+\/(product-detail|products)\.html/g, '/$1.html')
                .replace(/\[\/?product-detail\.html/g, '[/product-detail.html')
                .replace(/\]\s*[\(\[]\/?product-detail/g, '](/product-detail');
            
            // 過濾AI編造的商品ID：只保留真實商品列表中的ID鏈接，其餘剔除
            if (validProductIds.length > 0) {
                // 找出回覆中所有商品ID鏈接
                const linkRegex = /\/product-detail\.html\?id=(\d+)/g;
                let lm;
                const idsInReply = new Set();
                while ((lm = linkRegex.exec(reply)) !== null) {
                    idsInReply.add(lm[1]);
                }
                // 剔除不在真實列表中的ID鏈接（含其行首的「商品名 - HK$價格 -」冗餘文字）
                idsInReply.forEach(function(pid) {
                    if (validProductIds.indexOf(pid) === -1) {
                        const lineRegex = new RegExp('[^\\n]*/product-detail\\.html\\?id=' + pid + '[^\\n]*');
                        reply = reply.replace(lineRegex, '');
                    }
                });
            }
            
            // 語言後處理：客人用中文/粵語提問，但AI回覆主要是英文時，自動翻譯為繁體中文
            const userMsgText = (typeof message === 'string' ? message : JSON.stringify(message || ''));
            const hasChinese = /[\u4e00-\u9fff]/.test(userMsgText);
            if (hasChinese && reply && usedModel) {
                const chineseChars = (reply.match(/[\u4e00-\u9fff]/g) || []).length;
                const englishChars = (reply.match(/[a-zA-Z]/g) || []).length;
                // 中文提問但回覆英文佔主導（英文>中文 且 英文>50字符）→ 翻譯
                if (englishChars > 50 && englishChars > chineseChars * 2) {
                    try {
                        const transResp = await context.env.AI.run(usedModel, {
                            messages: [
                                { role: 'system', content: '你係翻譯器。將用戶提供嘅內容翻譯成自然嘅繁體中文（香港用語），只輸出翻譯結果，唔好加任何解釋、唔好保留原文。若內容包含鏈接（/product-detail.html?id=...）或HK$價格，原樣保留。' },
                                { role: 'user', content: reply }
                            ],
                            max_tokens: 1200,
                            temperature: 0.3
                        });
                        const translated = (transResp && transResp.response) ? transResp.response.trim() : '';
                        if (translated && /[\u4e00-\u9fff]/.test(translated)) {
                            reply = translated;
                        }
                    } catch(e) { console.error('翻譯回覆失敗:', e.message); }
                }
            }
            
            return Response.json({ 
                reply: reply,
                usage: aiResponse.usage,
                model: usedModel
            });
        } else {
            return Response.json({ error: 'AI 回复失败', raw: aiResponse }, { status: 500 });
        }
    } catch(err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
