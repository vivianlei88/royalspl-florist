// Meta Webhook：接收 Facebook Messenger + Instagram DM，接入网站 AI 客服（复用 /ai-chat）
// 部署为 Cloudflare Pages Functions，路由 /meta-webhook
//
// 环境变量（在 Cloudflare Pages -> Settings -> Environment variables 配置）：
//   META_VERIFY_TOKEN      -> Webhook 验证口令（自定义一串随机字符串）
//   META_PAGE_ACCESS_TOKEN -> 绑定 FB Page + IG 商业账号的 Page Access Token
//   META_PAGE_ID           -> Facebook Page ID（用于记录来源，可选）
//   META_IG_ID             -> Instagram Business Account ID（可选）
//
// 微信机器人 / FB / IG 通用，此处仅处理 Meta Messenger + IG Messaging。

const GRAPH = 'https://graph.facebook.com/v19.0';
const AI_CHAT_ENDPOINT = '/ai-chat';

// 调用网站 AI 客服生成回复
async function callAiChat(env, messageText, platform) {
    try {
        const resp = await fetch(AI_CHAT_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: messageText,
                history: [],
                pageContext: {
                    pageType: '社交平台私訊',
                    detail: platform === 'instagram' ? 'Instagram 私訊' : 'Facebook Messenger 私訊',
                    url: 'https://www.royalspl.shop/'
                }
            })
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        if (data && data.reply) {
            let reply = String(data.reply);
            // 社交平台回复不宜太长，截断到 1000 字
            if (reply.length > 1000) reply = reply.slice(0, 1000);
            return reply;
        }
        return null;
    } catch (e) {
        console.error('AI客服调用失败:', e.message);
        return null;
    }
}

// 通过 Meta Send API 发回复
async function sendReply(env, senderId, text, platform) {
    const token = env.META_PAGE_ACCESS_TOKEN;
    if (!token) { console.error('缺少 META_PAGE_ACCESS_TOKEN'); return; }
    try {
        const body = {
            recipient: { id: String(senderId) },
            message: { text: String(text) },
            messaging_type: 'RESPONSE'
        };
        await fetch(GRAPH + '/me/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    } catch (e) {
        console.error('Meta 发送失败:', e.message);
    }
}

// 处理一条私信
async function handleMessaging(env, messaging, platform) {
    // 忽略自己发的回显 / 其他非消息类型
    if (!messaging || !messaging.message) return;
    const msg = messaging.message;
    if (msg.is_echo) return;                     // 自己的回显，防死循环
    if (!msg.text || !String(msg.text).trim()) return; // 仅处理文本
    const text = String(msg.text).trim();
    const senderId = messaging.sender && messaging.sender.id;
    if (!senderId) return;

    // 关键词：消息中含有「人工 / 真人 / 客服 / human / agent」则转人工提示
    const lower = text.toLowerCase();
    const needHuman = /人工|真人|客服|轉人工|human|agent|real person/.test(lower);

    let reply;
    if (needHuman) {
        reply = '您好！我已為你轉接人工客服，專人會盡快回覆你。如需即時協助，可致電或 WhatsApp 我們（網站首頁「設計師及商務合作」有聯絡方式）。多謝你耐心等待。';
    } else {
        reply = await callAiChat(env, text, platform);
        if (!reply) {
            reply = '多謝你嘅查詢！我暫時未能即時回覆，專人客服好快會聯絡你。你可以先瀏覽我哋網站 https://www.royalspl.shop 了解花藝產品，或者 WhatsApp 我哋直接查詢。';
        }
    }

    await sendReply(env, senderId, reply, platform);
    // 记录到后台客户留言（便于人工跟进）
    try {
        const SUPABASE_URL = env.SUPABASE_URL || 'https://gefqlrmozxbgfhxgngtg.supabase.co';
        const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_Secret_keys;
        await fetch(SUPABASE_URL + '/rest/v1/customer_messages', {
            method: 'POST',
            headers: {
                'apikey': SERVICE_KEY,
                'Authorization': 'Bearer ' + SERVICE_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                name: (platform === 'instagram' ? 'IG' : 'FB') + '_' + String(senderId),
                phone: '',
                message: '[Meta] ' + (platform === 'instagram' ? 'Instagram' : 'Facebook') + ' 私訊: ' + text,
                status: 'unread',
                source: 'meta_' + platform
            })
        });
    } catch (e) { console.error('记录留言失败:', e.message); }
}

export async function onRequestGet(context) {
    // Webhook 验证：Meta 会带 hub.mode / hub.verify_token / hub.challenge
    const url = new URL(context.request.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    const verifyToken = context.env.META_VERIFY_TOKEN;
    if (mode === 'subscribe' && token && token === verifyToken) {
        return new Response(challenge, { status: 200 });
    }
    return new Response('驗證失敗', { status: 403 });
}

export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        if (!body || !body.entry) {
            return Response.json({ status: 'ok' });
        }

        // 判断平台：FB Messenger 事件带 recipient，IG Messaging 事件不带
        let platform = 'messenger';
        const firstMessaging = body.entry[0] && body.entry[0].messaging && body.entry[0].messaging[0];
        if (firstMessaging && firstMessaging.recipient === undefined) {
            platform = 'instagram';
        }

        for (const entry of body.entry) {
            if (!entry.messaging) continue;
            for (const messaging of entry.messaging) {
                // 异步处理，避免阻塞 webhook 超时
                context.waitUntil(handleMessaging(context.env, messaging, platform));
            }
        }
        return Response.json({ status: 'ok' });
    } catch (e) {
        console.error('meta-webhook 处理失败:', e.message);
        return Response.json({ status: 'ok' }, { status: 200 });
    }
}
