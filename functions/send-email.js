export async function onRequestPost(context) {
  const request = context.request;
  const env = context.env;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html, attachments } = await request.json();

    const payload = {
      from: 'RoyalSpl Florist <info@royalspl.xyz>',
      to: [to],
      subject: subject,
      html: html,
    };
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      payload.attachments = attachments.map((a) => ({
        filename: a.filename || 'order.pdf',
        content: a.content || '',
      }));
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}