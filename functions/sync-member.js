// 訂單客戶自動收錄進會員管理（profiles）
// 觸發：前台下單成功後調用；後台會員管理可一鍵同步歷史訂單。
// 規則：
//   - email 優先匹配，無 email 再用 phone 匹配；
//   - 命中既有會員：僅補空白欄位（姓名/電話/Email），不覆蓋既有標籤、積分、訂單統計；
//   - 未命中：新建會員檔案（臨時 id，不開通 auth 登錄帳號），source 標記「訂單收錄」；
//   - 服務端二次查詢保證冪等，重複調用不會重複建檔。
// 請求格式：
//   單條：{ name, phone, email, orderCode }
//   批量：{ orders: [ { name, phone, email, orderCode }, ... ] }

const SUPABASE_URL_DEFAULT = 'https://gefqlrmozxbgfhxgngtg.supabase.co';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function normalizeEmail(v) {
    return String(v || '').trim().toLowerCase();
}

function normalizeText(v) {
    return String(v || '').trim();
}

async function ensureMember(SUPABASE_URL, headers, record) {
    const name = normalizeText(record.name);
    const phone = normalizeText(record.phone);
    const email = normalizeEmail(record.email);
    const orderCode = normalizeText(record.orderCode);

    // 沒有任何聯絡方式，無法建檔
    if (!email && !phone) return { action: 'skipped', reason: 'no_contact' };

    // 1. 先按 email 查，再按 phone 查既有會員
    let existing = null;
    if (email) {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*&email=eq.${encodeURIComponent(email)}&limit=1`, { headers });
        const j = await r.json();
        if (Array.isArray(j) && j.length > 0) existing = j[0];
    }
    if (!existing && phone) {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*&phone=eq.${encodeURIComponent(phone)}&limit=1`, { headers });
        const j = await r.json();
        if (Array.isArray(j) && j.length > 0) existing = j[0];
    }

    if (existing) {
        // 僅補空白欄位，不覆蓋已有資料 / 標籤 / 積分
        const patch = { last_active: new Date().toISOString() };
        if (!existing.full_name && name) patch.full_name = name;
        if (!existing.phone && phone) patch.phone = phone;
        if (!existing.email && email) patch.email = email;

        await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${existing.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(patch),
        });
        return { action: 'updated', id: existing.id };
    }

    // 2. 新建會員檔案（臨時 id，不創建 auth 帳號、不發送郵件）
    const newId = 'order_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    const payload = {
        id: newId,
        full_name: name,
        email: email,
        phone: phone,
        member_status: 'active',
        source: '訂單收錄',
        last_active: new Date().toISOString(),
        created_at: new Date().toISOString(),
    };

    const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify(payload),
    });

    if (!r.ok) {
        const errText = await r.text();
        throw new Error('建立會員失敗: ' + errText);
    }
    return { action: 'created', id: newId, orderCode };
}

export async function onRequestPost(context) {
    if (context.request.method === 'OPTIONS') {
        return new Response(null, { headers: CORS });
    }

    try {
        const body = await context.request.json().catch(() => ({}));

        const SUPABASE_URL = context.env.SUPABASE_URL || SUPABASE_URL_DEFAULT;
        const SERVICE_KEY = context.env.SUPABASE_SERVICE_ROLE_KEY || context.env.SUPABASE_Secret_keys;
        if (!SERVICE_KEY) {
            return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY 未配置' }, { status: 500, headers: CORS });
        }

        const headers = {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
        };

        // 批量模式
        if (Array.isArray(body.orders) && body.orders.length > 0) {
            const results = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] };
            for (const record of body.orders) {
                try {
                    const res = await ensureMember(SUPABASE_URL, headers, record || {});
                    if (res.action === 'created') results.created++;
                    else if (res.action === 'updated') results.updated++;
                    else results.skipped++;
                } catch (err) {
                    results.failed++;
                    results.errors.push({ email: (record || {}).email, error: err.message });
                }
            }
            return Response.json({ success: true, ...results, total: body.orders.length }, { headers: CORS });
        }

        // 單條模式
        const res = await ensureMember(SUPABASE_URL, headers, body);
        return Response.json({ success: true, ...res }, { headers: CORS });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500, headers: CORS });
    }
}
