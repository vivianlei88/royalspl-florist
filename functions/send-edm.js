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
    const { recipients, subject, html, from } = await request.json();
    
    if (!recipients || !recipients.length) {
      return new Response(JSON.stringify({ error: 'No recipients' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fromEmail = from || 'RoyalSpl Florist <info@royalspl.xyz>';
    const results = [];
    let successCount = 0;
    let failCount = 0;

    // 批量發送，每次最多50封
    const batchSize = 50;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + env.RESEND_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: batch,
          subject: subject,
          html: html,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        successCount += batch.length;
        results.push({ batch: i / batchSize + 1, success: true, id: result.id });
      } else {
        failCount += batch.length;
        results.push({ batch: i / batchSize + 1, success: false, error: result.message || result.error });
      }

      // 避免限流，每批之間等待1秒
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total: recipients.length,
      successCount: successCount,
      failCount: failCount,
      results: results
    }), {
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
