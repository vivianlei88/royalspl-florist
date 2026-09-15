// Google Search Console 官方排名数据 Function
// 用法:
//   GET /gsc-rank?action=sites                         -> 列出服务账号可见的 Search Console 站点（验证授权）
//   GET /gsc-rank?action=query&keyword=香港花店         -> 查询该关键词最近28天真实官方数据
//   GET /gsc-rank?action=all                            -> 查询全部关键词数据
// 数据来源: relaxedmusicgirls@gmail.com 名下的 Search Console 资源（通过服务账号授权访问）
// 服务账号: 从 Supabase site_settings gcp_service_account 读取（与后台 getGCPAccessToken 同源）

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'sites';
  const keyword = url.searchParams.get('keyword') || '';

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = env.SUPABASE_URL || 'https://gefqlrmozxbgfhxgngtg.supabase.co';
  const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_Secret_keys || env.SUPABASE_ANON_KEY || '';

  try {
    // ===== 1. 读取服务账号（数据库 site_settings gcp_service_account）=====
    const saResp = await fetch(SUPABASE_URL + '/rest/v1/site_settings?select=setting_value&setting_key=eq.gcp_service_account', {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY
      }
    });
    const saRows = await saResp.json();
    if (!saRows || !saRows[0] || !saRows[0].setting_value) {
      return json({ error: '未找到 gcp_service_account 配置，请先在后台設置中保存 GCP 服務帳號 JSON' }, 500, corsHeaders);
    }
    const sa = JSON.parse(saRows[0].setting_value);

    // ===== 1.5 诊断模式（遍历所有证书，验证数据库私钥 + 完整 JWT→token 复现）=====
    if (action === 'diag') {
      try {
        const privateKeyPem2 = (sa.private_key || '').replace(/\\n/g, '\n');
        const pemBody2 = privateKeyPem2
          .replace('-----BEGIN PRIVATE KEY-----\n', '')
          .replace('\n-----END PRIVATE KEY-----', '')
          .replace(/\n/g, '');
        const bin2 = Uint8Array.from(atob(pemBody2), c => c.charCodeAt(0));
        const privKey2 = await crypto.subtle.importKey('pkcs8', bin2.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, true, ['sign']);

        // 从 GCP 官方 x509 端点拉取当前全部有效密钥证书
        const certResp = await fetch(sa.client_x509_cert_url);
        const certJson = await certResp.json();
        const certKeys = Object.keys(certJson);
        // 记录缓存头，判断 metadata 是否有缓存残留
        const certHeaders = {
          age: certResp.headers.get('age') || null,
          date: certResp.headers.get('date') || null,
          cacheControl: certResp.headers.get('cache-control') || null,
          expires: certResp.headers.get('expires') || null,
          lastModified: certResp.headers.get('last-modified') || null
        };

        // 签名固定测试消息
        const testMsg = new TextEncoder().encode('royalspl-gsc-diag-test');
        const signature2 = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privKey2, testMsg);

        // 遍历所有证书，找出与数据库私钥匹配的那把
        const certResults = {};
        for (const kid of certKeys) {
          const pemOne = certJson[kid];
          const bodyOne = pemOne.replace('-----BEGIN CERTIFICATE-----', '').replace('-----END CERTIFICATE-----', '').replace(/\n/g, '');
          const binOne = Uint8Array.from(atob(bodyOne), c => c.charCodeAt(0));
          const spkiOne = extractSPKI(binOne);
          const pubOne = await crypto.subtle.importKey('spki', spkiOne, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, true, ['verify']);
          const okOne = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', pubOne, signature2, testMsg);
          const fpOne = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', spkiOne))).map(b => b.toString(16).padStart(2, '0')).join('');
          certResults[kid] = { matches_db_private_key: okOne, spki_sha1: fpOne };
        }

        // 找出匹配的证书 key_id
        let matchingKid = null;
        for (const kid of certKeys) {
          if (certResults[kid].matches_db_private_key) { matchingKid = kid; break; }
        }
        const match = !!matchingKid;

        // 复现完整 token JWT 流程
        const now2 = Math.floor(Date.now() / 1000);
        const header2 = { alg: 'RS256', typ: 'JWT' };
        const claimSet2 = {
          iss: sa.client_email,
          scope: 'https://www.googleapis.com/auth/webmasters.readonly',
          aud: 'https://oauth2.googleapis.com/token',
          iat: now2,
          exp: now2 + 3600
        };
        function b64url2(str) {
          return btoa(unescape(encodeURIComponent(str)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        }
        const eh2 = b64url2(JSON.stringify(header2));
        const ec2 = b64url2(JSON.stringify(claimSet2));
        const si2 = eh2 + '.' + ec2;
        const sig2 = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privKey2, new TextEncoder().encode(si2));
        const jwtStr = si2 + '.' + b64url2(String.fromCharCode(...new Uint8Array(sig2)));

        // 用匹配的证书公钥验证 JWT 签名
        let jwtValid = false;
        if (matchingKid) {
          const pemMatch = certJson[matchingKid];
          const bodyMatch = pemMatch.replace('-----BEGIN CERTIFICATE-----', '').replace('-----END CERTIFICATE-----', '').replace(/\n/g, '');
          const binMatch = Uint8Array.from(atob(bodyMatch), c => c.charCodeAt(0));
          const spkiMatch = extractSPKI(binMatch);
          const pubMatch = await crypto.subtle.importKey('spki', spkiMatch, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, true, ['verify']);
          jwtValid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', pubMatch, sig2, new TextEncoder().encode(si2));
        }

        // ===== 用复现的 JWT 请求 token（真实测试）=====
        const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + encodeURIComponent(jwtStr)
        });
        const tokenData = await tokenResp.json();

        // ===== 附加诊断：iat 偏移测试（-60s / -300s / +300s），验证是否时钟偏差 =====
        const iatTests = {};
        for (const offset of [-60, -300, 300]) {
          const tt = Math.floor(Date.now() / 1000) + offset;
          const cs2 = { ...claimSet2, iat: tt, exp: tt + 3600 };
          const ec3 = b64url2(JSON.stringify(cs2));
          const si3 = eh2 + '.' + ec3;
          const sg3 = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privKey2, new TextEncoder().encode(si3));
          const jw3 = si3 + '.' + b64url2(String.fromCharCode(...new Uint8Array(sg3)));
          const r3 = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + encodeURIComponent(jw3)
          });
          const d3 = await r3.json();
          iatTests[offset] = { error: d3.error || null, error_description: d3.error_description || null, ok: !!d3.access_token };
        }

        return json({
          ok: true,
          client_email: sa.client_email,
          json_private_key_id: sa.private_key_id,
          cert_key_ids: certKeys,
          cert_headers: certHeaders,
          cert_results: certResults,
          matching_key_id: matchingKid,
          db_private_key_matches_gcp_cert: match,
          worker_time_iat: now2,
          jwt_signature_valid_with_gcp_cert: jwtValid,
          token_response: tokenData,
          iat_offset_tests: iatTests,
          jwt_preview: jwtStr.substring(0, 80) + '...'
        }, 200, corsHeaders);
      } catch (diagErr) {
        return json({ ok: false, diagError: diagErr.message }, 500, corsHeaders);
      }
    }

    // ===== 2. 用服务账号签发 JWT 换取 access token（scope: webmasters.readonly）=====
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claimSet = {
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    };

    function base64url(str) {
      return btoa(unescape(encodeURIComponent(str)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }

    const encodedHeader = base64url(JSON.stringify(header));
    const encodedClaimSet = base64url(JSON.stringify(claimSet));
    const signingInput = encodedHeader + '.' + encodedClaimSet;

    const privateKeyPem = (sa.private_key || '').replace(/\\n/g, '\n');
    const pemBody = privateKeyPem
      .replace('-----BEGIN PRIVATE KEY-----\n', '')
      .replace('\n-----END PRIVATE KEY-----', '')
      .replace(/\n/g, '');

    const binaryKey = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey.buffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(signingInput)
    );
    const encodedSignature = base64url(String.fromCharCode(...new Uint8Array(signature)));
    const jwt = signingInput + '.' + encodedSignature;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + encodeURIComponent(jwt)
    });
    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return json({ error: '獲取Google token失敗', detail: tokenData }, 500, corsHeaders);
    }
    const accessToken = tokenData.access_token;

    // ===== 3. 按 action 分发 =====
    if (action === 'sites') {
      // 列出服务账号可见的 Search Console 站点（验证授权是否完成）
      const sitesResp = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
        headers: { 'Authorization': 'Bearer ' + accessToken }
      });
      const sitesData = await sitesResp.json();
      const siteList = (sitesData.siteEntry || []).map(s => ({
        siteUrl: s.siteUrl,
        permissionLevel: s.permissionLevel
      }));
      return json({ ok: true, client_email: sa.client_email, sites: siteList }, 200, corsHeaders);
    }

    // 查询关键词真实数据
    const keywordList = action === 'all'
      ? ['香港花店', '香港鮮花配送', '網上花店', '生日花束 香港', '情人節花束', '母親節花束', '港島花店', 'Hong Kong florist', 'flower delivery Hong Kong', 'online florist HK', 'birthday bouquet Hong Kong', "Valentine's Day flowers HK", "Mother's Day bouquet HK", 'Hong Kong Island florist']
      : [keyword];

    if (keywordList.length === 0) {
      return json({ error: '缺少keyword参数' }, 400, corsHeaders);
    }

    // 先列出站点，选择正确的 siteUrl（优先 https://www.royalspl.shop/ 或 sc-domain:royalspl.shop）
    const sitesResp = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    const sitesData = await sitesResp.json();
    const entries = sitesData.siteEntry || [];
    if (entries.length === 0) {
      return json({ ok: false, error: '服务账号未授权任何 Search Console 資源。請用 relaxedmusicgirls@gmail.com 登入 search.google.com，在「設定 → 使用者和權限」添加服務帳號 ' + sa.client_email, needAuth: true }, 200, corsHeaders);
    }

    let siteUrl = '';
    const wwwEntry = entries.find(s => s.siteUrl.indexOf('https://www.royalspl.shop') === 0);
    const domainEntry = entries.find(s => s.siteUrl.indexOf('sc-domain:royalspl.shop') === 0);
    const firstEntry = entries[0];
    siteUrl = (wwwEntry || domainEntry || firstEntry).siteUrl;

    // ===== 4. 查询 Search Analytics（最近28天真实官方数据）=====
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 27);
    function fmtDate(d) {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    const results = [];
    for (let i = 0; i < keywordList.length; i++) {
      const kw = keywordList[i];
      const body = {
        startDate: fmtDate(startDate),
        endDate: fmtDate(endDate),
        dimensions: ['query'],
        dimensionFilterGroups: [{
          filters: [{
            dimension: 'query',
            operator: 'equals',
            expression: kw
          }]
        }],
        rowLimit: 1
      };

      const queryResp = await fetch(
        'https://www.googleapis.com/webmasters/v3/sites/' + encodeURIComponent(siteUrl) + '/searchAnalytics/query',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      );
      const queryData = await queryResp.json();

      if (queryData.error) {
        results.push({
          keyword: kw,
          found: false,
          error: queryData.error.message || '查詢失敗',
          source: 'gsc'
        });
        continue;
      }

      const rows = queryData.rows || [];
      if (rows.length > 0) {
        const row = rows[0];
        results.push({
          keyword: kw,
          found: true,
          position: Math.round(row.position * 100) / 100,       // 真实平均排名
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: Math.round((row.ctr || 0) * 10000) / 100,        // 百分比
          source: 'gsc',
          siteUrl: siteUrl
        });
      } else {
        results.push({
          keyword: kw,
          found: false,
          position: null,
          clicks: 0,
          impressions: 0,
          ctr: 0,
          source: 'gsc',
          note: '該關鍵詞最近28天無搜索展示數據'
        });
      }
    }

    return json({
      ok: true,
      client_email: sa.client_email,
      siteUrl: siteUrl,
      source: 'gsc',
      results: action === 'all' ? results : results[0]
    }, 200, corsHeaders);

  } catch (err) {
    return json({ error: err.message }, 500, corsHeaders);
  }
}

