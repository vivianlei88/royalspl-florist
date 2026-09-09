export async function onRequestPost(context) {
    try {
        const { type, topic, existingContent, language } = await context.request.json();
        
        const lang = language || 'zh-Hant';
        
        let prompt = '';
        let systemPrompt = '你是 RoyalSpl Florist 香港花店的专业文案编辑，使用繁体中文写作。品牌定位：香港本地高端花店，产品包括韩式花束、日式花艺、法式田园风、花店手打感花束。';
        
        if (lang === 'en') {
            systemPrompt = 'You are a professional copywriter for RoyalSpl Florist, a premium Hong Kong florist. Write in English. Products: Korean-style bouquets, Japanese floral art, French pastoral style, hand-tied bouquets.';
        }
        
        switch(type) {
            case 'blog':
                prompt = `${systemPrompt}\n\n请写一篇关于「${topic || '花藝'}」的Blog文章，用繁体中文，标题吸引人，正文300-500字，包含花材介绍、花艺知识、品牌特色。格式：\n标题：\n正文：`;
                break;
            case 'faq':
                prompt = `${systemPrompt}\n\n请为花店写一个常见问题的回答，问题是：「${topic || ''}」\n用繁体中文，简洁明了，100-200字。`;
                break;
            case 'contact':
                prompt = `${systemPrompt}\n\n请为花店「联络我们」页面写一段介绍文字，包含品牌理念、联系方式引导、服务承诺，用繁体中文，150-250字。`;
                break;
            case 'privacy':
                prompt = `${systemPrompt}\n\n请为花店写一份隐私政策，符合香港个人资料（私隐）条例，包含：收集的资料、使用目的、保密措施、用户权利，用繁体中文，专业严谨。${existingContent ? '\n参考现有内容：' + existingContent.substring(0,500) : ''}`;
                break;
            case 'flower_care':
                prompt = `${systemPrompt}\n\n请写一篇关于「${topic || '花材護理'}」的花材护理知识文章，用繁体中文，包含护理步骤、注意事项、小贴士，200-400字。`;
                break;
            case 'translate':
                prompt = `请将以下内容翻译成英文，保持原意，语言自然流畅。只输出翻译结果，不要添加任何解释。\n\n内容：\n${topic || ''}`;
                systemPrompt = 'You are a professional translator. Translate the given Chinese text to natural English. Only output the translation.';
                break;
            default:
                prompt = `${systemPrompt}\n\n请写一段关于「${topic || ''}」的文案，用繁体中文，简洁优雅。`;
        }
        
        // 使用Cloudflare Workers AI（免费额度）
        const aiResponse = await context.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1500,
            temperature: 0.7
        });
        
        if (aiResponse && aiResponse.response) {
            return Response.json({ success: true, content: aiResponse.response });
        }
        return Response.json({ error: '生成失败' }, { status: 500 });
    } catch(err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
