// 邮件附件读取：GET /email-attachment?id=<emailId>
// 优先读 R2（webhook 已把附件存为 email-attachments/{emailId}/{safeName}，永久）；
// R2 无记录时回退 Resend Received Emails Attachments API（download_url 为签名临时链接）。
export async function onRequestGet(context) {
  const request = context.request;
  const env = context.env;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const emailId = (url.searchParams.get('id') || '').trim();
    if (!emailId) {
      return Response.json({ error: 'id required' }, { status: 400, headers: corsHeaders });
    }

    const attachments = [];

    // 1) 优先 R2：枚举 email-attachments/{emailId}/
    const prefix = 'email-attachments/' + emailId + '/';
    if (env.IMAGES) {
      let cursor;
      do {
        const listed = await env.IMAGES.list({ prefix, cursor });
        for (const obj of listed.objects || []) {
          const name = obj.key.substring(prefix.length);
          let contentType = 'application/octet-stream';
          let size = obj.size || 0;
          try {
            const head = await env.IMAGES.head(obj.key);
            if (head && head.httpMetadata && head.httpMetadata.contentType) {
              contentType = head.httpMetadata.contentType;
            }
          } catch (e) { /* head 失败不阻断 */ }
          attachments.push({
            filename: name,
            content_type: contentType,
            size,
            url: 'https://pub-aed48a8286cf45d29bfc6eeefeb882fd.r2.dev/' + obj.key
          });
        }
        cursor = listed.truncated ? listed.cursor : undefined;
      } while (cursor);
    }

    // 2) R2 无记录 → Resend Attachments API
    if (attachments.length === 0 && env.RESEND_API_KEY) {
      const attResp = await fetch('https://api.resend.com/emails/receiving/' + encodeURIComponent(emailId) + '/attachments', {
        headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY }
      });
      if (attResp.ok) {
        const attData = await attResp.json();
        for (const att of (attData && attData.data) || []) {
          attachments.push({
            filename: att.filename,
            content_type: att.content_type,
            size: att.size,
            url: att.download_url || ''
          });
        }
      }
    }

    return Response.json({ email_id: emailId, count: attachments.length, attachments }, {
      headers: corsHeaders
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}