function json(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// 轻量 ASN.1 DER 解析：从 X.509 证书中提取 SubjectPublicKeyInfo
function extractSPKI(der) {
  function readTLV(buf, offset) {
    const tag = buf[offset];
    let len = buf[offset + 1];
    let lenBytes = 0;
    if (len & 0x80) {
      lenBytes = len & 0x7f;
      len = 0;
      for (let i = 0; i < lenBytes; i++) len = len * 256 + buf[offset + 2 + i];
    }
    const headerLen = 2 + lenBytes;
    return { tag, len, valueStart: offset + headerLen, total: headerLen + len };
  }

  let pos = 0;
  let outer = readTLV(der, pos);           // Certificate SEQUENCE
  pos = outer.valueStart;
  let tbs = readTLV(der, pos);             // TBSCertificate SEQUENCE
  pos = tbs.valueStart;
  const tbsEnd = pos + tbs.len;

  // version [0] EXPLICIT（可选，v3 证书通常存在）
  if (pos < tbsEnd && der[pos] === 0xa0) {
    const v = readTLV(der, pos);
    pos += v.total;
  }
  // serialNumber INTEGER
  pos += readTLV(der, pos).total;
  // signature SEQUENCE
  pos += readTLV(der, pos).total;
  // issuer SEQUENCE
  pos += readTLV(der, pos).total;
  // validity SEQUENCE
  pos += readTLV(der, pos).total;
  // subject SEQUENCE
  pos += readTLV(der, pos).total;
  // subjectPublicKeyInfo SEQUENCE ← 目标
  if (pos >= tbsEnd) throw new Error('证书结构解析失败：未找到公钥');
  const spki = readTLV(der, pos);
  return der.slice(pos, pos + spki.total);
}
