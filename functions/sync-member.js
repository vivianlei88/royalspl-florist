// 訂單客戶自動收錄進會員管理（profiles）
// 觸發：前台下單成功後調用；後台會員管理可一鍵同步歷史訂單。
// 規則：
//   - email 優先匹配，無 email 再用 phone 匹配；
//   - 命中既有會員：僅補空白欄位（姓名/電話/Email），不覆蓋既有標籤、積分、訂單統計；
//   - 未命中：先在 auth 建立對應用戶（臨時密碼、不發送重置郵件），再以其 UUID 建 profile；
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

// 訂閱狀態歸一：已訂閱 / 未訂閱
function normalizeSub(v) {
    const t = normalizeText(v);
    if (!t) return '';
    return /已訂閱|已订阅/.test(t) ? '已訂閱' : '未訂閱';
}

// 語言僅保留 zh / en，其餘代碼視為無效
function normalizeLang(v) {
    const t = normalizeText(v).toLowerCase();
    return (t === 'zh' || t === 'en') ? t : '';
}

// 僅當既有欄位為空白時補入新值，不覆蓋已有資料
function fillIfBlank(patch, existing, field, value) {
    const cur = existing[field];
    const blank = cur === null || cur === undefined || String(cur).trim() === '';
    if (blank && value) patch[field] = value;
}

// 取得（必要時建立）auth 用戶 UUID；失敗返回 null
async function getOrCreateAuthUser(SUPABASE_URL, headers, email, phone, name) {
    const password = 'Temp' + Date.now() + '!' + Math.random().toString(36).slice(2, 10);
    const body = {
        password,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { full_name: name },
    };
    if (email) body.email = email;
    else if (phone) body.phone = phone;

    const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
    const data = await resp.json();

    if (resp.ok && data && data.id) return data.id;

    // email 已註冊：按 email 反查既有 auth 用戶
    if (email) {
        const q = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?filter=email.eq.${encodeURIComponent(email)}`, { headers });
        const qj = await q.json();
        const users = qj && (qj.users || qj);
        if (Array.isArray(users) && users.length > 0) return users[0].id;
    }
    return null;
}

async function ensureMember(SUPABASE_URL, headers, record) {
    const name = normalizeText(record.name);
    const phone = normalizeText(record.phone);
    const email = normalizeEmail(record.email);
    const orderCode = normalizeText(record.orderCode);
    const userId = normalizeText(record.userId);
    const source = normalizeText(record.source) || '訂單收錄';
    const shippingAddress = normalizeText(record.shipping_address);
    const billingAddress = normalizeText(record.billing_address);
    const address = normalizeText(record.address);
    const tags = normalizeText(record.tags);
    const language = normalizeLang(record.language);
    const emailSub = normalizeSub(record.email_subscription);
    const smsSub = normalizeSub(record.sms_subscription);

    // 沒有任何聯絡方式，無法建檔
    if (!email && !phone) return { action: 'skipped', reason: 'no_contact' };

    // 1. 註冊場景已知 auth uid：優先按 id 直查；否則按 email，再按 phone 查既有會員
    let existing = null;
    if (userId) {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*&id=eq.${encodeURIComponent(userId)}&limit=1`, { headers });
        const j = await r.json();
        if (Array.isArray(j) && j.length > 0) existing = j[0];
    }
    if (!existing && email) {
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
        fillIfBlank(patch, existing, 'full_name', name);
        fillIfBlank(patch, existing, 'phone', phone);
        fillIfBlank(patch, existing, 'email', email);
        fillIfBlank(patch, existing, 'shipping_address', shippingAddress);
        fillIfBlank(patch, existing, 'billing_address', billingAddress);
        fillIfBlank(patch, existing, 'address', address);
        fillIfBlank(patch, existing, 'tags', tags);
        fillIfBlank(patch, existing, 'language', language);
        fillIfBlank(patch, existing, 'email_subscription', emailSub);
        fillIfBlank(patch, existing, 'sms_subscription', smsSub);

        await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${existing.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(patch),
        });
        return { action: 'updated', id: existing.id };
    }

    // 2. 註冊場景已有 auth uid 直接沿用；訂單場景再按需在 auth 建立對應用戶（不發送重置郵件）
    const authId = userId || await getOrCreateAuthUser(SUPABASE_URL, headers, email, phone, name);
    if (!authId) return { action: 'skipped', reason: 'auth_user_unavailable' };

    // 觸發器通常會為新 auth 用戶自動建一條空 profile；先回查，存在則補全，不存在才新增
    const existingR = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*&id=eq.${authId}&limit=1`, { headers });
    const existingJ = await existingR.json();
    const existingProfile = Array.isArray(existingJ) && existingJ.length > 0 ? existingJ[0] : null;

    if (existingProfile) {
        const patch = { last_active: new Date().toISOString() };
        fillIfBlank(patch, existingProfile, 'full_name', name);
        fillIfBlank(patch, existingProfile, 'phone', phone);
        fillIfBlank(patch, existingProfile, 'email', email);
        fillIfBlank(patch, existingProfile, 'shipping_address', shippingAddress);
        fillIfBlank(patch, existingProfile, 'billing_address', billingAddress);
        fillIfBlank(patch, existingProfile, 'address', address);
        fillIfBlank(patch, existingProfile, 'tags', tags);
        fillIfBlank(patch, existingProfile, 'language', language);
        fillIfBlank(patch, existingProfile, 'email_subscription', emailSub);
        fillIfBlank(patch, existingProfile, 'sms_subscription', smsSub);
        if (!existingProfile.source) patch.source = source;
        await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${authId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(patch),
        });
        return { action: 'updated', id: authId, orderCode };
    }

    const payload = {
        id: authId,
        full_name: name,
        email: email,
        phone: phone,
        member_status: 'active',
        source: source,
        last_active: new Date().toISOString(),
        created_at: new Date().toISOString(),
    };
    if (shippingAddress) payload.shipping_address = shippingAddress;
    if (billingAddress) payload.billing_address = billingAddress;
    if (address) payload.address = address;
    if (tags) payload.tags = tags;
    if (language) payload.language = language;
    if (emailSub) payload.email_subscription = emailSub;
    if (smsSub) payload.sms_subscription = smsSub;

    const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify(payload),
    });

    if (!r.ok) {
        const errText = await r.text();
        throw new Error('建立會員失敗: ' + errText);
    }
    return { action: 'created', id: authId, orderCode };
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
